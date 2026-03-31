import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase'
import { processDocument, isAcceptedFileType } from '@/lib/pdfProcessor'
import { storeChunks } from '@/lib/vectorStore'
import { extractDisplayName } from '@/lib/extractDisplayName'
import { extractLeaseIdentifiers, checkMismatch } from '@/lib/validateDocument'
import { extractCriticalDates } from '@/lib/extractCriticalDates'

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  // document_type is now auto-detected from content; the form field is ignored
  const storeId = (formData.get('store_id') as string) || null
  const forceUpload = formData.get('force_upload') === 'true'

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  if (!isAcceptedFileType(file.type, file.name)) {
    return NextResponse.json(
      { error: 'Unsupported file type. Please upload a PDF (.pdf) or Word document (.doc, .docx).' },
      { status: 400 }
    )
  }

  if (file.size > 20 * 1024 * 1024) {
    return NextResponse.json({ error: 'File too large (max 20MB)' }, { status: 400 })
  }

  const admin = createAdminSupabaseClient()
  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  // ── Step 1: Extract text ──
  let chunks: Awaited<ReturnType<typeof processDocument>>
  try {
    // Use 'base_lease' as placeholder; the real type is set after AI detection below
    chunks = await processDocument(buffer, file.name, file.type, file.name, 'base_lease')
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not extract text from document'
    return NextResponse.json({ error: message }, { status: 422 })
  }

  const extractionText = chunks.slice(0, 4).map((c) => c.content).join('\n\n')

  // ── Step 2: Validate document is lease-related and matches store docs ──
  const identifiers = await extractLeaseIdentifiers(extractionText)

  if (!identifiers.is_lease_related) {
    return NextResponse.json(
      { error: 'This document does not appear to be a lease, amendment, or lease-related document. Please upload a lease document.' },
      { status: 422 }
    )
  }

  if (!forceUpload) {
    // Fetch reference document for this specific store (if store_id provided), else tenant-wide
    let refQuery = admin
      .from('documents')
      .select('lease_identifiers, display_name')
      .eq('tenant_id', user.id)
      .not('lease_identifiers', 'is', null)
      .order('uploaded_at', { ascending: true })
      .limit(1)

    if (storeId) {
      refQuery = refQuery.eq('store_id', storeId)
    }

    const { data: existingDocs } = await refQuery

    if (existingDocs && existingDocs.length > 0) {
      const ref = existingDocs[0]
      const validation = checkMismatch(
        identifiers,
        ref.lease_identifiers as import('@/lib/validateDocument').LeaseIdentifiers,
        ref.display_name
      )
      if (!validation.valid) {
        // Return structured mismatch info so the client can show a smart UI
        const refIdentifiers = ref.lease_identifiers as import('@/lib/validateDocument').LeaseIdentifiers
        return NextResponse.json(
          {
            error: validation.error,
            errorCode: 'mismatch',
            detected: {
              tenant_name: identifiers.tenant_name,
              property_name: identifiers.property_name,
            },
            reference: {
              tenant_name: refIdentifiers.tenant_name,
              property_name: refIdentifiers.property_name,
              display_name: ref.display_name,
            },
          },
          { status: 422 }
        )
      }
    }
  }

  // ── Step 3: Upload file to storage ──
  const filePath = `${user.id}/${Date.now()}_${file.name}`
  const contentType = file.type || 'application/octet-stream'

  const { error: storageError } = await admin.storage
    .from('leases')
    .upload(filePath, buffer, { contentType, upsert: false })

  if (storageError) {
    return NextResponse.json({ error: `Storage error: ${storageError.message}` }, { status: 500 })
  }

  // ── Step 4: Create document record ──
  const { data: document, error: docError } = await admin
    .from('documents')
    .insert({
      tenant_id: user.id,
      store_id: storeId,
      file_name: file.name,
      file_path: filePath,
      document_type: identifiers.document_type,
      lease_identifiers: identifiers,
    })
    .select()
    .single()

  if (docError || !document) {
    await admin.storage.from('leases').remove([filePath])
    return NextResponse.json({ error: `Database error: ${docError?.message}` }, { status: 500 })
  }

  // ── Step 5: Store chunks ──
  try {
    await storeChunks(chunks, document.id, user.id, storeId)
  } catch (err) {
    await admin.from('documents').delete().eq('id', document.id)
    await admin.storage.from('leases').remove([filePath])
    const message = err instanceof Error ? err.message : 'Processing failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }

  // ── Step 6: Non-blocking post-processing ──
  const allText = chunks.map((c) => c.content).join('\n\n')

  extractDisplayName(extractionText)
    .then((displayName) => {
      if (displayName) {
        admin.from('documents').update({ display_name: displayName }).eq('id', document.id)
      }
    })
    .catch(() => null)

  extractCriticalDates(allText)
    .then(async (dates) => {
      if (dates.length === 0) return
      await admin.from('critical_dates').insert(
        dates.map((d) => ({
          document_id: document.id,
          tenant_id: user.id,
          store_id: storeId,
          date_type: d.date_type,
          date_value: d.date_value,
          description: d.description,
          alert_days_before: d.alert_days_before,
        }))
      )
    })
    .catch(() => null)

  return NextResponse.json({
    success: true,
    document: { id: document.id, file_name: file.name, document_type: identifiers.document_type, store_id: storeId },
  })
}
