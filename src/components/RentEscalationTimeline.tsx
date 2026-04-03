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

function buildYearsFromSchedule(
  schedule: Record<string, unknown>,
  summary: Record<string, unknown>
): EscalationYear[] {
  const currentYear = new Date().getFullYear()

  // Parse start/end from summary for date range
  const startStr = summary.lease_start_date as string | undefined
  const endStr = summary.lease_end_date as string | undefined
  const baseRentStr = summary.base_rent_monthly as string | undefined

  const startDate = startStr ? new Date(startStr) : null
  const endDate = endStr ? new Date(endStr) : null
  const startYear = startDate && !isNaN(startDate.getTime()) ? startDate.getFullYear() : currentYear
  const endYear = endDate && !isNaN(endDate.getTime()) ? endDate.getFullYear() : startYear + 10

  const baseRent = baseRentStr ? parseFloat(String(baseRentStr).replace(/[^0-9.-]/g, '')) : 0

  const type = schedule.type as string

  // Step schedule — use steps directly
  if (type === 'step_schedule' && Array.isArray(schedule.steps)) {
    const steps = schedule.steps as { year?: number; monthly_rent?: number; effective_date?: string }[]
    return steps.map((step, i) => {
      const year = step.year || (startYear + i)
      return {
        year,
        monthlyRent: step.monthly_rent || 0,
        annualRent: (step.monthly_rent || 0) * 12,
        escalationPct: null,
        effectiveDate: step.effective_date || '',
        isCurrent: year === currentYear,
      }
    })
  }

  // Percentage or fixed_amount — compute year over year
  const totalYears = Math.min(endYear - startYear + 1, 20)
  if (totalYears < 1 || baseRent <= 0) return []

  const annualPct = typeof schedule.annual_percentage === 'number' ? schedule.annual_percentage : 0
  const fixedIncrease = typeof schedule.annual_fixed_increase === 'number' ? schedule.annual_fixed_increase : 0

  const years: EscalationYear[] = []
  let rent = baseRent

  for (let i = 0; i < totalYears; i++) {
    const year = startYear + i
    if (i > 0) {
      if (type === 'fixed_amount' && fixedIncrease > 0) {
        rent = rent + fixedIncrease
      } else if (annualPct > 0) {
        rent = rent * (1 + annualPct / 100)
      }
    }
    const pct = i > 0 && annualPct > 0 ? annualPct : null
    years.push({
      year,
      monthlyRent: Math.round(rent * 100) / 100,
      annualRent: Math.round(rent * 12 * 100) / 100,
      escalationPct: pct,
      effectiveDate: startDate
        ? `${startDate.toLocaleString('en-US', { month: 'short' })} ${year}`
        : `${year}`,
      isCurrent: year === currentYear,
    })
  }

  return years
}

export function RentEscalationTimeline({ storeId }: RentEscalationTimelineProps) {
  const [years, setYears] = useState<EscalationYear[]>([])
  const [loading, setLoading] = useState(true)
  const [description, setDescription] = useState<string | null>(null)
  const [article, setArticle] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`/api/rent-escalation?store_id=${storeId}`)
        if (res.ok) {
          const data = await res.json()
          if (data.schedule && data.summary) {
            const built = buildYearsFromSchedule(data.schedule, data.summary)
            if (built.length > 0) {
              setYears(built)
            } else if (data.summary) {
              setYears(parseSummaryForEscalation(data.summary as LeaseSummaryData))
            }
          } else if (data.summary) {
            setYears(parseSummaryForEscalation(data.summary as LeaseSummaryData))
          }
          if (data.schedule?.description) setDescription(data.schedule.description)
          if (data.schedule?.article) setArticle(data.schedule.article)
        }
      } catch {
        // Fall back to lease summary only
        try {
          const res = await fetch(`/api/lease-summary?store_id=${storeId}`)
          if (res.ok) {
            const data = await res.json()
            const summary = data.summary?.summary_data as LeaseSummaryData | null
            if (summary) setYears(parseSummaryForEscalation(summary))
          }
        } catch {
          // Fail silently
        }
      } finally {
        setLoading(false)
      }
    }
    fetchData()
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

  const maxRent = Math.max(...years.map((y) => y.monthlyRent))

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
          <p className="text-xs text-white/60">Projected rent schedule over the lease term</p>
        </div>
      </div>

      {/* Escalation description */}
      {(description || article) && (
        <div
          className="rounded-lg px-3.5 py-2.5 text-xs text-white/85 leading-relaxed"
          style={{ background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.12)' }}
        >
          {description}
          {article && (
            <span className="ml-1.5 text-[10px] text-white/55">
              — {article}
            </span>
          )}
        </div>
      )}

      <div className="space-y-1.5">
        {years.map((y, i) => {
          const isPast = y.year < new Date().getFullYear()

          return (
            <div
              key={y.year}
              className={`rounded-lg px-4 py-3 flex items-center gap-4 transition-all ${isPast ? 'opacity-65' : ''}`}
              style={{
                background: y.isCurrent ? 'rgba(16,185,129,0.10)' : 'rgba(255,255,255,0.03)',
                border: y.isCurrent ? '1px solid rgba(16,185,129,0.22)' : '1px solid rgba(255,255,255,0.06)',
              }}
            >
              {/* Year label */}
              <div className="w-12 shrink-0 text-center">
                <span className={`text-xs font-bold ${y.isCurrent ? 'text-emerald-400' : 'text-gray-200'}`}>
                  {y.year}
                </span>
              </div>

              {/* Visual bar */}
              <div className="flex-1 min-w-0">
                <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)' }}>
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${maxRent > 0 ? (y.monthlyRent / maxRent) * 100 : 100}%`,
                      background: y.isCurrent
                        ? 'linear-gradient(90deg, rgba(16,185,129,0.6), rgba(16,185,129,0.9))'
                        : 'linear-gradient(90deg, rgba(255,255,255,0.12), rgba(255,255,255,0.22))',
                    }}
                  />
                </div>
              </div>

              {/* Amounts */}
              <div className="text-right shrink-0 w-32">
                <span className={`text-xs font-semibold ${y.isCurrent ? 'text-white' : 'text-white/90'}`}>
                  ${y.monthlyRent.toLocaleString(undefined, { minimumFractionDigits: 2 })}/mo
                </span>
                <span className="text-[10px] text-white/60 ml-2">
                  ${y.annualRent.toLocaleString(undefined, { maximumFractionDigits: 0 })}/yr
                </span>
              </div>

              {/* Change indicator */}
              <div className="w-14 text-right shrink-0">
                {y.escalationPct != null && y.escalationPct > 0 ? (
                  <span className="text-[10px] font-medium text-amber-400/80">+{y.escalationPct}%</span>
                ) : y.escalationPct === null && i > 0 ? (
                  <span className="text-[10px] text-white/50">&mdash;</span>
                ) : (
                  <span className="text-[10px] text-white/60">Base</span>
                )}
              </div>

              {/* Current badge */}
              {y.isCurrent && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 shrink-0">
                  Current
                </span>
              )}
            </div>
          )
        })}
      </div>

      <p className="text-[10px] text-white/50 italic">
        Projected based on lease summary — actual amounts may vary.
      </p>
    </div>
  )
}
