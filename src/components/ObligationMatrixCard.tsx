'use client'

import { useState, useEffect } from 'react'
import { Loader2, RefreshCw, ClipboardList, Download } from 'lucide-react'
import type { ObligationItem } from '@/types'
import { exportObligationMatrix } from '@/lib/pdfExport'
import { useLanguage } from './LanguageProvider'

interface ObligationMatrixCardProps {
  storeId: string
  storeName?: string
}

const RESPONSIBLE_STYLES: Record<string, { bg: string; border: string; text: string; badge: string }> = {
  Tenant: {
    bg: 'rgba(16,185,129,0.06)',
    border: 'rgba(16,185,129,0.18)',
    text: 'text-emerald-300',
    badge: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
  },
  Landlord: {
    bg: 'rgba(99,102,241,0.06)',
    border: 'rgba(99,102,241,0.18)',
    text: 'text-indigo-300',
    badge: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/25',
  },
  Shared: {
    bg: 'rgba(245,158,11,0.06)',
    border: 'rgba(245,158,11,0.18)',
    text: 'text-amber-300',
    badge: 'bg-amber-500/15 text-amber-400 border-amber-500/25',
  },
  'Not Addressed': {
    bg: 'rgba(255,255,255,0.02)',
    border: 'rgba(255,255,255,0.06)',
    text: 'text-white/35',
    badge: 'bg-white/[0.05] text-white/35 border-white/[0.08]',
  },
}

function ObligationRow({ item }: { item: ObligationItem }) {
  const styles = RESPONSIBLE_STYLES[item.responsible] ?? RESPONSIBLE_STYLES['Not Addressed']
  return (
    <div
      className="rounded-lg px-3 py-2.5 flex items-start gap-2.5"
      style={{ background: styles.bg, border: `1px solid ${styles.border}` }}
    >
      <div className="flex-1 min-w-0">
        <p className={`text-xs font-semibold leading-tight ${styles.text}`}>{item.category}</p>
        {item.details && (
          <p className="text-[11px] text-white/45 leading-relaxed mt-0.5">{item.details}</p>
        )}
      </div>
      {item.article && (
        <span
          className="shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded border whitespace-nowrap mt-0.5"
          style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)', color: 'rgb(52,211,153)' }}
        >
          {item.article}
        </span>
      )}
    </div>
  )
}

