import { generateText } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { createAdminSupabaseClient } from './supabase'
import { keywordSearchChunks } from './vectorStore'
import type { ObligationItem } from '@/types'

const OBLIGATION_KEYWORDS = [
  'tenant shall',
  'landlord shall',
  'responsible for',
  'maintenance',
  'repair',
  'hvac',
  'insurance',
  'structural',
]

const OBLIGATION_CATEGORIES = [
  'HVAC Maintenance',
  'HVAC Replacement',
  'Roof Repairs',
  'Roof Replacement',
  'Exterior Walls',
  'Interior Walls/Floors',
  'Plumbing',
  'Electrical',
  'Pest Control',
  'Janitorial/Cleaning',
  'Insurance (Property)',
  'Insurance (Liability)',
  'Parking Lot',
  'Signage',
  'Grease Trap',
  'Fire Suppression',
  'Glass/Windows',
  'Structural Repairs',
  'Landscaping',
  'Snow/Ice Removal',
  'Trash Removal',
  'Security System',
  'ADA Compliance',
]

export async function generateObligationMatrix(
  storeId: string,
  tenantId: string
): Promise<ObligationItem[] | null> {
  const admin = createAdminSupabaseClient()

  // Use keyword search to find maintenance/repair/obligation chunks
  const keywordResults = await Promise.all(
    OBLIGATION_KEYWORDS.map((kw) =>
      keywordSearchChunks(kw, tenantId, 6, storeId).catch(() => [] as Awaited<ReturnType<typeof keywordSearchChunks>>)
    )
  )

  // Deduplicate by chunk id
  const seen = new Set<string>()
  const chunks: { id: string; content: string }[] = []
  for (const batch of keywordResults) {
    for (const chunk of batch) {
      if (!seen.has(chunk.id)) {
        seen.add(chunk.id)
        chunks.push({ id: chunk.id, content: chunk.content })
      }
    }
  }

  // Fallback: if keyword search returns nothing (function not deployed yet),
  // fetch first 35 chunks and client-side filter for obligation language
  if (chunks.length === 0) {
    console.log('[Obligations] Keyword search returned 0 results — using DB fallback')
    const { data: rawChunks } = await admin
      .from('document_chunks')
      .select('id, content')
      .eq('tenant_id', tenantId)
      .eq('store_id', storeId)
      .limit(60)

    const relevant = (rawChunks ?? []).filter((c) =>
      /repair|maintain|responsible|tenant\s+shall|landlord\s+shall|insurance|hvac|structural|pest|janitorial/i.test(
        c.content
      )
    )
    chunks.push(...relevant.slice(0, 35))
  }

  if (chunks.length === 0) {
    console.warn('[Obligations] No relevant chunks found for store', storeId)
    return null
  }

  const contextText = chunks
    .slice(0, 35)
    .map((c) => c.content)
    .join('\n\n---\n\n')

  let obligations: ObligationItem[]
  try {
    const { text: result } = await generateText({
      model: anthropic('claude-haiku-4-5-20251001'),
      maxOutputTokens: 1200,
      messages: [
        {
          role: 'user',
          content: `You are a lease analysis specialist. From the following lease excerpts, create a responsibility matrix.

For each category below, determine who is responsible: Tenant, Landlord, Shared, or Not Addressed.
Cite the specific article/section if mentioned in the text. Keep "details" to one sentence.

Return ONLY valid JSON with no other text:
{
  "obligations": [
    { "category": "...", "responsible": "Tenant|Landlord|Shared|Not Addressed", "article": "Article X.X or null", "details": "one sentence" }
  ]
}

Categories to evaluate:
${OBLIGATION_CATEGORIES.join(', ')}

Lease excerpts:
${contextText.slice(0, 18000)}`,
        },
      ],
    })

    const parsed = JSON.parse(result.trim().replace(/^```json\s*|\s*```$/g, ''))
    obligations = parsed.obligations ?? []
  } catch (err) {
    console.error('[Obligations] Claude extraction failed:', err)
    return null
  }

  // Upsert
  try {
    const { data: existing } = await admin
      .from('obligation_matrices')
      .select('id')
      .eq('store_id', storeId)
      .eq('tenant_id', tenantId)
      .maybeSingle()

    if (existing) {
      await admin
        .from('obligation_matrices')
        .update({ matrix_data: { obligations }, updated_at: new Date().toISOString() })
        .eq('id', existing.id)
    } else {
      await admin.from('obligation_matrices').insert({
        store_id: storeId,
        tenant_id: tenantId,
        matrix_data: { obligations },
      })
    }
  } catch (err) {
    console.error('[Obligations] DB write failed:', err)
  }

  return obligations
}
