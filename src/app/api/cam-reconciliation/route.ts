import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase'
import { generateText } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { parseAIJson } from '@/lib/parseAIJson'
import type { CamReconciliationData } from '@/types'

export const maxDuration = 120

export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const storeId = request.nextUrl.searchParams.get('store_id')
  if (!storeId) return NextResponse.json({ error: 'store_id required' }, { status: 400 })

  const { data, error } = await supabase
    .from('cam_reconciliations')
    .select('*')
    .eq('store_id', storeId)
    .eq('tenant_id', user.id)
    .order('created_at', { ascending: false })
    .limit(5)

  if (error) return NextResponse.json({ reconciliations: [] })
  return NextResponse.json({ reconciliations: data ?? [] })
}

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  const storeId = formData.get('store_id') as string | null

  if (!file || !storeId) {
    return NextResponse.json({ error: 'File and store_id required' }, { status: 400 })
  }

  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 })
  }

  // Verify store belongs to user
  const { data: store } = await supabase
    .from('stores')
    .select('id')
    .eq('id', storeId)
    .eq('tenant_id', user.id)
    .maybeSingle()

  if (!store) return NextResponse.json({ error: 'Store not found' }, { status: 404 })

  // Extract text from PDF
  let statementText: string
  try {
    const buffer = Buffer.from(await file.arrayBuffer())
    const pdfParse = (await import('pdf-parse')).default
    const result = await pdfParse(buffer)
    statementText = result.text
  } catch (err) {
    console.error('[CAM Reconciliation] PDF extraction failed:', err)
    return NextResponse.json({ error: 'Could not extract text from PDF' }, { status: 422 })
  }

  if (!statementText || statementText.trim().length < 50) {
    return NextResponse.json({ error: 'Could not extract meaningful text from the uploaded file' }, { status: 422 })
  }

  // Fetch existing CAM analysis for context
  const admin = createAdminSupabaseClient()
  const { data: camAnalysis } = await admin
    .from('cam_analysis')
    .select('analysis_data')
    .eq('store_id', storeId)
    .eq('tenant_id', user.id)
    .maybeSingle()

  const camContext = camAnalysis?.analysis_data
    ? `\n\nLease CAM Provisions:\n${JSON.stringify(camAnalysis.analysis_data, null, 2)}`
    : '\n\nNo CAM analysis from lease available — analyze the statement on its own.'

  // Send to Claude for reconciliation analysis
  let reconciliationData: CamReconciliationData
  try {
    const { text: result } = await generateText({
      model: anthropic('claude-sonnet-4-6'),
      maxOutputTokens: 1500,
      messages: [{
        role: 'user',
        content: `You are a CAM (Common Area Maintenance) reconciliation specialist for commercial retail tenants.

Analyze this CAM reconciliation statement and compare it against the tenant's lease provisions. Identify any potential overcharges, errors, or items that don't comply with the lease terms.
${camContext}

CAM Reconciliation Statement text:
${statementText.slice(0, 25000)}

Return ONLY valid JSON with exactly these keys:
{
  "total_billed": "string — total amount billed in the statement, e.g. $45,230.00",
  "potential_overcharges": [
    {
      "item": "name of the charge category",
      "billed_amount": "amount charged",
      "expected_amount": "what you'd expect based on lease terms (or 'N/A' if cannot determine)",
      "difference": "the overcharge amount",
      "reason": "one sentence explaining why this is a potential overcharge"
    }
  ],
  "total_potential_savings": "string — sum of all overcharge differences, e.g. $3,450.00",
  "recommendation": "string — 2-3 sentence recommendation for the tenant"
}

Common overcharge issues to look for:
- Capital improvements charged as operating expenses
- Admin fee percentage exceeding lease-specified rate
- Charges for items explicitly excluded in the lease
- Proportionate share calculated incorrectly
- Management fees above market rate
- Insurance cost increases beyond lease caps
- Charges for tenant-specific improvements billed to all tenants
- Year-over-year increases exceeding any CAM cap

If no overcharges are found, return an empty array for potential_overcharges and note in the recommendation that the statement appears compliant.`,
      }],
    })

    reconciliationData = parseAIJson<CamReconciliationData>(result)
  } catch (err) {
    console.error('[CAM Reconciliation] Claude analysis failed:', err)
    return NextResponse.json({ error: 'Analysis failed. Please try again.' }, { status: 500 })
  }

  // Store results
  try {
    await admin.from('cam_reconciliations').insert({
      store_id: storeId,
      tenant_id: user.id,
      file_name: file.name,
      reconciliation_data: reconciliationData,
    })
  } catch (err) {
    console.error('[CAM Reconciliation] DB write failed:', err)
    // Still return the data even if storage fails
  }

  return NextResponse.json({
    success: true,
    reconciliation: reconciliationData,
    file_name: file.name,
  })
}
