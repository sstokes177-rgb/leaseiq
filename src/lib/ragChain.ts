import { retrieveRelevantChunks, keywordSearchChunks, buildContextFromChunks, type RetrievedChunk } from './vectorStore'
import { buildLeasePrompt } from './prompts'
import type { Citation } from '@/types'

export interface RAGResult {
  systemPrompt: string
  citations: Citation[]
  hasContext: boolean
}

// ── Topic expansion (vector) ──────────────────────────────────────────────────
// When a question is situational/emotional, the vector similarity may be low
// even though relevant chunks exist. We detect the underlying topic and run
// a targeted second VECTOR search to surface those chunks.

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

// ── Keyword (ILIKE) search terms ──────────────────────────────────────────────
// Maps topic triggers to lease terminology stems. The stems are passed to
// keyword_search_documents for full-text ILIKE matching, catching chunks that
// vector similarity may miss (e.g. "Assignment and Subletting" section when
// the question says "can I sublease?").

const KEYWORD_MAP: Array<{ triggers: string[]; searchTerms: string[] }> = [
  {
    triggers: ['sublease', 'sublet', 'rent out my space', 'rent out the space', 'sell my business', 'sell the business', 'transfer my lease', 'assign'],
    searchTerms: ['subleas', 'sublet', 'assignment'],
  },
  {
    triggers: ['hvac', 'air condition', 'heating', 'cooling', 'furnace', 'ventilat', 'temperature'],
    searchTerms: ['hvac', 'air condition', 'ventilat'],
  },
  {
    triggers: ['repair', 'broken', 'fix', 'maintenance', 'damage', 'leak', 'flood', 'pest', 'mold', 'maintain'],
    searchTerms: ['repair', 'maintain', 'condition', 'restore'],
  },
  {
    triggers: ['rent', 'base rent', 'monthly payment', 'how much do i pay', 'payment', 'late fee', 'overdue'],
    searchTerms: ['base rent', 'additional rent', 'late charge'],
  },
  {
    triggers: ['sign', 'signage', 'banner', 'advertis', 'logo', 'facade', 'storefront'],
    searchTerms: ['sign', 'banner', 'facade'],
  },
  {
    triggers: ['cam', 'common area', 'operating expense', 'nnn', 'triple net', 'pass-through', 'reconcil'],
    searchTerms: ['common area', 'operating expense', 'pass-through'],
  },
  {
    triggers: ['insurance', 'insur', 'liability', 'coverage', 'claim', 'sued'],
    searchTerms: ['insurance', 'liability', 'coverage'],
  },
  {
    triggers: ['terminat', 'cancel', 'break the lease', 'early exit', 'get out', 'close the store', 'shut down', 'closing'],
    searchTerms: ['terminat', 'surrender', 'cancel'],
  },
  {
    triggers: ['renew', 'renewal', 'extend', 'extension', 'option to renew', 'expire'],
    searchTerms: ['renewal', 'option', 'extend'],
  },
  {
    triggers: ['default', 'evict', 'breach', 'violation', 'cure period', 'kicked out'],
    searchTerms: ['default', 'breach', 'remedy', 'cure'],
  },
  {
    triggers: ['alteration', 'improvement', 'remodel', 'renovate', 'build out', 'construction', 'demo'],
    searchTerms: ['alteration', 'improvement', 'modif'],
  },
  {
    triggers: ['parking', 'park', 'vehicle', 'garage', 'spot', 'stall'],
    searchTerms: ['parking', 'vehicle'],
  },
  {
    triggers: ['deposit', 'security deposit'],
    searchTerms: ['security deposit', 'deposit'],
  },
  {
    triggers: ['permitted use', 'exclusive', 'restrict', 'allowed to sell', 'can i sell', 'competitor'],
    searchTerms: ['permitted use', 'exclusive', 'restrict'],
  },
  {
    triggers: ['hours', 'operating hours', 'business hours', 'open', 'schedule'],
    searchTerms: ['hours of operation', 'business hours', 'operating hours'],
  },
  {
    triggers: ['holdover', 'month to month', 'expired lease', 'stay past'],
    searchTerms: ['holdover'],
  },
  {
    triggers: ['utilities', 'electric', 'water', 'gas', 'utility bill', 'meter'],
    searchTerms: ['utilities', 'electric', 'water'],
  },
]