function ObligationColumn({
  title,
  items,
  responsible,
}: {
  title: string
  items: ObligationItem[]
  responsible: string
}) {
  const styles = RESPONSIBLE_STYLES[responsible] ?? RESPONSIBLE_STYLES['Not Addressed']
  if (items.length === 0) return null
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold border ${styles.badge}`}>
          {title}
        </span>
        <span className="text-xs text-white/30">{items.length} item{items.length !== 1 ? 's' : ''}</span>
      </div>
      <div className="space-y-1.5">
        {items.map((item, i) => <ObligationRow key={i} item={item} />)}
      </div>
    </div>
  )
}

export function ObligationMatrixCard({ storeId, storeName = 'Lease' }: ObligationMatrixCardProps) {
  const { t } = useLanguage()
  const [obligations, setObligations] = useState<ObligationItem[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchMatrix = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/obligations?store_id=${storeId}`)
      if (res.ok) {
        const data = await res.json()
        const items = data.matrix?.matrix_data?.obligations ?? null
        setObligations(items)
      }
    } catch {
      // Fail silently
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchMatrix() }, [storeId]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleGenerate = async () => {
    setGenerating(true)
    setError(null)
    try {
      const res = await fetch('/api/obligations/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ store_id: storeId }),
      })
      const data = await res.json()
      if (res.ok && data.obligations) {
        setObligations(data.obligations)
      } else {
        setError(data.error ?? 'Could not generate matrix. Make sure documents are uploaded.')
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setGenerating(false)
    }
  }

  if (loading) {
    return (
      <div className="glass-card p-6 space-y-5 animate-pulse">
        {/* Header skeleton */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl shrink-0" style={{ background: 'rgba(255,255,255,0.06)' }} />
          <div className="space-y-1.5 flex-1">
            <div className="h-3.5 w-36 rounded-md" style={{ background: 'rgba(255,255,255,0.08)' }} />
            <div className="h-2.5 w-48 rounded-md" style={{ background: 'rgba(255,255,255,0.05)' }} />
          </div>
        </div>
        {/* Two-column skeleton */}
        <div className="grid grid-cols-2 gap-4">
          {[0, 1].map(col => (
            <div key={col} className="space-y-2">
              <div className="h-6 w-32 rounded-lg" style={{ background: 'rgba(255,255,255,0.07)' }} />
              {[0, 1, 2, 3].map(row => (
                <div
                  key={row}
                  className="rounded-lg px-3 py-2.5 space-y-1.5"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
                >
                  <div className="h-3 rounded" style={{ background: 'rgba(255,255,255,0.07)', width: `${55 + (row * 11) % 30}%` }} />
                  <div className="h-2.5 rounded" style={{ background: 'rgba(255,255,255,0.04)', width: `${70 + (col * 7) % 25}%` }} />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (!obligations) {
    return (
      <div className="glass-card p-6">
        <div className="flex items-center gap-3 mb-4">
          <div
            className="flex items-center justify-center w-9 h-9 rounded-xl shrink-0"
            style={{ background: 'rgba(99,102,241,0.10)', border: '1px solid rgba(99,102,241,0.20)' }}
          >
            <ClipboardList className="h-4 w-4 text-indigo-400" />
          </div>
          <div>
            <p className="font-semibold text-sm">{t('obligations.title')}</p>
            <p className="text-xs text-muted-foreground/80">{t('obligations.subtitle')}</p>
          </div>
        </div>
        {error && <p className="text-xs text-red-400/80 mb-3">{error}</p>}
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="flex items-center gap-2 text-sm font-medium text-indigo-400/80 hover:text-indigo-300 transition-colors disabled:opacity-50"
        >
          {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          {generating ? t('obligations.generating') : t('obligations.generate')}
        </button>
      </div>
    )
  }

  const tenantItems = obligations.filter((o) => o.responsible === 'Tenant')
  const landlordItems = obligations.filter((o) => o.responsible === 'Landlord')
  const sharedItems = obligations.filter((o) => o.responsible === 'Shared')
  const naItems = obligations.filter((o) => o.responsible === 'Not Addressed')

  return (
    <div className="glass-card p-6 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className="flex items-center justify-center w-9 h-9 rounded-xl shrink-0"
            style={{ background: 'rgba(99,102,241,0.10)', border: '1px solid rgba(99,102,241,0.20)' }}
          >
            <ClipboardList className="h-4 w-4 text-indigo-400" />
          </div>
          <div>
            <p className="font-semibold text-sm">{t('obligations.title')}</p>
            <p className="text-xs text-muted-foreground/60">{t('summary.aiExtracted')}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => exportObligationMatrix(obligations, storeName)}
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

      {/* Two-column: Tenant / Landlord */}
      {(tenantItems.length > 0 || landlordItems.length > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <ObligationColumn title={t('obligations.yourResp')} items={tenantItems} responsible="Tenant" />
          <ObligationColumn title={t('obligations.landlordResp')} items={landlordItems} responsible="Landlord" />
        </div>
      )}

      {/* Shared */}
      {sharedItems.length > 0 && (
        <ObligationColumn title={t('obligations.shared')} items={sharedItems} responsible="Shared" />
      )}

      {/* Not Addressed */}
      {naItems.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold text-white/25 uppercase tracking-widest mb-2">
            {t('obligations.notAddressed')} ({naItems.length})
          </p>
          <div className="flex flex-wrap gap-1.5">
            {naItems.map((item, i) => (
              <span
                key={i}
                className="text-[11px] text-white/30 px-2 py-0.5 rounded-md"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                {item.category}
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
