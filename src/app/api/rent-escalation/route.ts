import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase'
import { generateText } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { keywordSearchChunks } from '@/lib/vectorStore'

export const maxDuration = 60

export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const storeId = new URL(request.url).searchParams.get('store_id')
  if (!storeId) return NextResponse.json({ error: 'store_id required' }, { status: 400 })

  // First try to get the lease summary for basic data
  const admin = createAdminSupabaseClient()
  const { data: summaryRow } = await admin
    .from('lease_summaries').select('summary_data')
    .eq('store_id', storeId).eq('tenant_id', user.id).maybeSingle()

  const summary = summaryRow?.summary_data

  if (!summary) {
    return NextResponse.json({ schedule: null, summary: null })
  }

  // Search for rent escalation chunks for detailed extraction
  const keywords = ['rent escalation', 'rent increase', 'annual increase', 'rent adjustment', 'base rent', 'minimum rent']
  const results = await Promise.all(
    keywords.map(kw => keywordSearchChunks(kw, user.id, 6, storeId).catch(() => []))
  )

  const seen = new Set<string>()
  const chunks: string[] = []
  for (const batch of results) {
    for (const chunk of batch) {
      if (!seen.has(chunk.id)) {
        seen.add(chunk.id)
        chunks.push(chunk.content)
      }
    }
  }

  // If we have chunks, extract a detailed schedule
  let detailedSchedule = null
  if (chunks.length > 0) {
    try {
      const { text } = await generateText({
        model: anthropic('claude-haiku-4-5-20251001'),
        maxOutputTokens: 800,
        messages: [{
          role: 'user',
          content: `Extract the rent escalation schedule from these lease excerpts. Return ONLY valid JSON:
{
  "type": "percentage" | "fixed_amount" | "step_schedule" | "cpi" | "unknown",
  "annual_percentage": number or null (if type is "percentage"),
  "annual_fixed_increase": number or null (if type is "fixed_amount", e.g. 500 for $500/year),
  "steps": [
    { "year": 1, "monthly_rent": number, "effective_date": "string or null" }
  ] or null (if type is "step_schedule" — list each year with its specific rent),
  "cpi_details": "string or null" (if type is "cpi", describe the CPI adjustment terms),
  "description": "one sentence summary of the escalation terms",
  "article": "Article/Section reference or null"
}

If the lease specifies exact rents for each period, populate the "steps" array.
If it's a simple percentage increase, set "type": "percentage" and "annual_percentage".
If it's a fixed dollar increase per year, set "type": "fixed_amount" and "annual_fixed_increase".

Lease excerpts:
${chunks.slice(0, 15).join('\n\n---\n\n').slice(0, 15000)}`,
        }],
      })

      detailedSchedule = JSON.parse(text.trim().replace(/^```json\s*|\s*```$/g, ''))
    } catch (err) {
      console.error('[RentEscalation] Extraction failed:', err)
    }
  }

  return NextResponse.json({ schedule: detailedSchedule, summary })
}
