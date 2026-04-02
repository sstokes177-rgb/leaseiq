'use client'

import { useState, useEffect } from 'react'
import { Loader2, RefreshCw, TrendingUp, Plus, DollarSign } from 'lucide-react'
import type { PercentageRentConfig, PercentageRentEntry } from '@/types'

interface PercentageRentCardProps {
  storeId: string
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function PercentageRentCard({ storeId }: PercentageRentCardProps) {
  const [config, setConfig] = useState<PercentageRentConfig | null>(null)
  const [entries, setEntries] = useState<PercentageRentEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [formMonth, setFormMonth] = useState(new Date().getMonth() + 1)
  const [formYear, setFormYear] = useState(new Date().getFullYear())
  const [formSales, setFormSales] = useState('')

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/percentage-rent?store_id=${storeId}`)
      if (res.ok) {
        const data = await res.json()
        setConfig(data.config ?? null)
        setEntries(data.entries ?? [])
      }
    } catch {
      // Fail silently
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [storeId]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleExtract = async () => {
    setGenerating(true)
    setError(null)
    try {
      const res = await fetch('/api/percentage-rent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ store_id: storeId }),
      })
      const data = await res.json()
      if (res.ok) {
        await fetchData()
      } else {
        setError(data.error ?? 'Could not extract percentage rent terms.')
      }
    } catch {
      setError('Network error.')
    } finally {
      setGenerating(false)
    }
  }

  const handleSaveEntry = async () => {
    if (!formSales) return
    setSaving(true)
    try {
      const res = await fetch('/api/percentage-rent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          store_id: storeId,
          action: 'save_entry',
          month: formMonth,
          year: formYear,
          gross_sales: parseFloat(formSales.replace(/[,$]/g, '')),
        }),
      })
      if (res.ok) {
        setFormSales('')
        setShowForm(false)
        await fetchData()
      }
    } catch {
      // Fail silently
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="glass-card rounded-2xl p-6 animate-pulse space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl" style={{ background: 'rgba(255,255,255,0.06)' }} />
          <div className="space-y-1.5">
            <div className="h-3.5 w-36 rounded-md" style={{ background: 'rgba(255,255,255,0.08)' }} />
            <div className="h-2.5 w-48 rounded-md" style={{ background: 'rgba(255,255,255,0.05)' }} />
          </div>
        </div>
      </div>
    )
  }

  if (!config) {
    return (
      <div className="glass-card rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div
            className="flex items-center justify-center w-9 h-9 rounded-xl shrink-0"
            style={{ background: 'rgba(168,85,247,0.10)', border: '1px solid rgba(168,85,247,0.20)' }}
          >
            <TrendingUp className="h-4 w-4 text-purple-400" />
          </div>
          <div>
            <p className="font-semibold text-sm">Percentage Rent Tracker</p>
            <p className="text-xs text-muted-foreground/80">Track sales against your breakpoint</p>
          </div>
        </div>
        {error && <p className="text-xs text-red-400/80 mb-3">{error}</p>}
        <button
          onClick={handleExtract}
          disabled={generating}
          className="flex items-center gap-2 text-sm font-medium text-purple-400/80 hover:text-purple-300 transition-colors disabled:opacity-50"
        >
          {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          {generating ? 'Extracting terms…' : 'Extract percentage rent terms'}
        </button>
      </div>
    )
  }

  const breakpoint = config.breakpoint ?? 0
  const percentage = config.percentage ?? 0
  const currentYear = new Date().getFullYear()
  const yearEntries = entries.filter((e) => e.year === currentYear)
  const totalSales = yearEntries.reduce((sum, e) => sum + Number(e.gross_sales), 0)
  const monthsWithData = yearEntries.length
  const avgMonthlySales = monthsWithData > 0 ? totalSales / monthsWithData : 0
  const projectedAnnual = monthsWithData > 0 ? avgMonthlySales * 12 : 0
  const overBreakpoint = Math.max(0, totalSales - breakpoint)
  const projectedOver = Math.max(0, projectedAnnual - breakpoint)
  const estimatedPctRent = projectedOver * (percentage / 100)
  const progressPct = breakpoint > 0 ? Math.min(100, (totalSales / breakpoint) * 100) : 0

  return (
    <div className="glass-card rounded-2xl p-6 space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="flex items-center justify-center w-9 h-9 rounded-xl shrink-0"
            style={{ background: 'rgba(168,85,247,0.10)', border: '1px solid rgba(168,85,247,0.20)' }}
          >
            <TrendingUp className="h-4 w-4 text-purple-400" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-sm">Percentage Rent Tracker</p>
            <p className="text-xs text-muted-foreground/60">
              {config.analysis_data?.details ?? `Breakpoint: $${breakpoint.toLocaleString()} | Rate: ${percentage}%`}
            </p>
          </div>
        </div>
        <button
          onClick={handleExtract}
          disabled={generating}
          title="Re-extract from lease"
          className="flex items-center gap-1.5 text-xs text-muted-foreground/60 hover:text-white/70 transition-colors shrink-0 disabled:opacity-40"
        >
          {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
        </button>
      </div>

      {/* Progress bar */}
      {breakpoint > 0 && (
        <div>
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-white/50">
              ${totalSales.toLocaleString()} / ${breakpoint.toLocaleString()} breakpoint
            </span>
            <span className={`font-semibold ${progressPct >= 100 ? 'text-red-400' : progressPct >= 80 ? 'text-amber-400' : 'text-emerald-400'}`}>
              {progressPct.toFixed(0)}%
            </span>
          </div>
          <div className="h-2.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${progressPct}%`,
                background: progressPct >= 100
                  ? 'linear-gradient(90deg, rgb(239,68,68), rgb(220,38,38))'
                  : progressPct >= 80
                  ? 'linear-gradient(90deg, rgb(245,158,11), rgb(234,88,12))'
                  : 'linear-gradient(90deg, rgb(16,185,129), rgb(20,184,166))',
              }}
            />
          </div>
        </div>
      )}

      {/* Metrics */}
      <div
        className="rounded-xl px-4 py-3 grid grid-cols-2 sm:grid-cols-3 gap-3"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
      >
        <div>
          <p className="text-[10px] font-semibold text-white/35 uppercase tracking-widest mb-0.5">YTD Sales</p>
          <p className="text-sm text-white/85 font-semibold">${totalSales.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold text-white/35 uppercase tracking-widest mb-0.5">Projected Annual</p>
          <p className="text-sm text-white/85">${projectedAnnual.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold text-white/35 uppercase tracking-widest mb-0.5">Est. % Rent Owed</p>
          <p className={`text-sm font-semibold ${estimatedPctRent > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
            ${estimatedPctRent.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </p>
        </div>
      </div>

      {/* Monthly entries */}
      {yearEntries.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {yearEntries.map((e) => (
            <span
              key={`${e.month}-${e.year}`}
              className="text-[11px] text-white/50 px-2 py-0.5 rounded-md"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
            >
              {MONTH_NAMES[e.month - 1]}: ${Number(e.gross_sales).toLocaleString()}
            </span>
          ))}
        </div>
      )}

      {/* Add entry form */}
      {showForm ? (
        <div
          className="rounded-xl px-4 py-3 space-y-3"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          <p className="text-xs font-semibold text-white/50">Add Monthly Sales</p>
          <div className="flex items-center gap-2">
            <select
              value={formMonth}
              onChange={(e) => setFormMonth(Number(e.target.value))}
              className="bg-white/[0.06] border border-white/[0.10] rounded-lg px-2 py-1.5 text-xs text-white/85"
            >
              {MONTH_NAMES.map((m, i) => (
                <option key={i} value={i + 1}>{m}</option>
              ))}
            </select>
            <select
              value={formYear}
              onChange={(e) => setFormYear(Number(e.target.value))}
              className="bg-white/[0.06] border border-white/[0.10] rounded-lg px-2 py-1.5 text-xs text-white/85"
            >
              {[currentYear - 1, currentYear, currentYear + 1].map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <div className="relative flex-1">
              <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-white/30" />
              <input
                type="text"
                value={formSales}
                onChange={(e) => setFormSales(e.target.value)}
                placeholder="Gross sales"
                className="w-full bg-white/[0.06] border border-white/[0.10] rounded-lg pl-6 pr-2 py-1.5 text-xs text-white/85 placeholder:text-white/25"
              />
            </div>
            <button
              onClick={handleSaveEntry}
              disabled={saving || !formSales}
              className="text-xs font-medium text-emerald-400 hover:text-emerald-300 disabled:opacity-40 px-2 py-1.5"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Save'}
            </button>
          </div>
          <button
            onClick={() => setShowForm(false)}
            className="text-[11px] text-white/30 hover:text-white/50"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 text-xs font-medium text-purple-400/70 hover:text-purple-300 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" /> Add monthly sales
        </button>
      )}
    </div>
  )
}
