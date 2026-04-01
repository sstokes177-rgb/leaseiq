import { generateText } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { createAdminSupabaseClient } from './supabase'
import type { LeaseSummaryData } from '@/types'

export async function generateLeaseSummary(
  storeId: string,
  tenantId: string
): Promise<LeaseSummaryData | null> {
  const admin = createAdminSupabaseClient()

  // Fetch first 40 chunks and sort by chunk_index to get the opening pages
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
  const chunks = [...rawChunks]
    .sort((a, b) => (a.metadata?.chunk_index ?? 0) - (b.metadata?.chunk_index ?? 0))
    .slice(0, 30)

  const contextText = chunks.map((c) => c.content).join('\n\n---\n\n')

  let summaryData: LeaseSummaryData
  try {
    const { text: result } = await generateText({
      model: anthropic('claude-haiku-4-5-20251001'),
      maxOutputTokens: 700,
      messages: [
        {
          role: 'user',
          content: `You are a lease abstraction specialist. From the following lease document excerpts, extract these fields in JSON format. If a field cannot be determined, use null.

Return ONLY valid JSON with exactly these keys — no other text:
{
  "tenant_name": "string or null",
  "landlord_name": "string or null",
  "property_address": "string or null",
  "suite_number": "string or null",
  "lease_start_date": "string or null (e.g. January 1, 2022)",
  "lease_end_date": "string or null",
  "base_rent_monthly": "string or null (e.g. $12,500/month)",
  "rent_escalation": "string or null (brief schedule description)",
  "security_deposit": "string or null",
  "permitted_use": "string or null (one sentence)",
  "lease_type": "string or null (NNN, Gross, Modified Gross, etc.)",
  "renewal_options": "string or null",
  "square_footage": "string or null"
}

Lease excerpts:
${contextText.slice(0, 18000)}`,
        },
      ],
    })

    summaryData = JSON.parse(result.trim().replace(/^```json\s*|\s*```$/g, ''))
  } catch (err) {
    console.error('[LeaseSummary] Claude extraction failed:', err)
    return null
  }

  // Upsert: update if exists, insert if not
  try {
    const { data: existing } = await admin
      .from('lease_summaries')
      .select('id')
      .eq('store_id', storeId)
      .eq('tenant_id', tenantId)
      .maybeSingle()

    if (existing) {
      await admin
        .from('lease_summaries')
        .update({ summary_data: summaryData, updated_at: new Date().toISOString() })
        .eq('id', existing.id)
    } else {
      await admin.from('lease_summaries').insert({
        store_id: storeId,
        tenant_id: tenantId,
        summary_data: summaryData,
      })
    }
  } catch (err) {
    console.error('[LeaseSummary] DB write failed:', err)
    // Return the data even if DB write fails — caller can still show it
  }

  return summaryData
}
