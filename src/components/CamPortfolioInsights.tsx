'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  ShieldAlert, AlertTriangle, TrendingUp, ArrowRight, Loader2,
} from 'lucide-react'

interface PatternItem {
  rule_name: string
  locations_affected: number
  total_overcharge: number
  is_systematic: boolean
}

interface LocationSummary {
  store_id: string
  store_name: string
  address: string | null
  violations_found: number
  estimated_overcharge: number
  last_audit_date: string
}

interface PortfolioInsights {
  total_locations_audited: number
  total_portfolio_overcharge: number
  patterns: PatternItem[]
  location_summaries: LocationSummary[]
}

function formatCurrency(amount: number): string {
  return '$' + amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function CamPortfolioInsights() {
  const [insights, setInsights] = useState<PortfolioInsights | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/cam-audit/portfolio')
      .then(r => r.json())
      .then(data => setInsights(data.insights ?? null))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="glass-card rounded-2xl p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-red-400/40" />
        </div>
      </div>
    )
  }

  if (!insights || insights.total_locations_audited < 2) {
    return null
  }

  const systematicPatterns = insights.patterns.filter(p => p.is_systematic)

  return (
    <div className="glass-card rounded-2xl p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div
          className="flex items-center justify-center w-9 h-9 rounded-xl shrink-0"
          style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.20)' }}
        >
          <ShieldAlert className="h-4 w-4 text-red-400" />
        </div>
        <div>
          <p className="font-semibold text-sm">CAM Audit Insights Across Your Portfolio</p>
          <p className="text-xs text-muted-foreground/60">
            {insights.total_locations_audited} location{insights.total_locations_audited !== 1 ? 's' : ''} audited
          </p>
        </div>
      </div>

      {/* Total portfolio overcharge */}
      <div
        className="rounded-xl px-5 py-4 text-center"
        style={{
          background: insights.total_portfolio_overcharge > 0
            ? 'rgba(239,68,68,0.08)'
            : 'rgba(16,185,129,0.08)',
          border: `1px solid ${insights.total_portfolio_overcharge > 0
            ? 'rgba(239,68,68,0.20)'
            : 'rgba(16,185,129,0.20)'}`,
        }}
      >
        <p className="text-[10px] font-semibold text-white/35 uppercase tracking-widest mb-1">
          Total Portfolio-Wide Potential Overcharges
        </p>
        <p className={`text-2xl font-extrabold tabular-nums ${
          insights.total_portfolio_overcharge > 0 ? 'text-red-400' : 'text-emerald-400'
        }`}>
          {formatCurrency(insights.total_portfolio_overcharge)}
        </p>
      </div>

      {/* Systematic patterns */}
      {systematicPatterns.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-semibold text-white/35 uppercase tracking-widest">
            Systematic Patterns Detected
          </p>
          {systematicPatterns.map(pattern => (
            <div
              key={pattern.rule_name}
              className="rounded-xl px-4 py-3"
              style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)' }}
            >
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-amber-300/90">{pattern.rule_name}</p>
                  <p className="text-xs text-white/50 mt-0.5">
                    Violated at {pattern.locations_affected} of {insights.total_locations_audited} locations — this may indicate a systematic billing practice
                  </p>
                  {pattern.total_overcharge > 0 && (
                    <p className="text-xs font-semibold text-red-400 mt-1">
                      {formatCurrency(pattern.total_overcharge)} total overcharge across locations
                    </p>
                  )}
                </div>
                <TrendingUp className="h-4 w-4 text-amber-400/40 shrink-0" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Location table */}
      <div className="space-y-2">
        <p className="text-[10px] font-semibold text-white/35 uppercase tracking-widest">
          By Location
        </p>
        <div className="overflow-x-auto -mx-2">
          <table className="w-full min-w-[500px] text-xs">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="text-left py-2 px-2 font-semibold text-muted-foreground/60">Location</th>
                <th className="text-center py-2 px-2 font-semibold text-muted-foreground/60">Violations</th>
                <th className="text-right py-2 px-2 font-semibold text-muted-foreground/60">Est. Overcharge</th>
                <th className="text-right py-2 px-2 font-semibold text-muted-foreground/60">Last Audit</th>
                <th className="py-2 px-2 w-8"></th>
              </tr>
            </thead>
            <tbody>
              {insights.location_summaries.map(loc => (
                <tr
                  key={loc.store_id}
                  className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors"
                >
                  <td className="py-2.5 px-2">
                    <Link
                      href={`/location/${loc.store_id}`}
                      className="text-white/80 hover:text-emerald-400 transition-colors font-medium"
                    >
                      {loc.store_name}
                    </Link>
                    {loc.address && (
                      <p className="text-[10px] text-white/30 truncate max-w-[200px]">{loc.address}</p>
                    )}
                  </td>
                  <td className="text-center py-2.5 px-2">
                    {loc.violations_found > 0 ? (
                      <span
                        className="inline-flex items-center gap-1 text-red-400 font-semibold"
                      >
                        <AlertTriangle className="h-3 w-3" />
                        {loc.violations_found}
                      </span>
                    ) : (
                      <span className="text-emerald-400">0</span>
                    )}
                  </td>
                  <td className={`text-right py-2.5 px-2 font-semibold tabular-nums ${
                    loc.estimated_overcharge > 0 ? 'text-red-400' : 'text-emerald-400'
                  }`}>
                    {formatCurrency(loc.estimated_overcharge)}
                  </td>
                  <td className="text-right py-2.5 px-2 text-white/40">
                    {new Date(loc.last_audit_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>
                  <td className="py-2.5 px-2">
                    <Link href={`/location/${loc.store_id}`}>
                      <ArrowRight className="h-3.5 w-3.5 text-white/20 hover:text-emerald-400 transition-colors" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-[10px] text-white/25 italic">
        Cross-portfolio analysis based on the most recent audit at each location.
      </p>
    </div>
  )
}
