import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase'
import { processDocument, getMimeTypeFromFilename } from '@/lib/pdfProcessor'
import { storeChunks } from '@/lib/vectorStore'

// Large documents can take 30-60s to re-embed — extend function timeout
export const maxDuration = 120

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const documentId = body?.document_id as string | undefined

  if (!documentId) {
    return NextResponse.json({ error: 'document_id required' }, { status: 400 })
  }

  const admin = createAdminSupabaseClient()

  // Verify document belongs to this user and get file info
  const { data: doc, error: docErr } = await admin
    .from('documents')
    .select('id, file_path, file_name, document_type, store_id')
    .eq('id', documentId)
    .eq('tenant_id', user.id)
    .single()

  if (docErr || !doc) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 })
  }

  // Download original file from storage
  const { data: fileData, error: downloadErr } = await admin.storage
    .from('leases')
    .download(doc.file_path)

  if (downloadErr || !fileData) {
    console.error('[Reprocess] File download failed:', downloadErr?.message)
    return NextResponse.json(
      { error: 'Could not download file from storage' },
      { status: 500 }
    )
  }

  const buffer = Buffer.from(await fileData.arrayBuffer())
  const mimeType = getMimeTypeFromFilename(doc.file_name)

  // Re-extract and re-chunk with updated settings
  let chunks: Awaited<ReturnType<typeof processDocument>>
  try {
    chunks = await processDocument(buffer, doc.file_name, mimeType, doc.file_name, doc.document_type)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not extract text from document'
    return NextResponse.json({ error: message }, { status: 422 })
  }

  // Delete old chunks
  const { error: deleteErr } = await admin
    .from('document_chunks')
    .delete()
    .eq('document_id', documentId)

  if (deleteErr) {
    console.error('[Reprocess] Failed to delete old chunks:', deleteErr.message)
    return NextResponse.json(
      { error: 'Failed to delete old chunks' },
      { status: 500 }
    )
  }

  // Store new chunks (re-embeds everything)
  try {
    await storeChunks(chunks, documentId, user.id, doc.store_id)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to store new chunks'
    return NextResponse.json({ error: message }, { status: 500 })
  }

  return NextResponse.json({ success: true, chunk_count: chunks.length })
}
