import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase'
import { generateText } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { processDocument } from '@/lib/pdfProcessor'
import type { CamReconciliationData } from '@/types'

export const maxDuration = 120

export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const storeId = request.nextUrl.searchParams.get('store_id')
  if (!storeId) return NextResponse.json({ error: 'store_id required' }, { status: 400 })

  try {
    const { data } = await supabase
      .from('cam_reconciliations')
      .select('*')
      .eq('store_id', storeId)
      .eq('tenant_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5)

    return NextResponse.json({ reconciliations: data ?? [] })
  } catch {
    return NextResponse.json({ reconciliations: [] })
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await request.formData()
  const storeId = formData.get('store_id') as string
  const file = formData.get('file') as File | null

  if (!storeId) return NextResponse.json({ error: 'store_id required' }, { status: 400 })
  if (!file) return NextResponse.json({ error: 'PDF file required' }, { status: 400 })

  // Validate file
  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 })
  }

  const ext = file.name.split('.').pop()?.toLowerCase()
  if (!['pdf', 'doc', 'docx'].includes(ext ?? '')) {
    return NextResponse.json({ error: 'Only PDF and Word files accepted' }, { status: 400 })
  }

  // Verify store ownership
  const { data: store } = await supabase
    .from('stores')
    .select('id')
    .eq('id', storeId)
    .eq('tenant_id', user.id)
    .maybeSingle()

  if (!store) return NextResponse.json({ error: 'Store not found' }, { status: 404 })

  // Get existing CAM analysis for this store
  const admin = createAdminSupabaseClient()
  const { data: camAnalysis } = await admin
    .from('cam_analysis')
    .select('analysis_data')
    .eq('store_id', storeId)
    .eq('tenant_id', user.id)
    .maybeSingle()

  // Extract text from uploaded reconciliation statement
  const buffer = Buffer.from(await file.arrayBuffer())
  let chunks
  try {
    chunks = await processDocument(buffer, file.name, file.type, file.name, 'reconciliation')
  } catch (err) {
    return NextResponse.json({ error: `Could not read file: ${err instanceof Error ? err.message : 'Unknown error'}` }, { status: 422 })
  }

  const statementText = chunks.map((c) => c.content).join('\n\n')

  const leaseProvisions = camAnalysis?.analysis_data
    ? `Lease CAM Provisions:\n${JSON.stringify(camAnalysis.analysis_data, null, 2)}`
    : 'No CAM provisions extracted from lease yet.'

  try {
    const { text: result } = await generateText({
      model: anthropic('claude-haiku-4-5-20251001'),
      maxOutputTokens: 1200,
      messages: [
        {
          role: 'user',
          content: `Compare this CAM reconciliation statement against the lease provisions. Identify any charges that:
(a) exceed the lease's CAM cap
(b) appear to be capital improvements excluded by the lease
(c) include admin fees above what the lease allows
(d) don't match the tenant's proportionate share

${leaseProvisions}

CAM Reconciliation Statement:
${statementText.slice(0, 16000)}

Return ONLY valid JSON:
{
  "total_billed": "string (total amount billed in the statement)",
  "potential_overcharges": [
    {
      "item": "description of the charge",
      "amount": "dollar amount",
      "reason": "why this may be an overcharge",
      "article": "relevant lease article/section"
    }
  ],
  "total_potential_savings": "string (sum of potential overcharges)",
  "recommendation": "string (1-2 sentence actionable recommendation)"
}

If no overcharges found, return empty potential_overcharges array with recommendation noting the statement appears compliant.`,
        },
      ],
    })

    const parsed: CamReconciliationData = JSON.parse(result.trim().replace(/^```json\s*|\s*```$/g, ''))

    // Store result
    await admin.from('cam_reconciliations').insert({
      store_id: storeId,
      tenant_id: user.id,
      reconciliation_data: parsed,
      file_name: file.name,
    })

    return NextResponse.json({ success: true, reconciliation: parsed })
  } catch (err) {
    console.error('[CAM Reconciliation] Failed:', err)
    return NextResponse.json({ error: 'Could not analyze reconciliation statement' }, { status: 500 })
  }
}
