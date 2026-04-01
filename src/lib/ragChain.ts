import { retrieveRelevantChunks, buildContextFromChunks, type RetrievedChunk } from './vectorStore'
import { buildLeasePrompt } from './prompts'
import type { Citation } from '@/types'

export interface RAGResult {
  systemPrompt: string
  citations: Citation[]
  hasContext: boolean
}

// ── Topic expansion ───────────────────────────────────────────────────────────
// When a question is situational/emotional, the vector similarity may be low
// even though relevant chunks exist. We detect the underlying topic and run
// a targeted second search to surface those chunks.

// Maps a canonical search phrase to trigger words found in the user's message
const TOPIC_TRIGGERS: Array<{ query: string; triggers: string[] }> = [
  { query: 'parking spaces assignment',          triggers: ['parking', 'park', 'ticket', 'spot', 'stall', 'vehicle'] },
  { query: 'HVAC heating cooling maintenance',   triggers: ['hvac', 'ac', 'air condition', 'heat', 'cooling', 'furnace', 'temperature', 'hot', 'cold', 'broke', 'broken'] },
  { query: 'repairs and maintenance obligations', triggers: ['repair', 'broken', 'fix', 'maintenance', 'damage', 'leak', 'flood', 'pest', 'mold'] },
  { query: 'rent payment late fees',             triggers: ['rent', 'pay', 'payment', 'late', 'overdue', 'delinquent', 'charge', 'fee'] },
  { query: 'signage and advertising',            triggers: ['sign', 'signage', 'banner', 'display', 'advertis', 'logo', 'window'] },
  { query: 'sublease assignment transfer',       triggers: ['sublease', 'sublet', 'assign', 'transfer', 'sell the business'] },
  { query: 'insurance liability coverage',       triggers: ['insurance', 'insur', 'liable', 'liability', 'coverage', 'claim', 'sued'] },
  { query: 'CAM common area maintenance charges',triggers: ['cam', 'common area', 'operating expense', 'nnn', 'triple net', 'reconcil', 'pass-through'] },
  { query: 'lease termination early exit',       triggers: ['terminat', 'cancel', 'break the lease', 'early exit', 'close', 'closing', 'shut down', 'get out'] },
  { query: 'lease renewal options',              triggers: ['renew', 'renewal', 'option', 'extend', 'extension', 'expire'] },
  { query: 'utilities electricity water',        triggers: ['utilities', 'electric', 'water', 'gas', 'utility', 'bill', 'meter'] },
  { query: 'hours of operation business hours',  triggers: ['hours', 'operating hours', 'business hours', 'open', 'close', 'schedule'] },
  { query: 'alterations improvements construction', triggers: ['alterations', 'improvement', 'construction', 'build out', 'remodel', 'renovate', 'demo'] },
  { query: 'security deposit',                   triggers: ['deposit', 'security deposit'] },
  { query: 'default remedies cure period',       triggers: ['default', 'evict', 'remedy', 'cure', 'breach', 'violation', 'kicked out'] },
  { query: 'permitted use restrictions',         triggers: ['permitted use', 'can i sell', 'allowed to', 'prohibited', 'exclusive', 'restrict'] },
  { query: 'holdover tenancy',                   triggers: ['holdover', 'stay over', 'month to month', 'expired lease'] },
]

function extractTopicQuery(text: string): string | null {
  const lower = text.toLowerCase()
  for (const { query, triggers } of TOPIC_TRIGGERS) {
    if (triggers.some((t) => lower.includes(t))) {
      return query
    }
  }
  return null
}

function deduplicateChunks(primary: RetrievedChunk[], secondary: RetrievedChunk[]): RetrievedChunk[] {
  const seen = new Set(primary.map((c) => c.id))
  const merged = [...primary]
  for (const chunk of secondary) {
    if (!seen.has(chunk.id)) {
      seen.add(chunk.id)
      merged.push(chunk)
    }
  }
  // Sort by similarity descending so best matches are first
  return merged.sort((a, b) => b.similarity - a.similarity)
}

// ── Main RAG pipeline ─────────────────────────────────────────────────────────

export async function buildRAGContext(
  question: string,
  tenantId: string,
  storeId?: string | null
): Promise<RAGResult> {
  // Primary search — use the full question text
  let chunks = await retrieveRelevantChunks(question, tenantId, 8, storeId)

  // If store-scoped returns nothing, fall back to tenant-wide
  if (chunks.length === 0 && storeId != null) {
    console.log('[RAG] Store-scoped search returned 0 chunks — falling back to tenant-wide search')
    chunks = await retrieveRelevantChunks(question, tenantId, 8, null)
  }

  // If results are sparse (< 3), run a second search using extracted topic keywords.
  // This catches situational/emotional questions whose vector similarity is low
  // even though directly relevant chunks exist.
  if (chunks.length < 3) {
    const topicQuery = extractTopicQuery(question)
    if (topicQuery) {
      console.log(`[RAG] Sparse results (${chunks.length}) — running topic expansion search: "${topicQuery}"`)
      const topicChunks = await retrieveRelevantChunks(topicQuery, tenantId, 8, storeId ?? null)

      // If topic search also got 0 with store scope, try tenant-wide for it too
      const finalTopicChunks =
        topicChunks.length === 0 && storeId != null
          ? await retrieveRelevantChunks(topicQuery, tenantId, 8, null)
          : topicChunks

      if (finalTopicChunks.length > 0) {
        console.log(`[RAG] Topic expansion found ${finalTopicChunks.length} additional chunks`)
        chunks = deduplicateChunks(chunks, finalTopicChunks)
        console.log(`[RAG] Combined total: ${chunks.length} chunks after deduplication`)
      }
    }
  }

  if (chunks.length === 0) {
    return {
      systemPrompt: buildLeasePrompt(
        'No relevant lease sections were found for this question. ' +
          'Inform the tenant that you could not find relevant sections in their uploaded lease documents, ' +
          'and ask them to verify their documents have been uploaded.'
      ),
      citations: [],
      hasContext: false,
    }
  }

  const { contextText, citations } = buildContextFromChunks(chunks)

  return {
    systemPrompt: buildLeasePrompt(contextText),
    citations,
    hasContext: true,
  }
}
