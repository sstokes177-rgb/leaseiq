import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase'
import { generateText } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { keywordSearchChunks } from '@/lib/vectorStore'
import type { ClauseScore } from '@/types'

export const maxDuration = 90

// All clause categories to analyze
const CLAUSE_CATEGORIES = {
  expansion_blockers: [
    'Exclusivity',
    'Radius restriction',
    'Use restriction',
    'Co-tenancy',
    'Relocation clause',
    'Assignment/subletting',
  ],
  financial_exposure: [
    'Rent escalation severity',
    'CAM pass-through scope',
    'Percentage rent trigger',
    'CAM cap existence',
    'Operating hours',
    'Insurance requirements',
    'Late fee/default',
  ],
  tenant_protections: [
    'Renewal option',
    'Termination right',
    'SNDA',
    'CAM audit right',
    'Exclusive use',
    'Go-dark right',
    'Force majeure',
  ],
} as const

// Keywords to search for relevant chunks
const RISK_KEYWORDS = [
  'exclusive', 'radius', 'restriction', 'co-tenancy', 'relocation',
  'assignment', 'subletting', 'sublease', 'escalation', 'cam',
  'common area', 'percentage rent', 'operating hours', 'insurance',
  'late fee', 'default', 'renewal', 'termination', 'snda',
  'subordination', 'non-disturbance', 'audit', 'go-dark', 'force majeure',
  'permitted use', 'cap', 'pass-through', 'operating expense',
]

const SYSTEM_PROMPT = `You are a commercial lease risk analyst. Analyze the provided lease excerpts and score each clause category.

For EXPANSION BLOCKERS and FINANCIAL EXPOSURE categories, score by how RESTRICTIVE or RISKY the clause is to the tenant:
- "red" = High risk: Very restrictive terms, unfavorable to tenant
- "yellow" = Moderate risk: Some restrictions but with reasonable limits
- "green" = Low risk: Favorable terms or no restrictive language found

For TENANT PROTECTIONS, score by the PRESENCE and STRENGTH of protections:
- "green" = Protection is present and strong
- "yellow" = Protection exists but is weak or limited
- "red" = Protection is ABSENT or explicitly waived

Return ONLY valid JSON with this exact structure:
{
  "clauses": [
    {
      "clause": "Clause name exactly as listed",
      "category": "expansion_blockers" | "financial_exposure" | "tenant_protections",
      "severity": "red" | "yellow" | "green",
      "summary": "1-2 sentence description of what was found or not found",
      "citation": "Article/Section reference if found, or null",
      "recommendation": "Brief actionable recommendation for the tenant"
    }
  ]
}

Analyze ALL of the following clauses. Do not skip any:

EXPANSION BLOCKERS: Exclusivity, Radius restriction, Use restriction, Co-tenancy, Relocation clause, Assignment/subletting

FINANCIAL EXPOSURE: Rent escalation severity, CAM pass-through scope, Percentage rent trigger, CAM cap existence, Operating hours, Insurance requirements, Late fee/default

TENANT PROTECTIONS (score by ABSENCE — red if missing): Renewal option, Termination right, SNDA, CAM audit right, Exclusive use, Go-dark right, Force majeure`

function calculateOverallScore(clauses: ClauseScore[]): number {
  if (clauses.length === 0) return 50

  const weights: Record<string, number> = {
    expansion_blockers: 1.2,
    financial_exposure: 1.0,
    tenant_protections: 1.3,
  }

  const severityPoints: Record<string, number> = {
    green: 100,
    yellow: 55,
    red: 10,
  }

  let totalWeight = 0
  let weightedSum = 0

  for (const clause of clauses) {
    const w = weights[clause.category] ?? 1.0
    totalWeight += w
    weightedSum += severityPoints[clause.severity] * w
  }

  return Math.round(weightedSum / totalWeight)
}

// GET — retrieve existing risk score
export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const storeId = new URL(request.url).searchParams.get('store_id')
  if (!storeId) return NextResponse.json({ error: 'store_id required' }, { status: 400 })

  // Verify store ownership
  const { data: store } = await supabase
    .from('stores').select('id').eq('id', storeId).eq('tenant_id', user.id).maybeSingle()
  if (!store) return NextResponse.json({ error: 'Store not found' }, { status: 404 })

  const { data: score } = await supabase
    .from('lease_risk_scores')
    .select('*')
    .eq('store_id', storeId)
    .eq('tenant_id', user.id)
    .maybeSingle()

  return NextResponse.json({ risk_score: score ?? null })
}

