import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase'
import { generateText } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { keywordSearchChunks } from '@/lib/vectorStore'
import { parseAIJson } from '@/lib/parseAIJson'
import { isRateLimited } from '@/lib/rateLimit'
import { INJECTION_DEFENSE, sanitizeChunkContent } from '@/lib/security'

export const maxDuration = 90

// GET: fetch config + entries
export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const storeId = request.nextUrl.searchParams.get('store_id')
  if (!storeId) return NextResponse.json({ error: 'store_id required' }, { status: 400 })

  try {
    const [configRes, entriesRes] = await Promise.all([
      supabase
        .from('percentage_rent_config')
        .select('*')
        .eq('store_id', storeId)
        .eq('tenant_id', user.id)
        .maybeSingle(),
      supabase
        .from('percentage_rent_entries')
        .select('*')
        .eq('store_id', storeId)
        .eq('tenant_id', user.id)
        .order('year', { ascending: true })
        .order('month', { ascending: true }),
    ])

    return NextResponse.json({
      config: configRes.data,
      entries: entriesRes.data ?? [],
    })
  } catch {
    return NextResponse.json({ config: null, entries: [] })
  }
}

// POST: extract config from lease OR save a sales entry
export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const storeId = body?.store_id as string | undefined
  const action = body?.action as string | undefined
  if (!storeId) return NextResponse.json({ error: 'store_id required' }, { status: 400 })

  const { data: store } = await supabase
    .from('stores')
    .select('id')
    .eq('id', storeId)
    .eq('tenant_id', user.id)
    .maybeSingle()
  if (!store) return NextResponse.json({ error: 'Store not found' }, { status: 404 })

  const admin = createAdminSupabaseClient()

  // Save a sales entry
  if (action === 'save_entry') {
    const { month, year, gross_sales } = body
    if (!month || !year || gross_sales == null) {
      return NextResponse.json({ error: 'month, year, and gross_sales required' }, { status: 400 })
    }

    const { error } = await admin.from('percentage_rent_entries').upsert(
      {
        store_id: storeId,
        tenant_id: user.id,
        month: Number(month),
        year: Number(year),
        gross_sales: Number(gross_sales),
      },
      { onConflict: 'store_id,tenant_id,month,year' }
    )

    if (error) {
      console.error('[PercentageRent] Save entry error:', error.message)
      return NextResponse.json({ error: 'Failed to save entry' }, { status: 500 })
    }
    return NextResponse.json({ success: true })
  }

  if (action !== 'extract_config') {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }

  if (isRateLimited(user.id, 'percentage-rent')) {
    return NextResponse.json({ error: 'Please wait before extracting again.' }, { status: 429 })
  }

  // Extract percentage rent config from lease
  const keywords = ['percentage rent', 'breakpoint', 'natural breakpoint', 'overage rent', 'gross sales']
  const results = await Promise.all(
    keywords.map((kw) => keywordSearchChunks(kw, user.id, 6, storeId).catch(() => []))
  )

  const seen = new Set<string>()
  const chunks: { content: string }[] = []
  for (const batch of results) {
    for (const chunk of batch) {
      if (!seen.has(chunk.id)) {
        seen.add(chunk.id)
        chunks.push({ content: chunk.content })
      }
    }
  }

  // Fallback
  if (chunks.length === 0) {
    const { data: rawChunks } = await admin
      .from('document_chunks')
      .select('id, content')
      .eq('tenant_id', user.id)
      .eq('store_id', storeId)
      .limit(40)

    const filtered = (rawChunks ?? []).filter((c: { content: string }) =>
      /percentage\s*rent|breakpoint|overage|gross\s*sales/i.test(c.content)
    )
    chunks.push(...(filtered.length > 0 ? filtered : (rawChunks ?? []).slice(0, 20)))
  }

  if (chunks.length === 0) {
    return NextResponse.json({ error: 'No lease documents found' }, { status: 422 })
  }

  const contextText = chunks.map((c) => sanitizeChunkContent(c.content)).join('\n\n---\n\n')

  try {
    const { text: result } = await generateText({
      model: anthropic('claude-haiku-4-5-20251001'),
      maxOutputTokens: 400,
      messages: [
        {
          role: 'user',
          content: `${INJECTION_DEFENSE}Extract percentage rent details from these lease excerpts. Return ONLY valid JSON:
{
  "breakpoint": "number or null (annual breakpoint amount, numbers only)",
  "percentage": "number or null (percentage rate, e.g. 6 for 6%)",
  "breakpoint_raw": "string or null (exact text describing the breakpoint)",
  "percentage_raw": "string or null (exact text describing the percentage)",
  "details": "string or null (brief summary of percentage rent terms)"
}

If no percentage rent clause found, return all nulls.

Lease excerpts:
${contextText.slice(0, 12000)}`,
        },
      ],
    })

    const parsed = parseAIJson<{
      breakpoint?: number | null
      percentage?: number | null
      breakpoint_raw?: string | null
      percentage_raw?: string | null
      details?: string | null
    }>(result)

    await admin.from('percentage_rent_config').upsert(
      {
        store_id: storeId,
        tenant_id: user.id,
        breakpoint: parsed.breakpoint ?? null,
        percentage: parsed.percentage ?? null,
        analysis_data: {
          breakpoint_raw: parsed.breakpoint_raw ?? null,
          percentage_raw: parsed.percentage_raw ?? null,
          details: parsed.details ?? null,
        },
      },
      { onConflict: 'store_id,tenant_id' }
    )

    return NextResponse.json({ success: true, config: parsed })
  } catch (err) {
    console.error('[Percentage Rent] Failed:', err)
    return NextResponse.json({ error: 'Could not extract percentage rent terms' }, { status: 500 })
  }
}
