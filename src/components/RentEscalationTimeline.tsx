'use client'

import { useState, useEffect } from 'react'
import { Calendar, ArrowUpRight } from 'lucide-react'
import type { LeaseSummaryData } from '@/types'

interface RentEscalationTimelineProps {
  storeId: string
}

interface EscalationYear {
  year: number
  monthlyRent: number
  annualRent: number
  escalationPct: number | null
  effectiveDate: string
  isCurrent: boolean
}

function parseSummaryForEscalation(summary: LeaseSummaryData): EscalationYear[] {
  const baseRentStr = summary.base_rent_monthly
  const escalationStr = summary.rent_escalation
  const startStr = summary.lease_start_date
  const endStr = summary.lease_end_date

  if (!baseRentStr || !startStr) return []

  const baseRent = parseFloat(baseRentStr.replace(/[^0-9.-]/g, ''))
  if (isNaN(baseRent) || baseRent <= 0) return []

  // Try to parse start and end dates
  const startDate = new Date(startStr)
  const endDate = endStr ? new Date(endStr) : null
  if (isNaN(startDate.getTime())) return []

  const startYear = startDate.getFullYear()
  const endYear = endDate && !isNaN(endDate.getTime()) ? endDate.getFullYear() : startYear + 10
  const totalYears = Math.min(endYear - startYear + 1, 20)
  if (totalYears < 1) return []

  // Try to extract escalation percentage from escalation string
  let escalationPct = 0
  if (escalationStr) {
    const pctMatch = escalationStr.match(/(\d+(?:\.\d+)?)\s*%/)
    if (pctMatch) {
      escalationPct = parseFloat(pctMatch[1])
    }
  }

  const now = new Date()
  const currentYear = now.getFullYear()

  const years: EscalationYear[] = []
  let currentRent = baseRent

  for (let i = 0; i < totalYears; i++) {
    const year = startYear + i
    if (i > 0 && escalationPct > 0) {
      currentRent = currentRent * (1 + escalationPct / 100)
    }
    years.push({
      year,
      monthlyRent: Math.round(currentRent * 100) / 100,
      annualRent: Math.round(currentRent * 12 * 100) / 100,
      escalationPct: i > 0 ? escalationPct : null,
      effectiveDate: `${startDate.toLocaleString('en-US', { month: 'short' })} ${year}`,
      isCurrent: year === currentYear,
    })
  }

  return years
}

export function RentEscalationTimeline({ storeId }: RentEscalationTimelineProps) {
  const [years, setYears] = useState<EscalationYear[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const res = await fetch(`/api/lease-summary?store_id=${storeId}`)
        if (res.ok) {
          const data = await res.json()
          const summary = data.summary?.summary_data as LeaseSummaryData | null
          if (summary) {
            setYears(parseSummaryForEscalation(summary))
          }
        }
      } catch {
        // Fail silently
      } finally {
        setLoading(false)
      }
    }
    fetchSummary()
  }, [storeId])

  if (loading) {
    return (
      <div className="glass-card rounded-2xl p-6 animate-pulse space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl" style={{ background: 'rgba(255,255,255,0.06)' }} />
          <div className="space-y-1.5">
            <div className="h-3.5 w-40 rounded-md" style={{ background: 'rgba(255,255,255,0.08)' }} />
            <div className="h-2.5 w-48 rounded-md" style={{ background: 'rgba(255,255,255,0.05)' }} />
          </div>
        </div>
      </div>
    )
  }

  if (years.length === 0) return null

  return (
    <div className="glass-card rounded-2xl p-6 space-y-5">
      <div className="flex items-center gap-3">
        <div
          className="flex items-center justify-center w-9 h-9 rounded-xl shrink-0"
          style={{ background: 'rgba(59,130,246,0.10)', border: '1px solid rgba(59,130,246,0.20)' }}
        >
          <ArrowUpRight className="h-4 w-4 text-blue-400" />
        </div>
        <div>
          <p className="font-semibold text-sm">Rent Escalation Timeline</p>
          <p className="text-xs text-muted-foreground/60">Projected rent schedule over the lease term</p>
        </div>
      </div>

      <div className="space-y-1.5">
        {years.map((y) => {
          const isPast = y.year < new Date().getFullYear()
          const isFuture = y.year > new Date().getFullYear()

          return (
            <div
              key={y.year}
              className={`rounded-lg px-3 py-2 flex items-center gap-3 transition-opacity ${isPast ? 'opacity-50' : ''}`}
              style={{
                background: y.isCurrent ? 'rgba(59,130,246,0.08)' : 'rgba(255,255,255,0.02)',
                border: y.isCurrent ? '1px solid rgba(59,130,246,0.20)' : '1px solid rgba(255,255,255,0.05)',
              }}
            >
              <div className="flex items-center gap-2 w-20 shrink-0">
                <Calendar className={`h-3 w-3 ${y.isCurrent ? 'text-blue-400' : 'text-white/25'}`} />
                <span className={`text-xs font-semibold ${y.isCurrent ? 'text-blue-400' : 'text-white/60'}`}>
                  {y.year}
                </span>
              </div>
              <div className="flex-1 flex items-center justify-between gap-2">
                <span className={`text-xs ${y.isCurrent ? 'text-white/90 font-semibold' : 'text-white/70'}`}>
                  ${y.monthlyRent.toLocaleString(undefined, { minimumFractionDigits: 2 })}/mo
                </span>
                <span className="text-[11px] text-white/40">
                  ${y.annualRent.toLocaleString(undefined, { maximumFractionDigits: 0 })}/yr
                </span>
              </div>
              <div className="w-16 text-right">
                {y.escalationPct != null && y.escalationPct > 0 ? (
                  <span className="text-[10px] font-medium text-amber-400/70">+{y.escalationPct}%</span>
                ) : y.escalationPct === null ? (
                  <span className="text-[10px] text-white/20">Base</span>
                ) : null}
              </div>
              {y.isCurrent && (
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-400 border border-blue-500/25 shrink-0">
                  Current
                </span>
              )}
              {isFuture && !y.isCurrent && (
                <span className="w-[52px]" />
              )}
            </div>
          )
        })}
      </div>

      <p className="text-[10px] text-white/25 italic">
        Projected based on lease summary — actual amounts may vary.
      </p>
    </div>
  )
}
