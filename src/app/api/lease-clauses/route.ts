import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase'
import { generateText } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { keywordSearchChunks } from '@/lib/vectorStore'

export const maxDuration = 90

export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const storeId = request.nextUrl.searchParams.get('store_id')
  const clauseType = request.nextUrl.searchParams.get('type') // 'co-tenancy' | 'exclusive-use'
  if (!storeId) return NextResponse.json({ error: 'store_id required' }, { status: 400 })
  if (!clauseType) return NextResponse.json({ error: 'type required' }, { status: 400 })

  const admin = createAdminSupabaseClient()

  const keywordMap: Record<string, string[]> = {
    'co-tenancy': ['co-tenancy', 'co tenancy', 'occupancy', 'anchor tenant', 'major tenant', 'dark', 'go dark'],
    'exclusive-use': ['exclusive', 'restrict', 'compete', 'similar business', 'permitted use'],
  }

  const promptMap: Record<string, string> = {
    'co-tenancy': `Analyze these lease excerpts for co-tenancy provisions. Return ONLY valid JSON:
{
  "has_clause": true/false,
  "trigger_conditions": "string or null (what triggers the co-tenancy protection)",
  "rent_reduction": "string or null (what happens to rent when triggered)",
  "termination_right": "string or null (any termination right if triggered)",
  "article": "string or null (lease article/section reference)",
  "summary": "string (1-2 sentence summary for the tenant)"
}`,
    'exclusive-use': `Analyze these lease excerpts for exclusive use provisions. Return ONLY valid JSON:
{
  "has_clause": true/false,
  "exclusive_use_description": "string or null (what exclusive use is granted)",
  "restrictions": "string or null (specific restrictions on other tenants)",
  "remedies": "string or null (what remedies tenant has if violated)",
  "article": "string or null (lease article/section reference)",
  "summary": "string (1-2 sentence summary for the tenant)"
}`,
  }

  const keywords = keywordMap[clauseType]
  const prompt = promptMap[clauseType]
  if (!keywords || !prompt) {
    return NextResponse.json({ error: 'Invalid clause type' }, { status: 400 })
  }

  // Search for relevant chunks
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

    const pattern = clauseType === 'co-tenancy'
      ? /co.?tenanc|anchor|major\s*tenant|go\s*dark|occupancy/i
      : /exclusive|restrict|compete|similar\s*business|permitted\s*use/i

    const filtered = (rawChunks ?? []).filter((c: { content: string }) => pattern.test(c.content))
    chunks.push(...(filtered.length > 0 ? filtered : (rawChunks ?? []).slice(0, 15)))
  }

  if (chunks.length === 0) {
    const defaultResult = clauseType === 'co-tenancy'
      ? { has_clause: false, summary: 'No co-tenancy clause found in your lease documents.' }
      : { has_clause: false, summary: 'No exclusive use clause found in your lease documents.' }
    return NextResponse.json({ clause: defaultResult })
  }

  const contextText = chunks.map((c) => c.content).join('\n\n---\n\n')

  try {
    const { text: result } = await generateText({
      model: anthropic('claude-haiku-4-5-20251001'),
      maxOutputTokens: 500,
      messages: [
        {
          role: 'user',
          content: `${prompt}\n\nLease excerpts:\n${contextText.slice(0, 14000)}`,
        },
      ],
    })

    const parsed = JSON.parse(result.trim().replace(/^```json\s*|\s*```$/g, ''))
    return NextResponse.json({ clause: parsed })
  } catch (err) {
    console.error(`[Clause ${clauseType}] Failed:`, err)
    return NextResponse.json({ error: 'Could not analyze lease clause' }, { status: 500 })
  }
}
