import { NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase'

// ── Simple in-memory cache (5-minute TTL) ────────────────────────────────────
const cache = new Map<string, { data: PortfolioData; ts: number }>()
const CACHE_TTL = 5 * 60 * 1000

interface PortfolioLocation {
  id: string
  store_name: string
  shopping_center_name: string | null
  address: string | null
  risk_score: number | null
  lease_expiry: string | null
  years_remaining: number | null
  monthly_rent: number | null
  annual_rent: number | null
  square_footage: number | null
  rent_per_sf: number | null
  document_count: number
  top_risk: string | null
  clause_scores: Array<{
    clause: string
    category: string
    severity: 'red' | 'yellow' | 'green'
    summary: string
  }>
}

interface PortfolioCriticalDate {
  date_type: string
  date_value: string
  description: string
  store_name: string
  store_id: string
}

interface PortfolioData {
  total_locations: number
  locations: PortfolioLocation[]
  upcoming_critical_dates: PortfolioCriticalDate[]
  average_risk_score: number | null
  total_annual_rent: number | null
  total_square_footage: number | null
}

function parseRent(rentStr: string | null): number | null {
  if (!rentStr) return null
  // Extract numeric value from strings like "$12,500/month" or "$12,500.00"
  const match = rentStr.replace(/,/g, '').match(/[\d.]+/)
  if (!match) return null
  const val = parseFloat(match[0])
  return isNaN(val) ? null : val
}

function parseSqFt(sqftStr: string | null): number | null {
  if (!sqftStr) return null
  const match = sqftStr.replace(/,/g, '').match(/[\d.]+/)
  if (!match) return null
  const val = parseFloat(match[0])
  return isNaN(val) ? null : val
}

export async function GET() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Check cache
  const cached = cache.get(user.id)
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return NextResponse.json(cached.data)
  }

  const admin = createAdminSupabaseClient()

  // Fetch all data in parallel
  const [storesRes, docsRes, summariesRes, risksRes, datesRes, camRes] = await Promise.all([
    admin.from('stores').select('id, store_name, shopping_center_name, address').eq('tenant_id', user.id).order('created_at', { ascending: true }),
    admin.from('documents').select('store_id').eq('tenant_id', user.id).not('store_id', 'is', null),
    admin.from('lease_summaries').select('store_id, summary_data').eq('tenant_id', user.id),
    admin.from('lease_risk_scores').select('store_id, overall_score, clause_scores').eq('tenant_id', user.id),
    admin.from('critical_dates').select('date_type, date_value, description, store_id').eq('tenant_id', user.id),
    admin.from('cam_analysis').select('store_id, analysis_data').eq('tenant_id', user.id),
  ])

  const stores = storesRes.data ?? []
  const docs = docsRes.data ?? []
  const summaries = summariesRes.data ?? []
  const risks = risksRes.data ?? []
  const dates = datesRes.data ?? []
  const _cam = camRes.data ?? []

  // Build lookup maps
  const docCountMap: Record<string, number> = {}
  for (const d of docs) {
    if (d.store_id) docCountMap[d.store_id] = (docCountMap[d.store_id] ?? 0) + 1
  }

  const summaryMap: Record<string, { lease_end_date?: string | null; base_rent_monthly?: string | null; square_footage?: string | null }> = {}
  for (const s of summaries) {
    summaryMap[s.store_id] = s.summary_data ?? {}
  }

  const riskMap: Record<string, { overall_score: number; clause_scores: Array<{ clause: string; category: string; severity: 'red' | 'yellow' | 'green'; summary: string }> }> = {}
  for (const r of risks) {
    riskMap[r.store_id] = { overall_score: r.overall_score, clause_scores: r.clause_scores ?? [] }
  }

  // Store name lookup for critical dates
  const storeNameMap: Record<string, string> = {}
  for (const s of stores) storeNameMap[s.id] = s.store_name

  // Build locations
  const now = new Date()
  const locations: PortfolioLocation[] = stores.map(store => {
    const summary = summaryMap[store.id] ?? {}
    const risk = riskMap[store.id]
    const monthlyRent = parseRent(summary.base_rent_monthly ?? null)
    const sqft = parseSqFt(summary.square_footage ?? null)
    const annualRent = monthlyRent != null ? monthlyRent * 12 : null
    const rentPerSf = annualRent != null && sqft != null && sqft > 0 ? annualRent / sqft : null

    let yearsRemaining: number | null = null
    const leaseExpiry = summary.lease_end_date ?? null
    if (leaseExpiry) {
      const expiryDate = new Date(leaseExpiry)
      yearsRemaining = Math.round(((expiryDate.getTime() - now.getTime()) / (365.25 * 24 * 60 * 60 * 1000)) * 10) / 10
    }

    // Top risk: first red clause, or first yellow clause
    let topRisk: string | null = null
    if (risk?.clause_scores?.length) {
      const redClause = risk.clause_scores.find(c => c.severity === 'red')
      const yellowClause = risk.clause_scores.find(c => c.severity === 'yellow')
      topRisk = (redClause ?? yellowClause)?.clause ?? null
    }

    return {
      id: store.id,
      store_name: store.store_name,
      shopping_center_name: store.shopping_center_name,
      address: store.address,
      risk_score: risk?.overall_score ?? null,
      lease_expiry: leaseExpiry,
      years_remaining: yearsRemaining,
      monthly_rent: monthlyRent,
      annual_rent: annualRent,
      square_footage: sqft,
      rent_per_sf: rentPerSf != null ? Math.round(rentPerSf * 100) / 100 : null,
      document_count: docCountMap[store.id] ?? 0,
      top_risk: topRisk,
      clause_scores: risk?.clause_scores ?? [],
    }
  })

  // Critical dates — sorted by nearest first
  const criticalDates: PortfolioCriticalDate[] = dates
    .filter(d => d.date_value)
    .map(d => ({
      date_type: d.date_type,
      date_value: d.date_value!,
      description: d.description,
      store_name: storeNameMap[d.store_id] ?? 'Unknown',
      store_id: d.store_id,
    }))
    .sort((a, b) => new Date(a.date_value).getTime() - new Date(b.date_value).getTime())

  // Aggregations
  const scoredLocations = locations.filter(l => l.risk_score != null)
  const averageRisk = scoredLocations.length > 0
    ? Math.round(scoredLocations.reduce((sum, l) => sum + l.risk_score!, 0) / scoredLocations.length)
    : null

  const totalAnnualRent = locations.reduce((sum, l) => sum + (l.annual_rent ?? 0), 0) || null
  const totalSqFt = locations.reduce((sum, l) => sum + (l.square_footage ?? 0), 0) || null

  const result: PortfolioData = {
    total_locations: stores.length,
    locations,
    upcoming_critical_dates: criticalDates,
    average_risk_score: averageRisk,
    total_annual_rent: totalAnnualRent,
    total_square_footage: totalSqFt,
  }

  // Cache it
  cache.set(user.id, { data: result, ts: Date.now() })

  return NextResponse.json(result)
}
