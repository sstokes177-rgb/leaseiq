'use client'

import { useState, useEffect } from 'react'
import { Loader2, RefreshCw, Receipt, AlertCircle, ShieldCheck, Clock } from 'lucide-react'
import type { CamAnalysisData } from '@/types'

interface CamAnalysisCardProps {
  storeId: string
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

export function CamAnalysisCard({ storeId }: CamAnalysisCardProps) {
  const [analysis, setAnalysis] = useState<CamAnalysisData | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchAnalysis = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/cam-analysis?store_id=${storeId}`)
      if (res.ok) {
        const data = await res.json()
        setAnalysis(data.analysis?.analysis_data ?? null)
      }
    } catch {
      // Fail silently
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchAnalysis() }, [storeId]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleGenerate = async () => {
    setGenerating(true)
    setError(null)
    try {
      const res = await fetch('/api/cam-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ store_id: storeId }),
      })
      const data = await res.json()
      if (res.ok && data.analysis_data) {
        setAnalysis(data.analysis_data)
      } else {
        setError(data.error ?? 'Could not analyze CAM charges.')
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setGenerating(false)
    }
  }

  if (loading) {
    return (
      <div className="glass-card rounded-2xl p-6 space-y-4 animate-pulse">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl shrink-0" style={{ background: 'rgba(255,255,255,0.06)' }} />
          <div className="space-y-1.5 flex-1">
            <div className="h-3.5 w-32 rounded-md" style={{ background: 'rgba(255,255,255,0.08)' }} />
            <div className="h-2.5 w-48 rounded-md" style={{ background: 'rgba(255,255,255,0.05)' }} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="space-y-1.5">
              <div className="h-2 w-16 rounded" style={{ background: 'rgba(255,255,255,0.06)' }} />
              <div className="h-3 w-28 rounded" style={{ background: 'rgba(255,255,255,0.08)' }} />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (!analysis) {
    return (
      <div className="glass-card rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div
            className="flex items-center justify-center w-9 h-9 rounded-xl shrink-0"
            style={{ background: 'rgba(245,158,11,0.10)', border: '1px solid rgba(245,158,11,0.20)' }}
          >
            <Receipt className="h-4 w-4 text-amber-400" />
          </div>
          <div>
            <p className="font-semibold text-sm">CAM Charge Analysis</p>
            <p className="text-xs text-muted-foreground/80">Common area maintenance details</p>
          </div>
        </div>
        {error && <p className="text-xs text-red-400/80 mb-3">{error}</p>}
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="flex items-center gap-2 text-sm font-medium text-amber-400/80 hover:text-amber-300 transition-colors disabled:opacity-50"
        >
          {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          {generating ? 'Analyzing CAM charges…' : 'Analyze CAM charges'}
        </button>
      </div>
    )
  }

  return (
    <div className="glass-card rounded-2xl p-6 space-y-5">
      {/* Audit window warning */}
      {analysis.audit_window_days != null && (
        <div
          className="rounded-xl px-4 py-3 flex items-start gap-3"
          style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.20)' }}
        >
          <AlertCircle className="h-4 w-4 text-red-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-xs font-semibold text-red-400">CAM Objection Window</p>
            <p className="text-xs text-red-300/70 mt-0.5">
              You have {analysis.audit_window_days} days after receiving the annual reconciliation statement to object or request an audit. Don&apos;t miss this deadline.
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="flex items-center justify-center w-9 h-9 rounded-xl shrink-0"
            style={{ background: 'rgba(245,158,11,0.10)', border: '1px solid rgba(245,158,11,0.20)' }}
          >
            <Receipt className="h-4 w-4 text-amber-400" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-sm">CAM Charge Analysis</p>
            <p className="text-xs text-muted-foreground/60">AI-extracted from your lease</p>
          </div>
        </div>
        <button
          onClick={handleGenerate}
          disabled={generating}
          title="Regenerate CAM analysis"
          className="flex items-center gap-1.5 text-xs text-muted-foreground/60 hover:text-white/70 transition-colors shrink-0 disabled:opacity-40"
        >
          {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          {generating ? 'Regenerating…' : 'Regenerate'}
        </button>
      </div>

      {/* Key metrics */}
      <div
        className="rounded-xl px-4 py-3 grid grid-cols-2 sm:grid-cols-3 gap-3"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
      >
        <Field label="Pro-rata Share" value={analysis.proportionate_share_pct} />
        <Field label="Admin Fee" value={analysis.admin_fee_pct} />
        <Field label="CAM Cap" value={analysis.cam_cap} />
        {analysis.audit_window_days != null && (
          <div className="flex items-center gap-2">
            <Clock className="h-3.5 w-3.5 text-white/30 shrink-0" />
            <Field label="Audit Window" value={`${analysis.audit_window_days} days`} />
          </div>
        )}
        <Field label="Escalation Limit" value={analysis.escalation_limit} />
      </div>

      {/* Included items */}
      {analysis.included_items.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400/60" />
            <p className="text-[10px] font-semibold text-white/35 uppercase tracking-widest">Included in CAM</p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {analysis.included_items.map((item, i) => (
              <span
                key={i}
                className="text-[11px] text-emerald-300/70 px-2 py-0.5 rounded-md"
                style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.15)' }}
              >
                {item}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Excluded items */}
      {analysis.excluded_items.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold text-white/35 uppercase tracking-widest mb-2">Excluded from CAM</p>
          <div className="flex flex-wrap gap-1.5">
            {analysis.excluded_items.map((item, i) => (
              <span
                key={i}
                className="text-[11px] text-red-300/70 px-2 py-0.5 rounded-md"
                style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)' }}
              >
                {item}
              </span>
            ))}
          </div>
        </div>
      )}

      <p className="text-[10px] text-white/25 italic">
        AI-extracted analysis — verify all items against your actual lease text.
      </p>
    </div>
  )
}
