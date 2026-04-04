'use client'

import { useState, useEffect } from 'react'
import { ArrowUpRight } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
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

function formatCurrency(amount: number): string {
  return '$' + amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
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
      <div className="glass-card p-6 animate-pulse space-y-3">
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

  const baseAnnualRent = years[0].annualRent

  const chartData = years.map((y) => ({
    year: y.year.toString(),
    annualRent: y.annualRent,
  }))

  return (
    <div className="glass-card p-6 space-y-5">
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
          className="rounded-lg px-3.5 py-2.5 text-xs text-gray-100 leading-relaxed"
          style={{ background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.12)' }}
        >
          {description}
          {article && (
            <span className="ml-1.5 text-[10px] text-gray-400">
              &mdash; {article}
            </span>
          )}
        </div>
      )}

      {/* Rent escalation table */}
      <div className="overflow-x-auto rounded-xl" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
        <table className="w-full" style={{ fontSize: '14px' }}>
          <thead>
            <tr style={{ background: 'rgba(255,255,255,0.06)' }}>
              <th className="text-left px-4 py-3 font-semibold text-white/70 text-sm">Year</th>
              <th className="text-right px-4 py-3 font-semibold text-white/70 text-sm">Annual Rent</th>
              <th className="text-right px-4 py-3 font-semibold text-white/70 text-sm">Monthly Rent</th>
              <th className="text-right px-4 py-3 font-semibold text-white/70 text-sm">Increase %</th>
              <th className="text-right px-4 py-3 font-semibold text-white/70 text-sm">Cumulative</th>
            </tr>
          </thead>
          <tbody>
            {years.map((y, i) => {
              const cumulative = i === 0 ? 0 : ((y.annualRent - baseAnnualRent) / baseAnnualRent * 100)
              return (
                <tr
                  key={y.year}
                  style={{
                    background: y.isCurrent
                      ? 'rgba(16,185,129,0.08)'
                      : i % 2 === 1
                        ? 'rgba(255,255,255,0.03)'
                        : 'transparent',
                  }}
                >
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className={`font-semibold ${y.isCurrent ? 'text-emerald-400' : 'text-white/80'}`}>
                        {y.year}
                      </span>
                      {y.isCurrent && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
                          Current
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="text-right px-4 py-2.5 font-medium text-white/80 tabular-nums">
                    {formatCurrency(y.annualRent)}
                  </td>
                  <td className="text-right px-4 py-2.5 text-white/60 tabular-nums">
                    {formatCurrency(y.monthlyRent)}
                  </td>
                  <td className="text-right px-4 py-2.5">
                    {y.escalationPct != null && y.escalationPct > 0
                      ? <span className="text-amber-400 font-medium">+{y.escalationPct.toFixed(1)}%</span>
                      : <span className="text-white/30">&mdash;</span>}
                  </td>
                  <td className="text-right px-4 py-2.5">
                    {i === 0
                      ? <span className="text-white/30">&mdash;</span>
                      : <span className="text-blue-400 font-medium">+{cumulative.toFixed(1)}%</span>}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Rent over time chart */}
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
            <defs>
              <linearGradient id="rentGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="rgb(16,185,129)" stopOpacity={0.25} />
                <stop offset="95%" stopColor="rgb(16,185,129)" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis
              dataKey="year"
              tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }}
              axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
              tickLine={false}
            />
            <YAxis
              tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`}
              tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }}
              axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                background: 'rgba(15,17,25,0.95)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: '8px',
                fontSize: '13px',
              }}
              formatter={(value) => [formatCurrency(Number(value)), 'Annual Rent']}
              labelStyle={{ color: 'rgba(255,255,255,0.7)' }}
            />
            <Area
              type="monotone"
              dataKey="annualRent"
              stroke="rgb(16,185,129)"
              fill="url(#rentGradient)"
              strokeWidth={2}
              dot={{ r: 3, fill: 'rgb(16,185,129)', strokeWidth: 0 }}
              activeDot={{ r: 5, fill: 'rgb(16,185,129)', stroke: 'rgba(16,185,129,0.3)', strokeWidth: 4 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <p className="text-[10px] text-white/50 italic">
        Projected based on lease summary &mdash; actual amounts may vary.
      </p>
    </div>
  )
}
