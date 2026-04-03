import { generateText } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { createAdminSupabaseClient } from './supabase'
import { parseAIJson } from './parseAIJson'
import type { LeaseSummaryData } from '@/types'

export async function generateLeaseSummary(
  storeId: string,
  tenantId: string
): Promise<(LeaseSummaryData & { asset_class?: string }) | null> {
  const admin = createAdminSupabaseClient()

  // Fetch opening chunks (first 40 by chunk_index) for general lease terms
  const { data: rawChunks, error } = await admin
    .from('document_chunks')
    .select('content, metadata')
    .eq('tenant_id', tenantId)
    .eq('store_id', storeId)
    .limit(40)

  if (error || !rawChunks || rawChunks.length === 0) {
    console.warn('[LeaseSummary] No chunks found for store', storeId)
    return null
  }

  // Sort by chunk_index ascending — opening pages have the key terms
  const openingChunks = [...rawChunks]
    .sort((a, b) => (a.metadata?.chunk_index ?? 0) - (b.metadata?.chunk_index ?? 0))
    .slice(0, 30)

  // Also fetch date-specific chunks: search for chunks containing date keywords
  // These may be buried deeper in the lease or in amendments/commencement letters
  const dateKeywords = ['term', 'expir', 'commence', 'year', 'month', 'period', 'terminat', 'renewal']
  const dateQuery = dateKeywords.map(k => `content.ilike.%${k}%`).join(',')

  const { data: dateChunks } = await admin
    .from('document_chunks')
    .select('content, metadata')
    .eq('tenant_id', tenantId)
    .eq('store_id', storeId)
    .or(dateQuery)
    .limit(20)

  // Merge and deduplicate chunks
  const seenContent = new Set(openingChunks.map(c => c.content.slice(0, 100)))
  const extraDateChunks = (dateChunks ?? []).filter(c => !seenContent.has(c.content.slice(0, 100)))

  const allChunks = [...openingChunks, ...extraDateChunks]
  const contextText = allChunks.map((c) => {
    const meta = c.metadata as { document_type?: string; document_name?: string; section_heading?: string }
    const tag = meta?.document_type ? `[${meta.document_type.toUpperCase().replace('_', ' ')}]` : ''
    const heading = meta?.section_heading ? ` — ${meta.section_heading}` : ''
    return `${tag}${heading}\n${c.content}`
  }).join('\n\n---\n\n')

  let summaryData: LeaseSummaryData & { asset_class?: string }
  try {
    const { text: result } = await generateText({
      model: anthropic('claude-haiku-4-5-20251001'),
      maxOutputTokens: 800,
      messages: [
        {
          role: 'user',
          content: `You are a lease abstraction specialist. From the following lease document excerpts, extract these fields in JSON format. If a field cannot be determined, use null.

IMPORTANT for lease dates:
- Look very carefully for the lease expiration date. It may be stated as a specific date, OR as a number of years from the commencement date (e.g., "The term shall be twenty (20) years from the Commencement Date").
- If the lease states a term length in years/months, CALCULATE the end date from the start date and return the calculated date.
- Check amendments, commencement letters, and exhibits which often confirm or modify the actual dates.
- If the start date is found but end date is only stated as a term length, compute it. For example: start "March 2, 2004" + "twenty (20) years" = end "March 1, 2024".

IMPORTANT for asset class:
- Determine the property type from context clues: tenant type, permitted use, property description, shopping center vs office building, etc.
- Use one of: Retail, Office, Industrial, Mixed-Use, Medical, Restaurant, Grocery, Other

Return ONLY valid JSON with exactly these keys — no other text:
{
  "tenant_name": "string or null",
  "landlord_name": "string or null",
  "property_address": "string or null",
  "suite_number": "string or null",
  "lease_start_date": "string or null (e.g. January 1, 2022)",
  "lease_end_date": "string or null (e.g. March 1, 2024 — MUST be a specific date, never a duration)",
  "base_rent_monthly": "string or null (e.g. $12,500/month)",
  "rent_escalation": "string or null (brief schedule description)",
  "security_deposit": "string or null",
  "permitted_use": "string or null (one sentence)",
  "lease_type": "string or null (NNN, Gross, Modified Gross, etc.)",
  "renewal_options": "string or null",
  "square_footage": "string or null",
  "asset_class": "string or null (one of: Retail, Office, Industrial, Mixed-Use, Medical, Restaurant, Grocery, Other)"
}

Lease excerpts:
${contextText.slice(0, 22000)}`,
        },
      ],
    })

    summaryData = parseAIJson(result)
  } catch (err) {
    console.error('[LeaseSummary] Claude extraction failed:', err)
    return null
  }

  // Upsert lease summary
  try {
    const { data: existing } = await admin
      .from('lease_summaries')
      .select('id')
      .eq('store_id', storeId)
      .eq('tenant_id', tenantId)
      .maybeSingle()

    // Strip asset_class from summary_data before saving (it goes on the store)
    const { asset_class, ...summaryOnly } = summaryData

    if (existing) {
      await admin
        .from('lease_summaries')
        .update({ summary_data: summaryOnly, updated_at: new Date().toISOString() })
        .eq('id', existing.id)
    } else {
      await admin.from('lease_summaries').insert({
        store_id: storeId,
        tenant_id: tenantId,
        summary_data: summaryOnly,
      })
    }

    // Update store's asset_class if detected
    if (asset_class) {
      const validClasses = ['Retail', 'Office', 'Industrial', 'Mixed-Use', 'Medical', 'Restaurant', 'Grocery', 'Other']
      const normalized = validClasses.find(v => v.toLowerCase() === asset_class.toLowerCase()) ?? null
      if (normalized) {
        const { error: storeErr } = await admin
          .from('stores')
          .update({ asset_class: normalized })
          .eq('id', storeId)
          .eq('tenant_id', tenantId)
        if (storeErr) {
          console.error('[LeaseSummary] Failed to update store asset_class:', storeErr.message)
        } else {
          console.info(`[LeaseSummary] Auto-detected asset_class: ${normalized} for store ${storeId}`)
        }
      }
    }
  } catch (err) {
    console.error('[LeaseSummary] DB write failed:', err)
  }

  return summaryData
}
