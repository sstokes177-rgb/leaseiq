'use client'

import { useState } from 'react'
import {
  GitCompareArrows, Loader2, RefreshCw, ChevronDown,
  Download, MessageSquare, ArrowRight,
} from 'lucide-react'
import Link from 'next/link'
import type { LeaseComparisonItem, LeaseComparisonResult } from '@/types'
import { exportLeaseComparison } from '@/lib/pdfExport'
import { useLanguage } from './LanguageProvider'

interface LeaseComparisonCardProps {
  storeId: string
  storeName: string
  documentCount: number
}

const IMPACT_STYLES = {
  favorable: {
    border: 'border-l-emerald-500',
    bg: 'bg-emerald-500/5',
    badgeBg: 'rgba(16,185,129,0.15)',
    badgeBorder: 'rgba(16,185,129,0.30)',
    badgeText: 'text-emerald-400',
    label: 'Favorable',
  },
  unfavorable: {
    border: 'border-l-red-500',
    bg: 'bg-red-500/5',
    badgeBg: 'rgba(239,68,68,0.15)',
    badgeBorder: 'rgba(239,68,68,0.30)',
    badgeText: 'text-red-400',
    label: 'Unfavorable',
  },
  neutral: {
    border: 'border-l-gray-500',
    bg: 'bg-gray-500/5',
    badgeBg: 'rgba(150,150,160,0.15)',
    badgeBorder: 'rgba(150,150,160,0.30)',
    badgeText: 'text-gray-400',
    label: 'Neutral',
  },
} as const

const SIGNIFICANCE_STYLES = {
  high: 'font-bold',
  medium: 'font-medium',
  low: 'font-normal opacity-70',
} as const

const NET_IMPACT_STYLES = {
  favorable: { bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.25)', text: 'text-emerald-400' },
  unfavorable: { bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.25)', text: 'text-red-400' },
  mixed: { bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.25)', text: 'text-amber-400' },
} as const

function ComparisonRow({ item }: { item: LeaseComparisonItem }) {
  const [expanded, setExpanded] = useState(false)
  const style = IMPACT_STYLES[item.impact]
  const sigStyle = SIGNIFICANCE_STYLES[item.significance]

  return (
    <div className={`rounded-xl border-l-[3px] ${style.border} ${style.bg} overflow-hidden`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3.5 flex items-start gap-3 text-left"
      >
        <div className="flex-1 min-w-0">
          <p className={`text-sm ${sigStyle}`}>{item.clause_affected}</p>
          {/* Two-column on desktop, stacked on mobile */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
            <div>
              <p className="text-[10px] font-semibold text-white/30 uppercase tracking-widest mb-0.5">Base Lease</p>
              <p className="text-xs text-white/60 leading-relaxed">{item.original_text}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-white/30 uppercase tracking-widest mb-0.5">Amendment</p>
              <p className="text-xs text-white/75 leading-relaxed">{item.amended_text}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 mt-0.5">
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${style.badgeText}`}
            style={{ background: style.badgeBg, border: `1px solid ${style.badgeBorder}` }}
          >
            {style.label}
          </span>
          <span
            className={`text-[10px] px-1.5 py-0.5 rounded uppercase tracking-wider text-white/40 ${sigStyle}`}
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            {item.significance}
          </span>
          <ChevronDown className={`h-3.5 w-3.5 text-white/30 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 pt-1 border-t border-white/[0.06]">
          <p className="text-xs text-white/55 leading-relaxed italic">{item.explanation}</p>
        </div>
      )}
    </div>
  )
}

