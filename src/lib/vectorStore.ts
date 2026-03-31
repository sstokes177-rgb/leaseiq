import { createAdminSupabaseClient } from './supabase'
import { embedText, embedBatch } from './embeddings'
import type { ChunkMetadata, Citation } from '@/types'

interface ChunkToStore {
  content: string
  metadata: ChunkMetadata
}

export async function storeChunks(
  chunks: ChunkToStore[],
  documentId: string,
  tenantId: string,
  storeId?: string | null
): Promise<void> {
  const supabase = createAdminSupabaseClient()
  const texts = chunks.map((c) => c.content)
  const embeddings = await embedBatch(texts)

  const rows = chunks.map((chunk, i) => ({
    document_id: documentId,
    tenant_id: tenantId,
    store_id: storeId ?? null,
    content: chunk.content,
    metadata: chunk.metadata,
    embedding: JSON.stringify(embeddings[i]),
  }))

  const { error } = await supabase.from('document_chunks').insert(rows)
  if (error) throw new Error(`Failed to store chunks: ${error.message}`)
}

export interface RetrievedChunk {
  id: string
  content: string
  metadata: ChunkMetadata
  document_id: string
  similarity: number
}

const MATCH_THRESHOLD = 0.20

export async function retrieveRelevantChunks(
  question: string,
  tenantId: string,
  matchCount = 8,
  storeId?: string | null
): Promise<RetrievedChunk[]> {
  const supabase = createAdminSupabaseClient()

  console.log(`[RAG] Question received: "${question.slice(0, 100)}"`)
  console.log(`[RAG] Store ID: ${storeId ?? 'null'} | Tenant ID: ${tenantId}`)

  const queryEmbedding = await embedText(question)
  console.log(`[RAG] Embedding generated: ${queryEmbedding.length} dimensions`)

  const embStr = `[${queryEmbedding.join(',')}]`

  console.log(`[RAG] Calling match_documents — store_id=${storeId ?? 'null'}, threshold=${MATCH_THRESHOLD}, count=${matchCount}`)

  const { data, error } = await supabase.rpc('match_documents', {
    query_embedding: embStr,
    p_tenant_id: tenantId,
    p_store_id: storeId ?? null,
    match_threshold: MATCH_THRESHOLD,
    match_count: matchCount,
  })

  if (error) {
    console.error('[RAG] RPC error:', error.message, error)
    throw new Error(`Vector search failed: ${error.message}`)
  }

  const chunks = (data as RetrievedChunk[]) ?? []
  const topScore = chunks.length > 0 ? chunks[0].similarity.toFixed(4) : 'n/a'
  console.log(`[RAG] Match results: ${chunks.length} chunks found, top score: ${topScore} (store-scoped: ${storeId != null})`)

  // Sort so amendments appear before base lease — amendments take precedence
  const docTypePriority: Record<string, number> = {
    amendment: 0,
    side_letter: 1,
    commencement_letter: 2,
    exhibit: 3,
    base_lease: 4,
  }
  return chunks.sort((a, b) => {
    const pa = docTypePriority[a.metadata?.document_type ?? ''] ?? 5
    const pb = docTypePriority[b.metadata?.document_type ?? ''] ?? 5
    return pa - pb
  })
}

/** Human-readable label for a document type shown in context and citations. */
function docTypeLabel(docType: string): string {
  const labels: Record<string, string> = {
    base_lease: 'BASE LEASE',
    amendment: 'AMENDMENT',
    commencement_letter: 'COMMENCEMENT LETTER',
    exhibit: 'EXHIBIT',
    side_letter: 'SIDE LETTER',
  }
  return labels[docType] ?? docType.toUpperCase().replace('_', ' ')
}

export function buildContextFromChunks(chunks: RetrievedChunk[]): {
  contextText: string
  citations: Citation[]
} {
  const citations: Citation[] = []
  const contextParts: string[] = []

  for (const chunk of chunks) {
    const meta = chunk.metadata as ChunkMetadata
    const typeTag = docTypeLabel(meta.document_type)

    const label = [
      `[${typeTag}]`,
      meta.section_heading && `Section: ${meta.section_heading}`,
      meta.page_number && `Page ${meta.page_number}`,
      `(${meta.document_name})`,
    ]
      .filter(Boolean)
      .join(' | ')

    contextParts.push(`[${label}]\n${chunk.content}`)

    citations.push({
      chunk_id: chunk.id,
      document_name: meta.document_name,
      document_type: meta.document_type,
      section_heading: meta.section_heading,
      page_number: meta.page_number,
      excerpt: chunk.content.slice(0, 200) + (chunk.content.length > 200 ? '…' : ''),
    })
  }

  return {
    contextText: contextParts.join('\n\n---\n\n'),
    citations,
  }
}
