import { NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase'
import type { CamAuditFinding } from '@/types'

export async function GET() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminSupabaseClient()

  try {
  // Fetch all CAM audits for this tenant
  const { data: audits, error } = await admin
    .from('cam_audits')
    .select('id, store_id, statement_file_name, total_potential_overcharge, findings, audit_date')
    .eq('tenant_id', user.id)
    .order('audit_date', { ascending: false })
    .limit(100)

  if (error || !audits || audits.length === 0) {
    return NextResponse.json({ insights: null })
  }

  // Fetch store details for all stores that have audits
  const storeIds = [...new Set(audits.map(a => a.store_id))]
  const { data: stores } = await admin
    .from('stores')
    .select('id, store_name, address')
    .in('id', storeIds)

  const storeMap: Record<string, { store_name: string; address: string | null }> = {}
  for (const s of stores ?? []) {
    storeMap[s.id] = { store_name: s.store_name, address: s.address }
  }

  // Use only the latest audit per store
  const latestByStore = new Map<string, typeof audits[0]>()
  for (const audit of audits) {
    if (!latestByStore.has(audit.store_id)) {
      latestByStore.set(audit.store_id, audit)
    }
  }
  const latestAudits = Array.from(latestByStore.values())

  // Aggregate findings across locations
  const ruleViolationCounts: Record<string, { count: number; totalOvercharge: number; storeIds: Set<string> }> = {}
  let totalOverchargePortfolio = 0
  const locationSummaries: Array<{
    store_id: string
    store_name: string
    address: string | null
    violations_found: number
    estimated_overcharge: number
    last_audit_date: string
  }> = []

  for (const audit of latestAudits) {
    const findings: CamAuditFinding[] = audit.findings as CamAuditFinding[]
    const violations = findings.filter(f => f.status === 'violation_found')
    const overcharge = Number(audit.total_potential_overcharge) || 0
    totalOverchargePortfolio += overcharge

    const store = storeMap[audit.store_id]
    locationSummaries.push({
      store_id: audit.store_id,
      store_name: store?.store_name ?? 'Unknown',
      address: store?.address ?? null,
      violations_found: violations.length,
      estimated_overcharge: overcharge,
      last_audit_date: audit.audit_date,
    })

    for (const v of violations) {
      if (!ruleViolationCounts[v.rule_name]) {
        ruleViolationCounts[v.rule_name] = { count: 0, totalOvercharge: 0, storeIds: new Set() }
      }
      ruleViolationCounts[v.rule_name].count++
      ruleViolationCounts[v.rule_name].totalOvercharge += v.estimated_overcharge
      ruleViolationCounts[v.rule_name].storeIds.add(audit.store_id)
    }
  }

  // Build pattern insights — rules violated at multiple locations
  const totalLocations = latestAudits.length
  const patterns = Object.entries(ruleViolationCounts)
    .map(([rule_name, data]) => ({
      rule_name,
      locations_affected: data.storeIds.size,
      total_overcharge: data.totalOvercharge,
      is_systematic: data.storeIds.size >= 2,
    }))
    .sort((a, b) => b.locations_affected - a.locations_affected || b.total_overcharge - a.total_overcharge)

  // Sort locations by overcharge descending
  locationSummaries.sort((a, b) => b.estimated_overcharge - a.estimated_overcharge)

  return NextResponse.json({
    insights: {
      total_locations_audited: totalLocations,
      total_portfolio_overcharge: totalOverchargePortfolio,
      patterns,
      location_summaries: locationSummaries,
    },
  })
  } catch (error) {
    console.error('[CAM Portfolio] Error:', error)
    return NextResponse.json({ insights: null })
  }
}
