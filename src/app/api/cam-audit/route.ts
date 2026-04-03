import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase'
import { generateText } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { keywordSearchChunks } from '@/lib/vectorStore'
import { parseAIJson } from '@/lib/parseAIJson'
import { isRateLimited } from '@/lib/rateLimit'
import { INJECTION_DEFENSE, sanitizeChunkContent, verifyPDFHeader } from '@/lib/security'
import type { CamAuditFinding } from '@/types'

export const maxDuration = 120

const CAM_AUDIT_KEYWORDS = [
  'common area maintenance', 'CAM', 'management fee', 'admin fee',
  'proportionate share', 'pro rata', 'gross up', 'grossed up',
  'cam cap', 'controllable expense', 'uncontrollable', 'base year',
  'estimated payment', 'reconciliation', 'true-up', 'true up',
  'operating expense', 'pass-through', 'insurance', 'tax', 'real estate tax',
  'utility', 'common area', 'capital improvement', 'overhead',
  'excluded', 'included', 'audit', 'landlord overhead',
]

const AUDIT_SYSTEM_PROMPT = `You are a CAM (Common Area Maintenance) forensic auditor specializing in commercial retail leases. You have deep expertise in identifying overcharges, calculation errors, and lease violations in annual CAM reconciliation statements.

You will be given:
1. The tenant's lease provisions related to CAM charges
2. An annual CAM reconciliation statement from the landlord

Run ALL 14 detection rules below and report findings for each one.

MATH-BASED RULES:
1. Management Fee Overcharge — Check if the management/admin fee percentage charged exceeds what the lease allows. Common: lease says 15% but landlord charges 18%.
2. Pro-Rata Share Error — Verify the tenant's proportionate share calculation (tenant sq ft ÷ total leasable sq ft). Check if the denominator uses the correct total area.
3. Gross-Up Violation — If the lease requires gross-up (adjusting expenses as if building were fully occupied), verify it was applied correctly. Some landlords gross up AND charge actual vacancy costs.
4. CAM Cap Violation — If the lease has a cap on annual CAM increases (e.g., 5% per year), check if the increase exceeds the cap.
5. Base Year Error — For leases using a base year/expense stop method, verify the base year amount is correct and the tenant is only charged for amounts above the stop.
6. Controllable Expense Cap Overcharge — Check if controllable expenses exceed any separate cap in the lease.
7. Estimated Payment True-Up Error — Verify the math on estimated vs. actual payments, credits, and amounts due.

CLASSIFICATION (AI-ANALYZED) RULES:
8. Gross Lease Charges — If the lease is gross or modified gross, flag any charges that should be included in base rent, not billed separately.
9. Excluded Service Charges — Identify any charges for services explicitly excluded from CAM in the lease.
10. Insurance Overcharge — Check if insurance charges include items not permitted by the lease, or if increases exceed any caps.
11. Tax Overallocation — Verify real estate tax charges match the tenant's pro-rata share and don't include taxes for other properties.
12. Utility Overcharge — Check if utility charges are calculated correctly per the lease (sub-metered vs. pro-rata).
13. Common Area Misclassification — Identify charges for areas or services that don't qualify as "common area" under the lease definition.
14. Landlord Overhead Pass-Through — Flag any landlord corporate overhead, salaries, or off-site costs passed through as CAM that the lease doesn't permit.

For EACH rule, return:
- rule_name: The rule name exactly as listed above
- status: "violation_found" | "within_limits" | "insufficient_data"
- estimated_overcharge: Dollar amount (number, 0 if no overcharge or can't determine)
- explanation: 2-3 sentences explaining what you found or why data was insufficient
- lease_reference: The specific lease article/section relevant to this rule, or null
- statement_reference: The specific line item or section in the statement, or null

Return ONLY valid JSON:
{
  "findings": [...],
  "dispute_deadline_days": number or null (days from statement date the tenant has to dispute, based on lease audit window)
}`

// GET — retrieve existing audit results
export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const storeId = request.nextUrl.searchParams.get('store_id')
  if (!storeId) return NextResponse.json({ error: 'store_id required' }, { status: 400 })

  const { data, error } = await supabase
    .from('cam_audits')
    .select('*')
    .eq('store_id', storeId)
    .eq('tenant_id', user.id)
    .order('audit_date', { ascending: false })
    .limit(10)

  if (error) return NextResponse.json({ audits: [] })
  return NextResponse.json({ audits: data ?? [] })
}

