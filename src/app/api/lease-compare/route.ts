import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase'
import { generateText } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { parseAIJson } from '@/lib/parseAIJson'
import { isRateLimited } from '@/lib/rateLimit'
import { INJECTION_DEFENSE, sanitizeChunkContent } from '@/lib/security'
import type { LeaseComparisonResult } from '@/types'

export const maxDuration = 120

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (isRateLimited(user.id, 'lease-compare')) {
    return NextResponse.json({ error: 'Please wait before running another comparison.' }, { status: 429 })
  }

  const body = await request.json().catch(() => ({}))
  const storeId = body?.store_id as string | undefined
  if (!storeId) return NextResponse.json({ error: 'store_id required' }, { status: 400 })

  // Verify store ownership
  const { data: store } = await supabase
    .from('stores')
    .select('id')
    .eq('id', storeId)
    .eq('tenant_id', user.id)
    .maybeSingle()

  if (!store) return NextResponse.json({ error: 'Store not found' }, { status: 404 })

  // Get all documents for this store, sorted: base_lease first, then amendments by uploaded_at
  const { data: documents, error: docErr } = await supabase
    .from('documents')
    .select('id, file_name, document_type, display_name, uploaded_at')
    .eq('store_id', storeId)
    .eq('tenant_id', user.id)
    .order('uploaded_at', { ascending: true })

  if (docErr || !documents || documents.length < 2) {
    return NextResponse.json(
      { error: 'Need at least 2 documents (base lease + amendment) for comparison.' },
      { status: 400 }
    )
  }

  // Separate base lease from amendments/other docs
  const baseLeaseDocs = documents.filter(d => d.document_type === 'base_lease')
  const amendmentDocs = documents.filter(d => d.document_type !== 'base_lease')

  if (baseLeaseDocs.length === 0 || amendmentDocs.length === 0) {
    return NextResponse.json(
      { error: 'Need both a base lease and at least one amendment for comparison.' },
      { status: 400 }
    )
  }

  const admin = createAdminSupabaseClient()

  // Fetch chunks for base lease documents
  const baseLeaseIds = baseLeaseDocs.map(d => d.id)
  const { data: baseChunks } = await admin
    .from('document_chunks')
    .select('content, metadata')
    .eq('tenant_id', user.id)
    .eq('store_id', storeId)
    .in('document_id', baseLeaseIds)
    .order('created_at', { ascending: true })
    .limit(40)

  // Fetch chunks for amendment documents
  const amendmentIds = amendmentDocs.map(d => d.id)
  const { data: amendChunks } = await admin
    .from('document_chunks')
    .select('content, metadata')
    .eq('tenant_id', user.id)
    .eq('store_id', storeId)
    .in('document_id', amendmentIds)
    .order('created_at', { ascending: true })
    .limit(40)

  if ((!baseChunks || baseChunks.length === 0) || (!amendChunks || amendChunks.length === 0)) {
    return NextResponse.json(
      { error: 'Could not find document content for comparison. Please ensure documents are processed.' },
      { status: 422 }
    )
  }

  // Build context text (sanitize chunks before including in prompt)
  const baseLeaseText = baseChunks
    .map(c => {
      const meta = c.metadata as { document_name?: string; section_heading?: string }
      const heading = meta?.section_heading ? ` — ${meta.section_heading}` : ''
      return `[${meta?.document_name ?? 'Base Lease'}${heading}]\n${sanitizeChunkContent(c.content)}`
    })
    .join('\n\n---\n\n')

  const amendmentText = amendChunks
    .map(c => {
      const meta = c.metadata as { document_name?: string; section_heading?: string }
      const heading = meta?.section_heading ? ` — ${meta.section_heading}` : ''
      return `[${meta?.document_name ?? 'Amendment'}${heading}]\n${sanitizeChunkContent(c.content)}`
    })
    .join('\n\n---\n\n')

  const prompt = `${INJECTION_DEFENSE}You are a commercial lease comparison analyst. Compare the following lease documents and identify ALL differences.

BASE LEASE:
${baseLeaseText.slice(0, 18000)}

AMENDMENT(S):
${amendmentText.slice(0, 18000)}

For each change, provide:
- clause_affected: which article/section was modified
- original_text: brief summary of what the base lease said
- amended_text: brief summary of what the amendment changed it to
- impact: "favorable" | "unfavorable" | "neutral" from the tenant's perspective
- significance: "high" | "medium" | "low"
- explanation: 1-2 sentences explaining the practical impact on the tenant

Return ONLY valid JSON:
{
  "comparisons": [
    {
      "clause_affected": "Article 5 - Rent",
      "original_text": "Base rent of $5,000/month with 3% annual increases",
      "amended_text": "Base rent increased to $5,500/month with CPI-linked increases",
      "impact": "unfavorable",
      "significance": "high",
      "explanation": "The amendment increases both the base rent and changes the escalation method from fixed to CPI-linked, which could result in higher increases in inflationary periods."
    }
  ],
  "summary": "Brief overall summary of changes",
  "net_impact": "favorable" | "unfavorable" | "mixed"
}`

  let text: string
  try {
    const result = await generateText({
      model: anthropic('claude-sonnet-4-6'),
      maxOutputTokens: 4000,
      messages: [{ role: 'user', content: prompt }],
    })
    text = result.text
  } catch (err) {
    const msg = String(err).toLowerCase()
    if (msg.includes('overload') || msg.includes('529')) {
      try {
        const fallback = await generateText({
          model: anthropic('claude-haiku-4-5-20251001'),
          maxOutputTokens: 4000,
          messages: [{ role: 'user', content: prompt }],
        })
        text = fallback.text
      } catch (haikuErr) {
        console.error('[LeaseCompare] Both models failed:', haikuErr)
        return NextResponse.json(
          { error: 'AI service is currently busy. Please try again in a moment.' },
          { status: 503 }
        )
      }
    } else {
      console.error('[LeaseCompare] AI generation failed:', err)
      return NextResponse.json(
        { error: 'Comparison failed. Please try again.' },
        { status: 500 }
      )
    }
  }

  // Parse JSON
  let parsed: LeaseComparisonResult
  try {
    parsed = parseAIJson(text)
  } catch {
    console.error('[LeaseCompare] JSON parse failed. Raw text:', text.slice(0, 500))
    return NextResponse.json(
      { error: 'Comparison returned an unexpected format. Please try again.' },
      { status: 500 }
    )
  }

  // Validate and normalize
  const result: LeaseComparisonResult = {
    comparisons: (parsed.comparisons ?? []).map(c => ({
      clause_affected: c.clause_affected ?? 'Unknown',
      original_text: c.original_text ?? '',
      amended_text: c.amended_text ?? '',
      impact: (['favorable', 'unfavorable', 'neutral'].includes(c.impact) ? c.impact : 'neutral') as LeaseComparisonResult['comparisons'][0]['impact'],
      significance: (['high', 'medium', 'low'].includes(c.significance) ? c.significance : 'medium') as LeaseComparisonResult['comparisons'][0]['significance'],
      explanation: c.explanation ?? '',
    })),
    summary: parsed.summary ?? 'Comparison complete.',
    net_impact: (['favorable', 'unfavorable', 'mixed'].includes(parsed.net_impact) ? parsed.net_impact : 'mixed') as LeaseComparisonResult['net_impact'],
  }

  return NextResponse.json(result)
}