/**
 * Extract keyword search terms from the user's question by matching
 * against known lease topic triggers. Returns up to 6 unique stems.
 */
function extractKeywords(text: string): string[] {
  const lower = text.toLowerCase()
  const terms = new Set<string>()

  for (const { triggers, searchTerms } of KEYWORD_MAP) {
    if (triggers.some((t) => lower.includes(t))) {
      searchTerms.forEach((t) => terms.add(t))
    }
  }

  return [...terms].slice(0, 6)
}

// ── Chunk deduplication ───────────────────────────────────────────────────────

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
  // ── Step 1: Primary vector search ────────────────────────────────────────────
  let chunks = await retrieveRelevantChunks(question, tenantId, 12, storeId)

  if (chunks.length === 0 && storeId != null) {
    console.log('[RAG] Store-scoped vector search returned 0 chunks — will NOT fall back to other stores')
  }

  // ── Step 2: Keyword (ILIKE) hybrid search — always runs ───────────────────
  // Catches chunks that vector similarity misses (e.g. "Assignment and
  // Subletting" section when question says "can I sublease my space?").
  const keywords = extractKeywords(question)

  if (keywords.length > 0) {
    console.log(`[RAG] Keyword search terms: ${keywords.join(', ')}`)

    // Run all keyword searches in parallel, scoped to the current store only
    const keywordResults = await Promise.all(
      keywords.map(async (kw) => {
        return keywordSearchChunks(kw, tenantId, 8, storeId ?? null)
      })
    )

    const allKeywordChunks = keywordResults.flat()
    if (allKeywordChunks.length > 0) {
      const before = chunks.length
      chunks = deduplicateChunks(chunks, allKeywordChunks)
      console.log(`[RAG] Keyword search added ${chunks.length - before} unique chunks (total: ${chunks.length})`)
    }
  }

  // ── Step 3: Topic expansion vector search (when results still sparse) ───────
  if (chunks.length < 3) {
    const topicQuery = extractTopicQuery(question)
    if (topicQuery) {
      console.log(`[RAG] Sparse results (${chunks.length}) — running topic expansion search: "${topicQuery}"`)
      const topicChunks = await retrieveRelevantChunks(topicQuery, tenantId, 12, storeId ?? null)

      if (topicChunks.length > 0) {
        console.log(`[RAG] Topic expansion found ${topicChunks.length} additional chunks`)
        chunks = deduplicateChunks(chunks, topicChunks)
        console.log(`[RAG] Combined total: ${chunks.length} chunks after deduplication`)
      }
    }
  }

  if (chunks.length === 0) {
    const scopeMsg = storeId
      ? 'No relevant lease sections were found in the documents for THIS specific location. ' +
        'Inform the tenant that you could not find relevant sections in the lease documents uploaded to this location, ' +
        'and suggest they check that the relevant documents have been uploaded to this specific location.'
      : 'No relevant lease sections were found for this question. ' +
        'Inform the tenant that you could not find relevant sections in their uploaded lease documents, ' +
        'and ask them to verify their documents have been uploaded.'
    return {
      systemPrompt: buildLeasePrompt(scopeMsg),
      citations: [],
      hasContext: false,
    }
  }

  // Cap at 16 chunks to stay within context budget
  const finalChunks = chunks.slice(0, 16)
  const { contextText, citations } = buildContextFromChunks(finalChunks)

  return {
    systemPrompt: buildLeasePrompt(contextText),
    citations,
    hasContext: true,
  }
}