// POST — run forensic audit or generate dispute letter
export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (isRateLimited(user.id, 'cam-audit')) {
    return NextResponse.json({ error: 'Please wait before running another audit.' }, { status: 429 })
  }

  const contentType = request.headers.get('content-type') ?? ''

  // Dispatch: JSON body = dispute letter, FormData = forensic audit
  if (contentType.includes('application/json')) {
    return handleDisputeLetter(request, user.id)
  }

  return handleForensicAudit(request, user.id)
}

// ── Forensic Audit ──────────────────────────────────────────────────────────

async function handleForensicAudit(request: NextRequest, userId: string) {
  const supabase = await createServerSupabaseClient()
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
    .from('stores').select('id').eq('id', storeId).eq('tenant_id', userId).maybeSingle()
  if (!store) return NextResponse.json({ error: 'Store not found' }, { status: 404 })

  // Verify PDF and extract text
  const arrayBuffer = await file.arrayBuffer()
  if (!verifyPDFHeader(arrayBuffer)) {
    return NextResponse.json({ error: 'File is not a valid PDF document.' }, { status: 400 })
  }

  let statementText: string
  try {
    const buffer = Buffer.from(arrayBuffer)
    const pdfParse = (await import('pdf-parse')).default
    const result = await pdfParse(buffer)
    statementText = result.text
  } catch (err) {
    console.error('[CAM Audit] PDF extraction failed:', err)
    return NextResponse.json({ error: 'Could not extract text from PDF' }, { status: 422 })
  }

  if (!statementText || statementText.trim().length < 50) {
    return NextResponse.json({ error: 'Could not extract meaningful text from the uploaded file' }, { status: 422 })
  }

  // Gather lease CAM provisions via keyword search
  const admin = createAdminSupabaseClient()
  const searchResults = await Promise.all(
    CAM_AUDIT_KEYWORDS.map(kw =>
      keywordSearchChunks(kw, userId, 6, storeId).catch(() => [])
    )
  )

  const seen = new Set<string>()
  const leaseChunks: string[] = []
  for (const batch of searchResults) {
    for (const chunk of batch) {
      if (!seen.has(chunk.id)) {
        seen.add(chunk.id)
        leaseChunks.push(chunk.content)
      }
    }
  }

  // Fallback: grab chunks directly
  if (leaseChunks.length < 5) {
    const { data: rawChunks } = await admin
      .from('document_chunks').select('content')
      .eq('store_id', storeId).eq('tenant_id', userId)
      .order('created_at', { ascending: true })
      .limit(60)

    for (const c of rawChunks ?? []) {
      if (leaseChunks.length < 60) leaseChunks.push(c.content)
    }
  }

  // Also fetch existing CAM analysis for extra context
  const { data: camAnalysis } = await admin
    .from('cam_analysis').select('analysis_data')
    .eq('store_id', storeId).eq('tenant_id', userId).maybeSingle()

  const camSummary = camAnalysis?.analysis_data
    ? `\n\nExtracted CAM Lease Provisions Summary:\n${JSON.stringify(camAnalysis.analysis_data, null, 2)}`
    : ''

  // Run forensic audit via Claude
  try {
    const { text } = await generateText({
      model: anthropic('claude-sonnet-4-6-20250514'),
      maxOutputTokens: 6000,
      messages: [{
        role: 'user',
        content: `${INJECTION_DEFENSE}${AUDIT_SYSTEM_PROMPT}
${camSummary}

LEASE EXCERPTS (CAM-related provisions):
${leaseChunks.slice(0, 40).map(c => sanitizeChunkContent(c)).join('\n\n---\n\n').slice(0, 25000)}

CAM RECONCILIATION STATEMENT:
${sanitizeChunkContent(statementText.slice(0, 25000))}`,
      }],
    })

    const parsed = parseAIJson<{ findings?: CamAuditFinding[]; dispute_deadline_days?: number }>(text)
    const findings: CamAuditFinding[] = (parsed.findings ?? []).map((f: CamAuditFinding) => ({
      rule_name: f.rule_name,
      status: f.status,
      estimated_overcharge: Number(f.estimated_overcharge) || 0,
      explanation: f.explanation,
      lease_reference: f.lease_reference || null,
      statement_reference: f.statement_reference || null,
    }))

    const totalOvercharge = findings.reduce((sum, f) => sum + f.estimated_overcharge, 0)

    // Calculate dispute deadline
    let disputeDeadline: string | null = null
    const deadlineDays = parsed.dispute_deadline_days
    if (deadlineDays && typeof deadlineDays === 'number') {
      const deadline = new Date()
      deadline.setDate(deadline.getDate() + deadlineDays)
      disputeDeadline = deadline.toISOString()
    }

    // Store results
    try {
      await admin.from('cam_audits').insert({
        store_id: storeId,
        tenant_id: userId,
        statement_file_name: file.name,
        total_potential_overcharge: totalOvercharge,
        findings,
        audit_date: new Date().toISOString(),
        dispute_deadline: disputeDeadline,
      })
    } catch (dbErr) {
      console.error('[CAM Audit] DB write failed:', dbErr)
    }

    return NextResponse.json({
      success: true,
      audit: {
        statement_file_name: file.name,
        total_potential_overcharge: totalOvercharge,
        findings,
        audit_date: new Date().toISOString(),
        dispute_deadline: disputeDeadline,
      },
    })
  } catch (err) {
    console.error('[CAM Audit] Analysis failed:', err)
    return NextResponse.json({ error: 'Forensic audit failed. Please try again.' }, { status: 500 })
  }
}