// POST — generate new risk analysis
export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const storeId = body.store_id
  if (!storeId) return NextResponse.json({ error: 'store_id required' }, { status: 400 })

  // Verify store ownership
  const { data: store } = await supabase
    .from('stores').select('id').eq('id', storeId).eq('tenant_id', user.id).maybeSingle()
  if (!store) return NextResponse.json({ error: 'Store not found' }, { status: 404 })

  // Gather lease chunks via keyword search
  const searchResults = await Promise.all(
    RISK_KEYWORDS.map(kw => keywordSearchChunks(kw, user.id, 4, storeId).catch(() => []))
  )

  const seen = new Set<string>()
  const chunks: string[] = []
  for (const batch of searchResults) {
    for (const chunk of batch) {
      if (!seen.has(chunk.id)) {
        seen.add(chunk.id)
        chunks.push(chunk.content)
      }
    }
  }

  // Fallback: grab all chunks if keyword search returns too few
  if (chunks.length < 5) {
    const admin = createAdminSupabaseClient()
    const { data: rawChunks } = await admin
      .from('document_chunks').select('content')
      .eq('store_id', storeId).eq('tenant_id', user.id)
      .order('created_at', { ascending: true })
      .limit(60)

    for (const c of rawChunks ?? []) {
      if (chunks.length < 60) chunks.push(c.content)
    }
  }

  if (chunks.length === 0) {
    return NextResponse.json(
      { error: 'Upload your lease documents to enable risk analysis.' },
      { status: 400 }
    )
  }

  // Limit context to 30 chunks and 20k chars to avoid token limits
  const contextText = chunks.slice(0, 30).join('\n\n---\n\n').slice(0, 20000)

  let text: string
  try {
    const result = await generateText({
      model: anthropic('claude-sonnet-4-6'),
      maxOutputTokens: 4000,
      messages: [{
        role: 'user',
        content: `${SYSTEM_PROMPT}\n\nLease excerpts to analyze:\n${contextText}`,
      }],
    })
    text = result.text
  } catch (err) {
    const msg = String(err).toLowerCase()
    if (msg.includes('overload') || msg.includes('529')) {
      console.warn('[RiskScore] Model overloaded, retrying with haiku')
      try {
        const fallback = await generateText({
          model: anthropic('claude-haiku-4-5-20251001'),
          maxOutputTokens: 4000,
          messages: [{
            role: 'user',
            content: `${SYSTEM_PROMPT}\n\nLease excerpts to analyze:\n${contextText}`,
          }],
        })
        text = fallback.text
      } catch (haikuErr) {
        console.error('[RiskScore] Both models failed:', haikuErr)
        return NextResponse.json(
          { error: 'AI service is currently busy. Please try again in a moment.' },
          { status: 503 }
        )
      }
    } else {
      console.error('[RiskScore] AI generation failed:', err)
      return NextResponse.json(
        { error: 'Risk analysis failed. Please try again.' },
        { status: 500 }
      )
    }
  }

  // Parse the JSON response — handle various wrapping formats
  let parsed: { clauses?: ClauseScore[] }
  try {
    const cleaned = text.trim()
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/i, '')
    parsed = JSON.parse(cleaned)
  } catch (parseErr) {
    console.error('[RiskScore] JSON parse failed. Raw text:', text.slice(0, 500))
    return NextResponse.json(
      { error: 'Risk analysis returned an unexpected format. Please try again.' },
      { status: 500 }
    )
  }

  const clauseScores: ClauseScore[] = (parsed.clauses ?? []).map((c: ClauseScore) => ({
    clause: c.clause,
    category: c.category,
    severity: c.severity,
    summary: c.summary,
    citation: c.citation || null,
    recommendation: c.recommendation || null,
  }))

  // Ensure all clauses are present — fill missing ones as yellow
  const allClauses: Array<{ clause: string; category: string }> = []
  for (const [category, clauses] of Object.entries(CLAUSE_CATEGORIES)) {
    for (const clause of clauses) {
      allClauses.push({ clause, category })
    }
  }

  const existingClauses = new Set(clauseScores.map(c => c.clause))
  for (const { clause, category } of allClauses) {
    if (!existingClauses.has(clause)) {
      clauseScores.push({
        clause,
        category: category as ClauseScore['category'],
        severity: 'yellow',
        summary: 'Could not be determined from available lease text.',
        citation: null,
        recommendation: 'Review your lease document for this clause.',
      })
    }
  }

  const overallScore = calculateOverallScore(clauseScores)

  // Upsert to database
  try {
    const admin = createAdminSupabaseClient()
    const { data: existing } = await admin
      .from('lease_risk_scores')
      .select('id')
      .eq('store_id', storeId)
      .eq('tenant_id', user.id)
      .maybeSingle()

    if (existing) {
      await admin.from('lease_risk_scores').update({
        overall_score: overallScore,
        clause_scores: clauseScores,
        analyzed_at: new Date().toISOString(),
      }).eq('id', existing.id)
    } else {
      await admin.from('lease_risk_scores').insert({
        store_id: storeId,
        tenant_id: user.id,
        overall_score: overallScore,
        clause_scores: clauseScores,
        analyzed_at: new Date().toISOString(),
      })
    }
  } catch (dbErr) {
    console.error('[RiskScore] DB write failed:', dbErr)
    // Still return the result even if caching fails
  }

  return NextResponse.json({
    overall_score: overallScore,
    clause_scores: clauseScores,
    analyzed_at: new Date().toISOString(),
  })
}
