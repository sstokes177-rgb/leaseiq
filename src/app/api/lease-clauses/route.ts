import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase'
import { generateText } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { keywordSearchChunks } from '@/lib/vectorStore'
import { parseAIJson } from '@/lib/parseAIJson'
import { isRateLimited } from '@/lib/rateLimit'
import { INJECTION_DEFENSE, sanitizeChunkContent } from '@/lib/security'

export const maxDuration = 60

const CLAUSE_KEYWORDS: Record<string, string[]> = {
  'co-tenancy': [
    'co-tenancy', 'co tenancy', 'occupancy requirement', 'anchor tenant',
    'opening co-tenancy', 'operating co-tenancy', 'minimum occupancy',
    'rent reduction', 'reduced rent', 'percentage rent in lieu',
  ],
  'exclusive-use': [
    'exclusive use', 'exclusive right', 'restricted use', 'competing business',
    'radius restriction', 'non-compete', 'use restriction', 'prohibited use',
  ],
}

const CLAUDE_PROMPTS: Record<string, string> = {
  'co-tenancy': `Analyze these lease excerpts for CO-TENANCY provisions. Co-tenancy clauses protect the tenant by requiring certain occupancy levels or the presence of specific anchor tenants in the shopping center.

Return ONLY valid JSON:
{
  "has_clause": boolean,
  "summary": "2-3 sentence description of the co-tenancy provision, or 'No co-tenancy clause was found in the reviewed lease sections.' if not found",
  "trigger_conditions": "string or null — what conditions trigger the co-tenancy right (e.g., 'If occupancy falls below 70%' or 'If the anchor tenant closes')",
  "rent_reduction": "string or null — what rent reduction applies when triggered (e.g., 'Rent reduced to 4% of gross sales' or 'Tenant pays percentage rent only')",
  "termination_right": "string or null — whether tenant can terminate if co-tenancy is not restored within a period",
  "article": "string or null — Article/Section reference (e.g., 'Article 6.3')"
}`,
  'exclusive-use': `Analyze these lease excerpts for EXCLUSIVE USE provisions. Exclusive use clauses restrict the landlord from leasing to competing businesses in the same center.

Return ONLY valid JSON:
{
  "has_clause": boolean,
  "summary": "2-3 sentence description of the exclusive use provision, or 'No exclusive use clause was found in the reviewed lease sections.' if not found",
  "exclusive_use_description": "string or null — what exclusive use the tenant has (e.g., 'Exclusive right to operate a bakery and sell baked goods')",
  "restrictions": "string or null — what restrictions apply to other tenants in the center",
  "remedies": "string or null — what happens if the landlord violates the exclusive use (rent reduction, termination right, etc.)",
  "article": "string or null — Article/Section reference"
}`,
}

export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(request.url)
  const storeId = url.searchParams.get('store_id')
  const clauseType = url.searchParams.get('type') as 'co-tenancy' | 'exclusive-use'

  if (!storeId || !clauseType) {
    return NextResponse.json({ error: 'store_id and type required' }, { status: 400 })
  }

  if (!CLAUSE_KEYWORDS[clauseType]) {
    return NextResponse.json({ error: 'Invalid clause type' }, { status: 400 })
  }

  if (isRateLimited(user.id, 'lease-clauses')) {
    return NextResponse.json({ error: 'Please wait before analyzing another clause.' }, { status: 429 })
  }

  // Verify store belongs to user
  const { data: store } = await supabase
    .from('stores').select('id').eq('id', storeId).eq('tenant_id', user.id).maybeSingle()
  if (!store) return NextResponse.json({ error: 'Store not found' }, { status: 404 })

  // Search for clause-related chunks
  const keywords = CLAUSE_KEYWORDS[clauseType]
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

  // Fallback: if keyword search returns nothing, try DB filter
  if (chunks.length === 0) {
    const admin = createAdminSupabaseClient()
    const patterns = clauseType === 'co-tenancy'
      ? 'co.tenancy|occupancy|anchor'
      : 'exclusive.use|exclusive.right|competing|non.compete'

    const { data: rawChunks } = await admin
      .from('document_chunks').select('content')
      .eq('store_id', storeId).eq('tenant_id', user.id).limit(50)

    const filtered = (rawChunks ?? []).filter(c =>
      new RegExp(patterns, 'i').test(c.content)
    )
    chunks.push(...filtered.map(c => c.content).slice(0, 15))
  }

  if (chunks.length === 0) {
    return NextResponse.json({
      clause: {
        has_clause: false,
        summary: clauseType === 'co-tenancy'
          ? 'No co-tenancy clause was found in the reviewed lease sections. This may mean your lease does not include co-tenancy protections, or the relevant section was not captured during document processing.'
          : 'No exclusive use clause was found in the reviewed lease sections. This may mean your lease does not include exclusive use protections, or the relevant section was not captured during document processing.',
      },
    })
  }

  try {
    const { text } = await generateText({
      model: anthropic('claude-haiku-4-5-20251001'),
      maxOutputTokens: 600,
      messages: [{
        role: 'user',
        content: `${INJECTION_DEFENSE}${CLAUDE_PROMPTS[clauseType]}

Lease excerpts:
${chunks.slice(0, 15).map(c => sanitizeChunkContent(c)).join('\n\n---\n\n').slice(0, 15000)}`,
      }],
    })

    const clause = parseAIJson(text)
    return NextResponse.json({ clause })
  } catch (err) {
    console.error(`[LeaseClause] ${clauseType} extraction failed:`, err)
    return NextResponse.json({
      clause: {
        has_clause: false,
        summary: 'Analysis could not be completed. Please try again.',
      },
    })
  }
}