// ── Dispute Letter Generation ───────────────────────────────────────────────

async function handleDisputeLetter(request: NextRequest, userId: string) {
  const supabase = await createServerSupabaseClient()
  const body = await request.json()
  const { store_id, audit_id } = body

  if (!store_id) {
    return NextResponse.json({ error: 'store_id required' }, { status: 400 })
  }

  // Verify store belongs to user
  const { data: store } = await supabase
    .from('stores').select('*').eq('id', store_id).eq('tenant_id', userId).maybeSingle()
  if (!store) return NextResponse.json({ error: 'Store not found' }, { status: 404 })

  // Fetch the audit result
  const admin = createAdminSupabaseClient()
  let auditQuery = admin
    .from('cam_audits')
    .select('*')
    .eq('store_id', store_id)
    .eq('tenant_id', userId)

  if (audit_id) {
    auditQuery = auditQuery.eq('id', audit_id)
  } else {
    auditQuery = auditQuery.order('audit_date', { ascending: false }).limit(1)
  }

  const { data: audits } = await auditQuery
  const audit = audits?.[0]

  if (!audit) {
    return NextResponse.json({ error: 'No audit found. Run a forensic audit first.' }, { status: 404 })
  }

  const findings: CamAuditFinding[] = audit.findings as CamAuditFinding[]
  const violations = findings.filter(f => f.status === 'violation_found')

  if (violations.length === 0) {
    return NextResponse.json({ error: 'No violations found to dispute.' }, { status: 400 })
  }

  // Fetch lease summary for tenant/landlord names
  const { data: leaseSummary } = await admin
    .from('lease_summaries').select('summary_data')
    .eq('store_id', store_id).eq('tenant_id', userId).maybeSingle()

  const tenantName = leaseSummary?.summary_data?.tenant_name ?? 'Tenant'
  const landlordName = leaseSummary?.summary_data?.landlord_name ?? 'Landlord'
  const propertyAddress = leaseSummary?.summary_data?.property_address ?? store.address ?? 'the premises'

  try {
    const { text: letter } = await generateText({
      model: anthropic('claude-sonnet-4-6-20250514'),
      maxOutputTokens: 3000,
      messages: [{
        role: 'user',
        content: `${INJECTION_DEFENSE}Write a professional dispute letter from the tenant to the landlord regarding CAM reconciliation overcharges.

Tenant: ${tenantName}
Landlord: ${landlordName}
Property: ${propertyAddress}
Store/Suite: ${store.store_name}${store.suite_number ? `, Suite ${store.suite_number}` : ''}
Statement: ${audit.statement_file_name}
Total Potential Overcharge: $${Number(audit.total_potential_overcharge).toLocaleString('en-US', { minimumFractionDigits: 2 })}
${audit.dispute_deadline ? `Dispute Deadline: ${new Date(audit.dispute_deadline).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}` : ''}

Violations Found:
${violations.map((v, i) => `${i + 1}. ${v.rule_name}: $${v.estimated_overcharge.toLocaleString('en-US', { minimumFractionDigits: 2 })} overcharge
   - ${v.explanation}
   ${v.lease_reference ? `- Lease Reference: ${v.lease_reference}` : ''}
   ${v.statement_reference ? `- Statement Reference: ${v.statement_reference}` : ''}`).join('\n')}

Write a formal, professional letter that:
1. References the specific lease provisions being violated
2. Lists each overcharge with dollar amounts
3. Requests a detailed accounting and correction
4. Notes the tenant's right to audit under the lease
5. Sets a 30-day response deadline
6. Is firm but professional — not adversarial

Format as a complete business letter with date, addresses, subject line, body, and signature block. Use today's date: ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}.

Return the letter as plain text (no markdown formatting).`,
      }],
    })

    return NextResponse.json({ success: true, letter })
  } catch (err) {
    console.error('[CAM Audit] Dispute letter generation failed:', err)
    return NextResponse.json({ error: 'Could not generate dispute letter.' }, { status: 500 })
  }
}
