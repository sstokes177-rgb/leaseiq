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

const MATCH_THRESHOLD = 0.15

export async function retrieveRelevantChunks(
  question: string,
  tenantId: string,
  matchCount = 12,
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

/**
 * Keyword (ILIKE) search for a single term. Requires the keyword_search_documents
 * SQL function to be deployed. Fails silently (returns []) if the function doesn't
 * exist yet, so the system degrades gracefully before the migration is applied.
 */
export async function keywordSearchChunks(
  keyword: string,
  tenantId: string,
  matchCount = 8,
  storeId?: string | null
): Promise<RetrievedChunk[]> {
  if (!keyword.trim()) return []
  const supabase = createAdminSupabaseClient()

  try {
    const { data, error } = await supabase.rpc('keyword_search_documents', {
      search_query: keyword,
      p_tenant_id: tenantId,
      p_store_id: storeId ?? null,
      match_count: matchCount,
    })

    if (error) {
      console.warn(`[RAG] Keyword search error for "${keyword}":`, error.message)
      return []
    }

    const results = (data as RetrievedChunk[]) ?? []
    console.log(`[RAG] Keyword search "${keyword}": ${results.length} results`)
    return results
  } catch (err) {
    console.warn(`[RAG] Keyword search threw for "${keyword}":`, err)
    return []
  }
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

/**
 * Create a clean excerpt from chunk content: trims to complete words,
 * adds ellipses when content is trimmed at start/end.
 */
function cleanExcerpt(content: string, minLength = 300): string {
  const text = content.trim()
  if (text.length <= minLength) return text

  let raw = text.slice(0, minLength + 50) // grab a bit extra to find word boundary

  // Trim start: if the chunk begins mid-word (no capital, no sentence start), skip to next word
  const startsClean = /^[A-Z"(\d]/.test(raw) || /^[.!?]\s/.test(text.slice(0, 2))
  let prefix = ''
  if (!startsClean) {
    const firstSpace = raw.indexOf(' ')
    if (firstSpace > 0 && firstSpace < 30) {
      raw = raw.slice(firstSpace + 1)
      prefix = '...'
    }
  }

  // Trim end: find last complete word boundary
  let suffix = ''
  if (text.length > raw.length) {
    const lastSpace = raw.lastIndexOf(' ')
    if (lastSpace > minLength - 50) {
      raw = raw.slice(0, lastSpace)
    }
    suffix = '...'
  }

  return prefix + raw + suffix
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
      excerpt: cleanExcerpt(chunk.content, 300),
      content: chunk.content,
    })
  }

  return {
    contextText: contextParts.join('\n\n---\n\n'),
    citations,
  }
}
