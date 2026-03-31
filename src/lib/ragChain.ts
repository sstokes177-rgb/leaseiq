import { retrieveRelevantChunks, buildContextFromChunks } from './vectorStore'
import { buildLeasePrompt } from './prompts'
import type { Citation } from '@/types'

export interface RAGResult {
  systemPrompt: string
  citations: Citation[]
  hasContext: boolean
}

export async function buildRAGContext(
  question: string,
  tenantId: string,
  storeId?: string | null
): Promise<RAGResult> {
  let chunks = await retrieveRelevantChunks(question, tenantId, 8, storeId)

  // If store-scoped search returns nothing, fall back to tenant-wide search.
  // This handles the transition period where existing chunks have store_id = NULL
  // (uploaded before store_id was added to the schema).
  if (chunks.length === 0 && storeId != null) {
    console.log('[RAG] Store-scoped search returned 0 chunks — falling back to tenant-wide search')
    chunks = await retrieveRelevantChunks(question, tenantId, 8, null)
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
