import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase'
import { generateText } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { INJECTION_DEFENSE, sanitizeChunkContent } from '@/lib/security'
import type { CamAuditFinding } from '@/types'

export const maxDuration = 120

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { audit_id, store_id } = body

  if (!audit_id && !store_id) {
    return NextResponse.json({ error: 'audit_id or store_id required' }, { status: 400 })
  }

  const admin = createAdminSupabaseClient()

  // Fetch the audit record — try by audit_id first, fall back to most recent for store
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let audit: any = null

  if (audit_id) {
    const { data } = await admin
      .from('cam_audits')
      .select('*')
      .eq('id', audit_id)
      .eq('tenant_id', user.id)
      .maybeSingle()
    audit = data
  }

  if (!audit && store_id) {
    const { data } = await admin
      .from('cam_audits')
      .select('*')
      .eq('store_id', store_id)
      .eq('tenant_id', user.id)
      .order('audit_date', { ascending: false })
      .limit(1)
      .maybeSingle()
    audit = data
  }

  if (!audit) {
    return NextResponse.json({ error: 'Audit not found' }, { status: 404 })
  }

  const findings: CamAuditFinding[] = audit.findings as CamAuditFinding[]
  const violations = findings.filter(f => f.status === 'violation_found')

  if (violations.length === 0) {
    return NextResponse.json({ error: 'No violations found to dispute.' }, { status: 400 })
  }

  // Fetch store details
  const { data: store } = await admin
    .from('stores')
    .select('*')
    .eq('id', audit.store_id)
    .eq('tenant_id', user.id)
    .maybeSingle()

  if (!store) {
    return NextResponse.json({ error: 'Store not found' }, { status: 404 })
  }

  // Fetch lease summary for tenant/landlord names
  const { data: leaseSummary } = await admin
    .from('lease_summaries')
    .select('summary_data')
    .eq('store_id', audit.store_id)
    .eq('tenant_id', user.id)
    .maybeSingle()

  const tenantName = leaseSummary?.summary_data?.tenant_name ?? 'Tenant'
  const landlordName = leaseSummary?.summary_data?.landlord_name ?? 'Landlord'
  const propertyAddress = leaseSummary?.summary_data?.property_address ?? store.address ?? 'the premises'

  // Fetch CAM-related lease provisions for citation
  const { data: camChunks } = await admin
    .from('document_chunks')
    .select('content')
    .eq('store_id', audit.store_id)
    .eq('tenant_id', user.id)
    .ilike('content', '%common area%')
    .limit(10)

  const leaseExcerpts = (camChunks ?? []).map(c => sanitizeChunkContent(c.content)).join('\n---\n').slice(0, 8000)

  const total = Number(audit.total_potential_overcharge).toLocaleString('en-US', { minimumFractionDigits: 2 })

  try {
    const { text: letter } = await generateText({
      model: anthropic('claude-sonnet-4-6-20250514'),
      maxOutputTokens: 3000,
      messages: [{
        role: 'user',
        content: `${INJECTION_DEFENSE}Generate a professional dispute letter for a commercial tenant challenging CAM (Common Area Maintenance) overcharges. The letter should be sent from the tenant to the landlord/property manager.

TENANT LOCATION: ${store.store_name} at ${propertyAddress}
TENANT: ${tenantName}
LANDLORD: ${landlordName}
STORE/SUITE: ${store.store_name}${store.suite_number ? `, Suite ${store.suite_number}` : ''}
STATEMENT: ${audit.statement_file_name}
AUDIT FINDINGS: ${JSON.stringify(violations)}
TOTAL POTENTIAL OVERCHARGE: $${total}
${audit.dispute_deadline ? `DISPUTE DEADLINE: ${new Date(audit.dispute_deadline).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}` : ''}

${leaseExcerpts ? `RELEVANT LEASE PROVISIONS:\n${leaseExcerpts}` : ''}

The letter should:
1. Be addressed to "Property Manager / Landlord" (tenant will fill in the actual name)
2. Reference the specific lease provisions that were violated
3. Cite each violation with the rule name, estimated overcharge amount, and lease article reference
4. Request a meeting to discuss the findings within 15 business days
5. Reference the tenant's audit rights under the lease
6. Maintain a professional, firm but not adversarial tone
7. Include a deadline for response
8. Note that the tenant reserves all rights under the lease

Return the letter as plain text, properly formatted with:
- Date placeholder: [DATE]
- Sender/recipient placeholders
- Proper business letter formatting
- Re: line with the property address

Use today's date: ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}.

Return the letter as plain text (no markdown formatting).`,
      }],
    })

    return NextResponse.json({ success: true, letter })
  } catch (err) {
    console.error('[CAM Dispute Letter] Generation failed:', err)
    return NextResponse.json({ error: 'Could not generate dispute letter.' }, { status: 500 })
  }
}
