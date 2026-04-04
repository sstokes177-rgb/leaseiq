import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase'
import { processDocument, isAcceptedFileType } from '@/lib/pdfProcessor'
import { storeChunks } from '@/lib/vectorStore'
import { extractDisplayName } from '@/lib/extractDisplayName'
import { extractLeaseIdentifiers, checkMismatch } from '@/lib/validateDocument'
import { extractCriticalDates } from '@/lib/extractCriticalDates'
import { validateUploadedFile, verifyPDFHeader, sanitizeFileName as secureSanitize } from '@/lib/security'
import { isRateLimited } from '@/lib/rateLimit'
import { classifyDocument } from '@/lib/classifyDocument'

export const maxDuration = 120

export type FileResultStatus = 'success' | 'failed' | 'duplicate' | 'mismatch' | 'needs_confirmation'

export interface FileResult {
  file_name: string
  status: FileResultStatus
  error?: string
  warning?: string
  document?: { id: string; file_name: string; document_type: string; store_id: string | null }
  // mismatch fields
  detected?: { tenant_name: string | null; property_name: string | null }
  reference?: { tenant_name: string | null; property_name: string | null; display_name: string | null }
  // classification fields
  classification?: { description: string; document_type: string }
}

/** Sanitize filename: remove path separators and control characters, keep extension */
function sanitizeFilename(name: string): string {
  return name
    .replace(/[/\\:*?"<>|]/g, '_')   // Remove path separators and illegal chars
    .replace(/[\x00-\x1f\x7f]/g, '') // Remove control characters
    .replace(/\.{2,}/g, '.')          // Collapse consecutive dots
    .trim()
    .slice(0, 255)                    // Limit length
}

async function processSingleFile(
  file: File,
  userId: string,
  storeId: string | null,
  forceUpload: boolean,
  skipClassification: boolean,
  classificationTypeOverride: string | null,
  admin: ReturnType<typeof createAdminSupabaseClient>
): Promise<FileResult> {
  const fileName = sanitizeFilename(file.name)

  // ── Security validation ──
  const securityCheck = validateUploadedFile(file)
  if (!securityCheck.valid) {
    return { file_name: fileName, status: 'failed', error: securityCheck.error }
  }

  // ── Validate file type ──
  if (!isAcceptedFileType(file.type, fileName)) {
    return { file_name: fileName, status: 'failed', error: 'Unsupported file type. Please upload a PDF (.pdf) or Word document (.doc, .docx).' }
  }
  if (file.size > 20 * 1024 * 1024) {
    return { file_name: fileName, status: 'failed', error: 'File too large (max 20 MB).' }
  }

  // ── Duplicate check ──
  try {
    let dupQuery = admin
      .from('documents')
      .select('id')
      .eq('tenant_id', userId)
      .eq('file_name', fileName)

    if (storeId) {
      dupQuery = dupQuery.eq('store_id', storeId)
    } else {
      dupQuery = dupQuery.is('store_id', null)
    }

    const { data: existing } = await dupQuery.maybeSingle()
    if (existing) {
      return { file_name: fileName, status: 'duplicate' }
    }
  } catch {
    // Non-fatal — continue processing
  }

  const arrayBuffer = await file.arrayBuffer()

  // ── PDF magic bytes verification ──
  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  if (ext === 'pdf' && !verifyPDFHeader(arrayBuffer)) {
    return { file_name: fileName, status: 'failed', error: 'File is not a valid PDF document.' }
  }

  const buffer = Buffer.from(arrayBuffer)

  // ── Step 1: Extract text ──
  let chunks: Awaited<ReturnType<typeof processDocument>>
  try {
    chunks = await processDocument(buffer, fileName, file.type, fileName, 'base_lease')
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not extract text from document'
    return { file_name: fileName, status: 'failed', error: message }
  }

  const extractionText = chunks.slice(0, 4).map((c) => c.content).join('\n\n')

  // ── Step 1.5: Check for low extractable text ──
  const totalTextLength = chunks.reduce((sum, c) => sum + c.content.length, 0)
  const lowTextWarning = totalTextLength < 200
    ? 'Limited text could be extracted from this document. Some AI features may not work fully.'
    : undefined

  // ── Step 1.6: Document classification ──
  if (!skipClassification) {
    const classification = await classifyDocument(extractionText)

    if (classification.category === 'unrelated') {
      return {
        file_name: fileName,
        status: 'failed',
        error: 'This document does not appear to be related to commercial real estate. Only lease documents, amendments, exhibits, property guidelines, and other real estate documents can be uploaded.',
      }
    }

    if (classification.category === 'property_related') {
      return {
        file_name: fileName,
        status: 'needs_confirmation',
        classification: {
          description: classification.description,
          document_type: classification.document_type,
        },
      }
    }
  }

  // ── Step 2: Validate lease identity ──
  const identifiers = await extractLeaseIdentifiers(extractionText)
  if (!skipClassification && !identifiers.is_lease_related) {
    return { file_name: fileName, status: 'failed', error: 'This document does not appear to be a lease or lease-related document.' }
  }

  // ── Step 3: Mismatch check (skipped if forceUpload) ──
  if (!forceUpload) {
    let refQuery = admin
      .from('documents')
      .select('lease_identifiers, display_name')
      .eq('tenant_id', userId)
      .not('lease_identifiers', 'is', null)
      .order('uploaded_at', { ascending: true })
      .limit(1)

    if (storeId) refQuery = refQuery.eq('store_id', storeId)

    const { data: existingDocs } = await refQuery

    if (existingDocs && existingDocs.length > 0) {
      const ref = existingDocs[0]
      const validation = checkMismatch(
        identifiers,
        ref.lease_identifiers as import('@/lib/validateDocument').LeaseIdentifiers,
        ref.display_name
      )
      if (!validation.valid) {
        const refIdentifiers = ref.lease_identifiers as import('@/lib/validateDocument').LeaseIdentifiers
        return {
          file_name: fileName,
          status: 'mismatch',
          error: validation.error,
          detected: { tenant_name: identifiers.tenant_name, property_name: identifiers.property_name },
          reference: {
            tenant_name: refIdentifiers.tenant_name,
            property_name: refIdentifiers.property_name,
            display_name: ref.display_name,
          },
        }
      }
    }
  }

  // ── Step 4: Upload file to storage ──
  const safeStoreName = secureSanitize(fileName)
  const filePath = `${userId}/${crypto.randomUUID()}/${safeStoreName}`
  const contentType = file.type || 'application/octet-stream'

  const { error: storageError } = await admin.storage
    .from('leases')
    .upload(filePath, buffer, { contentType, upsert: false })

  if (storageError) {
    console.error('[Upload] Storage error:', storageError.message)
    return { file_name: fileName, status: 'failed', error: 'Failed to upload file to storage' }
  }

  // ── Step 5: Create document record ──
  const { data: document, error: docError } = await admin
    .from('documents')
    .insert({
      tenant_id: userId,
      store_id: storeId,
      file_name: fileName,
      file_path: filePath,
      document_type: classificationTypeOverride || identifiers.document_type,
      lease_identifiers: identifiers,
    })
    .select()
    .single()

  if (docError || !document) {
    await admin.storage.from('leases').remove([filePath])
    console.error('[Upload] Database error:', docError?.message)
    return { file_name: fileName, status: 'failed', error: 'Failed to save document record' }
  }

  // ── Step 6: Store chunks ──
  try {
    await storeChunks(chunks, document.id, userId, storeId)
  } catch (err) {
    await admin.from('documents').delete().eq('id', document.id)
    await admin.storage.from('leases').remove([filePath])
    const message = err instanceof Error ? err.message : 'Processing failed'
    return { file_name: fileName, status: 'failed', error: message }
  }

  // ── Step 7: Non-blocking post-processing ──
  const allText = chunks.map((c) => c.content).join('\n\n')

  extractDisplayName(extractionText)
    .then((displayName) => {
      if (displayName) admin.from('documents').update({ display_name: displayName }).eq('id', document.id)
    })
    .catch(() => null)

  extractCriticalDates(allText)
    .then(async (dates) => {
      if (dates.length === 0) return
      await admin.from('critical_dates').insert(
        dates.map((d) => ({
          document_id: document.id,
          tenant_id: userId,
          store_id: storeId,
          date_type: d.date_type,
          date_value: d.date_value,
          description: d.description,
          alert_days_before: d.alert_days_before,
        }))
      )
    })
    .catch(() => null)

  return {
    file_name: fileName,
    status: 'success',
    warning: lowTextWarning,
    document: { id: document.id, file_name: fileName, document_type: classificationTypeOverride || identifiers.document_type, store_id: storeId },
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (isRateLimited(user.id, 'upload')) {
    return NextResponse.json({ error: 'Too many requests. Please wait a moment before trying again.' }, { status: 429 })
  }

  const formData = await request.formData()
  const files = formData.getAll('file') as File[]
  const storeId = (formData.get('store_id') as string) || null
  const forceUpload = formData.get('force_upload') === 'true'
  const skipClassification = formData.get('skip_classification') === 'true'
  const classificationTypeOverride = (formData.get('classification_type') as string) || null

  if (!files || files.length === 0) {
    return NextResponse.json({ error: 'No files provided' }, { status: 400 })
  }

  const admin = createAdminSupabaseClient()
  const results: FileResult[] = []

  for (const file of files) {
    const result = await processSingleFile(file, user.id, storeId, forceUpload, skipClassification, classificationTypeOverride, admin)
    results.push(result)
  }

  return NextResponse.json({ results })
}