export function LeaseComparisonCard({ storeId, storeName, documentCount }: LeaseComparisonCardProps) {
  const { t } = useLanguage()
  const [result, setResult] = useState<LeaseComparisonResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Don't render if fewer than 2 documents
  if (documentCount < 2) return null

  const handleCompare = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/lease-compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ store_id: storeId }),
      })
      const data = await res.json()
      if (res.ok) {
        setResult(data)
      } else {
        setError(data.error ?? 'Comparison failed.')
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleExport = () => {
    if (!result) return
    exportLeaseComparison(result.comparisons, result.summary, result.net_impact, storeName)
  }

  // Empty state — not yet compared
  if (!result) {
    return (
      <div
        className="rounded-xl p-6"
        style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div className="flex items-center gap-3 mb-5">
          <div
            className="flex items-center justify-center w-9 h-9 rounded-xl shrink-0"
            style={{ background: 'rgba(99,102,241,0.10)', border: '1px solid rgba(99,102,241,0.20)' }}
          >
            <GitCompareArrows className="h-4 w-4 text-indigo-400" />
          </div>
          <div>
            <p className="font-semibold text-sm">{t('compare.title')}</p>
            <p className="text-xs text-muted-foreground/60">{t('compare.subtitle')}</p>
          </div>
        </div>
        <div className="text-center py-4">
          <div
            className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4"
            style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.15)' }}
          >
            <GitCompareArrows className="h-7 w-7 text-indigo-400/60" />
          </div>
          <p className="font-semibold text-sm mb-1">{t('compare.emptyTitle')}</p>
          <p className="text-xs text-muted-foreground/60 mb-5 max-w-xs mx-auto">
            {t('compare.emptyDesc')}
          </p>
          {error && <p className="text-xs text-red-400/80 mb-3">{error}</p>}
          <button
            onClick={handleCompare}
            disabled={loading}
            className="inline-flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors disabled:opacity-50"
            style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.30)', color: 'rgb(129,140,248)' }}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <GitCompareArrows className="h-4 w-4" />}
            {loading ? t('compare.comparing') : t('compare.compareNow')}
          </button>
        </div>
      </div>
    )
  }

  // Results view
  const netStyle = NET_IMPACT_STYLES[result.net_impact]
  const favorableCount = result.comparisons.filter(c => c.impact === 'favorable').length
  const unfavorableCount = result.comparisons.filter(c => c.impact === 'unfavorable').length
  const neutralCount = result.comparisons.filter(c => c.impact === 'neutral').length

  return (
    <div
      className="rounded-xl p-6 space-y-5"
      style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="flex items-center justify-center w-9 h-9 rounded-xl shrink-0"
            style={{ background: 'rgba(99,102,241,0.10)', border: '1px solid rgba(99,102,241,0.20)' }}
          >
            <GitCompareArrows className="h-4 w-4 text-indigo-400" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-sm">{t('compare.title')}</p>
            <p className="text-xs text-muted-foreground/60">{t('summary.aiExtracted')}</p>
          </div>
        </div>
        <button
          onClick={handleCompare}
          disabled={loading}
          title={t('summary.regenerate')}
          className="flex items-center gap-1.5 text-xs text-muted-foreground/60 hover:text-white/70 transition-colors shrink-0 disabled:opacity-40"
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          {loading ? t('compare.comparing') : t('summary.regenerate')}
        </button>
      </div>

      {/* Summary section */}
      <div
        className="rounded-xl px-4 py-4 space-y-3"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
      >
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-white/70">
            <span className="font-semibold text-white/90">{result.comparisons.length}</span>
            {' '}change{result.comparisons.length !== 1 ? 's' : ''} found between base lease and amendment{result.comparisons.length !== 1 ? 's' : ''}
          </p>
          <span
            className={`text-xs font-bold px-2.5 py-1 rounded-md uppercase tracking-wider ${netStyle.text}`}
            style={{ background: netStyle.bg, border: `1px solid ${netStyle.border}` }}
          >
            {result.net_impact === 'mixed' ? 'Mixed Impact' : result.net_impact === 'favorable' ? 'Net Favorable' : 'Net Unfavorable'}
          </span>
        </div>
        <p className="text-xs text-white/50 leading-relaxed">{result.summary}</p>
        <div className="flex items-center gap-3">
          {favorableCount > 0 && (
            <span className="text-[11px] text-emerald-400/70">{favorableCount} favorable</span>
          )}
          {unfavorableCount > 0 && (
            <span className="text-[11px] text-red-400/70">{unfavorableCount} unfavorable</span>
          )}
          {neutralCount > 0 && (
            <span className="text-[11px] text-gray-400/70">{neutralCount} neutral</span>
          )}
        </div>
      </div>

      {/* Comparison items — column headers */}
      <div
        className="hidden sm:grid grid-cols-2 gap-4 px-4 py-2 rounded-lg sticky top-0 z-10"
        style={{ background: 'rgba(17,19,27,0.95)', borderBottom: '1px solid rgba(255,255,255,0.10)' }}
      >
        <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Base Lease</p>
        <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Amendment(s)</p>
      </div>

      {/* Comparison rows */}
      <div className="space-y-2">
        {result.comparisons.map((item, i) => (
          <ComparisonRow key={i} item={item} />
        ))}
      </div>

      {/* Action buttons */}
      <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
        <button
          onClick={handleExport}
          className="flex items-center justify-center gap-2 text-sm font-medium px-4 py-2.5 rounded-xl transition-colors hover:bg-white/[0.06]"
          style={{ border: '1px solid rgba(255,255,255,0.10)' }}
        >
          <Download className="h-4 w-4 text-white/50" />
          <span className="text-white/70">{t('compare.export')}</span>
        </button>
        <Link
          href={`/chat?store=${storeId}&q=${encodeURIComponent('What are the key changes in my lease amendment?')}`}
          className="flex items-center justify-center gap-2 text-sm font-medium px-4 py-2.5 rounded-xl transition-colors"
          style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)' }}
        >
          <MessageSquare className="h-4 w-4 text-emerald-400" />
          <span className="text-emerald-400">{t('compare.discuss')}</span>
          <ArrowRight className="h-3.5 w-3.5 text-emerald-400/60" />
        </Link>
      </div>

      <p className="text-[10px] text-white/25 italic">
        AI-generated comparison — verify all changes against your actual lease documents.
      </p>
    </div>
  )
}
