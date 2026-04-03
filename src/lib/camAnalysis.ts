import { generateText } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { createAdminSupabaseClient } from './supabase'
import { keywordSearchChunks } from './vectorStore'
import { parseAIJson } from './parseAIJson'
import type { CamAnalysisData } from '@/types'

const CAM_KEYWORDS = [
  'common area maintenance',
  'common area',
  'CAM',
  'maintenance charge',
  'operating expense',
  'pass-through',
  'proportionate share',
  'pro rata',
  'admin fee',
  'management fee',
  'reconcil',
  'audit',
  'capital improvement',
  'controllable expense',
  'uncontrollable expense',
  'gross up',
  'base year',
  'expense stop',
]

export async function generateCamAnalysis(
  storeId: string,
  tenantId: string
): Promise<CamAnalysisData | null> {
  const admin = createAdminSupabaseClient()

  // Search for CAM-related chunks using keywords
  const keywordResults = await Promise.all(
    CAM_KEYWORDS.map((kw) =>
      keywordSearchChunks(kw, tenantId, 6, storeId).catch(() => [])
    )
  )

  // Deduplicate
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

  // Fallback: fetch chunks from DB and filter
  if (chunks.length === 0) {
    const { data: rawChunks } = await admin
      .from('document_chunks')
      .select('id, content')
      .eq('tenant_id', tenantId)
      .eq('store_id', storeId)
      .limit(60)

    const filtered = (rawChunks ?? []).filter((c: { id: string; content: string }) =>
      /common\s*area|cam\b|maintenance|operating\s*expense|pass.?through|proportionate|pro\s*rata|admin\s*fee|management\s*fee|reconcil|audit|capital\s*improvement|controllable\s*expense|uncontrollable|gross\s*up|base\s*year|expense\s*stop/i.test(
        c.content
      )
    )

    const toUse = filtered.length > 0 ? filtered : (rawChunks ?? [])
    chunks.push(...toUse.slice(0, 35))
  }

  if (chunks.length === 0) return null

  const contextText = chunks
    .slice(0, 35)
    .map((c) => c.content)
    .join('\n\n---\n\n')

  try {
    const { text: result } = await generateText({
      model: anthropic('claude-haiku-4-5-20251001'),
      maxOutputTokens: 800,
      messages: [
        {
          role: 'user',
          content: `Extract CAM charge details from these lease excerpts. Return ONLY valid JSON with no other text:
{
  "proportionate_share_pct": "string or null (e.g. '3.5%')",
  "admin_fee_pct": "string or null (e.g. '15% of CAM')",
  "cam_cap": "string or null (e.g. '5% annual increase cap')",
  "audit_window_days": "number or null (days tenant has to object/audit after receiving statement)",
  "excluded_items": ["list of items explicitly excluded from CAM"],
  "included_items": ["list of items explicitly included in CAM"],
  "escalation_limit": "string or null (any cap on CAM escalation)"
}

If a field cannot be determined from the text, use null for strings/numbers and [] for arrays.

Lease excerpts:
${contextText.slice(0, 18000)}`,
        },
      ],
    })

    const parsed = parseAIJson<Partial<CamAnalysisData>>(result)

    const analysisData: CamAnalysisData = {
      proportionate_share_pct: parsed.proportionate_share_pct ?? null,
      admin_fee_pct: parsed.admin_fee_pct ?? null,
      cam_cap: parsed.cam_cap ?? null,
      audit_window_days: parsed.audit_window_days != null ? Number(parsed.audit_window_days) : null,
      excluded_items: Array.isArray(parsed.excluded_items) ? parsed.excluded_items : [],
      included_items: Array.isArray(parsed.included_items) ? parsed.included_items : [],
      escalation_limit: parsed.escalation_limit ?? null,
    }

    // Upsert
    try {
      const { data: existing } = await admin
        .from('cam_analysis')
        .select('id')
        .eq('store_id', storeId)
        .eq('tenant_id', tenantId)
        .maybeSingle()

      if (existing) {
        const { error: updateErr } = await admin
          .from('cam_analysis')
          .update({ analysis_data: analysisData })
          .eq('id', existing.id)
        if (updateErr) console.error('[CAM] Update failed:', updateErr.message)
      } else {
        const { error: insertErr } = await admin.from('cam_analysis').insert({
          store_id: storeId,
          tenant_id: tenantId,
          analysis_data: analysisData,
        })
        if (insertErr) console.error('[CAM] Insert failed:', insertErr.message)
      }
    } catch (dbErr) {
      console.error('[CAM] DB upsert failed (table may not exist):', dbErr)
    }

    return analysisData
  } catch (err) {
    console.error('[CAM] Analysis extraction failed:', err)
    return null
  }
}
