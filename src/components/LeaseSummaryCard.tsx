'use client'

import { useState, useEffect } from 'react'
import { Loader2, RefreshCw, FileText, Calendar, DollarSign, Building2, Download } from 'lucide-react'
import type { LeaseSummaryData } from '@/types'
import { exportLeaseSummary } from '@/lib/pdfExport'
import { useLanguage } from './LanguageProvider'

interface LeaseSummaryCardProps {
  storeId: string
  storeName?: string
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="text-[10px] font-semibold text-white/35 uppercase tracking-widest mb-0.5">{label}</p>
      <p className={`text-sm leading-snug ${value ? 'text-white/85' : 'text-white/25 italic'}`}>
        {value ?? '—'}
      </p>
    </div>
  )
}

function daysUntilDate(dateStr: string | null): number | null {
  if (!dateStr) return null
  // Try multiple date parse strategies
  const d = new Date(dateStr)
  if (!isNaN(d.getTime())) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return Math.round((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  }
  return null
}

function DaysRemaining({ dateStr }: { dateStr: string | null }) {
  const days = daysUntilDate(dateStr)
  if (days === null) return null

  if (days < 0) {
    return (
      <span className="text-xs px-2 py-0.5 rounded-md bg-white/[0.05] text-white/35 border border-white/[0.07]">
        Expired
      </span>
    )
  }
  if (days <= 180) {
    const cls = days <= 90
      ? 'bg-red-500/15 text-red-400 border-red-500/25'
      : 'bg-amber-500/15 text-amber-400 border-amber-500/25'
    return (
      <span className={`text-xs font-semibold px-2 py-0.5 rounded-md border ${cls}`}>
        {days}d remaining
      </span>
    )
  }
  return (
    <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-emerald-500/12 text-emerald-400/80 border border-emerald-500/20">
      {Math.round(days / 365 * 10) / 10}yr remaining
    </span>
  )
}

export function LeaseSummaryCard({ storeId, storeName = 'Lease' }: LeaseSummaryCardProps) {
  const { t } = useLanguage()
  const [summary, setSummary] = useState<LeaseSummaryData | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchSummary = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/lease-summary?store_id=${storeId}`)
      if (res.ok) {
        const data = await res.json()
        setSummary(data.summary?.summary_data ?? null)
      }
    } catch {
      // Fail silently — show generate button
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchSummary() }, [storeId]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleGenerate = async () => {
    setGenerating(true)
    setError(null)
    try {
      const res = await fetch('/api/lease-summary/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ store_id: storeId }),
      })
      const data = await res.json()
      if (res.ok && data.summary_data) {
        setSummary(data.summary_data)
      } else {
        setError(data.error ?? 'Could not generate summary. Make sure documents are uploaded.')
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setGenerating(false)
    }
  }

  // ── Loading state ────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="glass-card rounded-2xl p-6 space-y-5 animate-pulse">
        {/* Header skeleton */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl shrink-0" style={{ background: 'rgba(255,255,255,0.06)' }} />
          <div className="space-y-1.5 flex-1">
            <div className="h-3.5 w-28 rounded-md" style={{ background: 'rgba(255,255,255,0.08)' }} />
            <div className="h-2.5 w-44 rounded-md" style={{ background: 'rgba(255,255,255,0.05)' }} />
          </div>
        </div>
        {/* Parties skeleton */}
        <div
          className="rounded-xl px-4 py-3 grid grid-cols-2 gap-3"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          {[0, 1].map(i => (
            <div key={i} className="space-y-1.5">
              <div className="h-2 w-12 rounded" style={{ background: 'rgba(255,255,255,0.06)' }} />
              <div className="h-3.5 w-32 rounded-md" style={{ background: 'rgba(255,255,255,0.08)' }} />
            </div>
          ))}
        </div>
        {/* Term + type skeleton */}
        <div className="grid grid-cols-3 gap-3">
          <div
            className="col-span-2 rounded-xl px-4 py-3 space-y-2"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
          >
            <div className="h-2 w-16 rounded" style={{ background: 'rgba(255,255,255,0.06)' }} />
            <div className="h-3.5 w-48 rounded-md" style={{ background: 'rgba(255,255,255,0.08)' }} />
          </div>
          <div
            className="rounded-xl px-4 py-3 space-y-2"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
          >
            <div className="h-2 w-14 rounded" style={{ background: 'rgba(255,255,255,0.06)' }} />
            <div className="h-3.5 w-20 rounded-md" style={{ background: 'rgba(255,255,255,0.08)' }} />
          </div>
        </div>
        {/* Financials skeleton */}
        <div
          className="rounded-xl px-4 py-3 space-y-3"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          <div className="h-2 w-20 rounded" style={{ background: 'rgba(255,255,255,0.06)' }} />
          <div className="grid grid-cols-2 gap-3">
            {[0, 1, 2, 3].map(i => (
              <div key={i} className="space-y-1.5">
                <div className="h-2 w-16 rounded" style={{ background: 'rgba(255,255,255,0.06)' }} />
                <div className="h-3 w-28 rounded" style={{ background: 'rgba(255,255,255,0.08)' }} />
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ── Not yet generated ────────────────────────────────────────────────────────
  if (!summary) {
    return (
      <div className="glass-card rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div
            className="flex items-center justify-center w-9 h-9 rounded-xl shrink-0"
            style={{ background: 'rgba(16,185,129,0.10)', border: '1px solid rgba(16,185,129,0.18)' }}
          >
            <FileText className="h-4 w-4 text-emerald-400" />
          </div>
          <div>
            <p className="font-semibold text-sm">{t('summary.title')}</p>
            <p className="text-xs text-muted-foreground/80">{t('summary.subtitle')}</p>
          </div>
        </div>
        {error && (
          <p className="text-xs text-red-400/80 mb-3">{error}</p>
        )}
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="flex items-center gap-2 text-sm font-medium text-emerald-400/80 hover:text-emerald-300 transition-colors disabled:opacity-50"
        >
          {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          {generating ? t('summary.generating') : t('summary.generate')}
        </button>
      </div>
    )
  }

  // ── Summary display ──────────────────────────────────────────────────────────
  return (
    <div className="glass-card rounded-2xl p-6 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="flex items-center justify-center w-9 h-9 rounded-xl shrink-0"
            style={{ background: 'rgba(16,185,129,0.10)', border: '1px solid rgba(16,185,129,0.18)' }}
          >
            <FileText className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-sm">{t('summary.title')}</p>
            <p className="text-xs text-muted-foreground/60">{t('summary.aiExtracted')}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => exportLeaseSummary(summary, storeName)}
            title="Download as PDF"
            className="flex items-center gap-1.5 text-xs text-muted-foreground/60 hover:text-white/70 transition-colors shrink-0"
          >
            <Download className="h-3.5 w-3.5" />
            PDF
          </button>
          <button
            onClick={handleGenerate}
            disabled={generating}
            title={t('summary.regenerate')}
            className="flex items-center gap-1.5 text-xs text-muted-foreground/60 hover:text-white/70 transition-colors shrink-0 disabled:opacity-40"
          >
            {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            {generating ? t('summary.regenerating') : t('summary.regenerate')}
          </button>
        </div>
      </div>

      {/* Top: Parties */}
      <div
        className="rounded-xl px-4 py-3 grid grid-cols-1 sm:grid-cols-2 gap-3"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
      >
        <div>
          <p className="text-[10px] font-semibold text-white/35 uppercase tracking-widest mb-0.5">{t('summary.tenant')}</p>
          <p className="text-sm font-semibold text-emerald-300">{summary.tenant_name ?? '—'}</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold text-white/35 uppercase tracking-widest mb-0.5">{t('summary.landlord')}</p>
          <p className="text-sm font-medium text-white/80">{summary.landlord_name ?? '—'}</p>
        </div>
        {summary.property_address && (
          <div className="sm:col-span-2 flex items-start gap-1.5">
            <Building2 className="h-3.5 w-3.5 text-white/30 mt-0.5 shrink-0" />
            <p className="text-xs text-white/60">
              {summary.property_address}
              {summary.suite_number && `, Suite ${summary.suite_number}`}
            </p>
          </div>
        )}
      </div>

      {/* Middle: Term + Type + SqFt */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div
          className="sm:col-span-2 rounded-xl px-4 py-3 space-y-1"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          <div className="flex items-center gap-2">
            <Calendar className="h-3.5 w-3.5 text-white/30 shrink-0" />
            <p className="text-[10px] font-semibold text-white/35 uppercase tracking-widest">{t('summary.leaseTerm')}</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm text-white/80">
              {summary.lease_start_date ?? '?'} → {summary.lease_end_date ?? '?'}
            </p>
            <DaysRemaining dateStr={summary.lease_end_date} />
          </div>
        </div>
        <div
          className="rounded-xl px-4 py-3 space-y-2"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          <Field label={t('summary.leaseType')} value={summary.lease_type} />
          {summary.square_footage && <Field label={t('summary.sqft')} value={summary.square_footage} />}
        </div>
      </div>

      {/* Bottom: Financial */}
      <div
        className="rounded-xl px-4 py-3 space-y-3"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
      >
        <div className="flex items-center gap-2">
          <DollarSign className="h-3.5 w-3.5 text-white/30 shrink-0" />
          <p className="text-[10px] font-semibold text-white/35 uppercase tracking-widest">{t('summary.financials')}</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label={t('summary.baseRent')} value={summary.base_rent_monthly} />
          <Field label={t('summary.securityDeposit')} value={summary.security_deposit} />
          <Field label={t('summary.rentEscalation')} value={summary.rent_escalation} />
          <Field label={t('summary.renewalOptions')} value={summary.renewal_options} />
        </div>
      </div>

      {/* Permitted Use */}
      {summary.permitted_use && (
        <div>
          <p className="text-[10px] font-semibold text-white/35 uppercase tracking-widest mb-1">{t('summary.permittedUse')}</p>
          <p className="text-xs text-white/65 leading-relaxed">{summary.permitted_use}</p>
        </div>
      )}

      <p className="text-[10px] text-white/25 italic">
        {t('summary.verifyNote')}
      </p>
    </div>
  )
}
