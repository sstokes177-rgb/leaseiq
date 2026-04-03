'use client'

import { useState, useEffect } from 'react'
import {
  ShieldCheck, ShieldAlert, ShieldX, RefreshCw, Loader2,
  ChevronDown, Lightbulb, AlertTriangle,
} from 'lucide-react'
import type { ClauseScore, ClauseSeverity } from '@/types'

interface RiskScoreCardProps {
  storeId: string
}

const SEVERITY_CONFIG: Record<ClauseSeverity, {
  bg: string; border: string; text: string; icon: typeof ShieldCheck; label: string
  badgeBg: string; badgeBorder: string; badgeText: string
}> = {
  red: {
    bg: 'rgba(239,68,68,0.10)', border: 'rgba(239,68,68,0.22)',
    text: 'text-red-400', icon: ShieldX, label: 'High Risk',
    badgeBg: 'rgba(239,68,68,0.15)', badgeBorder: 'rgba(239,68,68,0.30)', badgeText: 'text-red-400',
  },
  yellow: {
    bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.20)',
    text: 'text-amber-400', icon: ShieldAlert, label: 'Moderate',
    badgeBg: 'rgba(245,158,11,0.12)', badgeBorder: 'rgba(245,158,11,0.25)', badgeText: 'text-amber-400',
  },
  green: {
    bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.18)',
    text: 'text-emerald-400', icon: ShieldCheck, label: 'Low Risk',
    badgeBg: 'rgba(16,185,129,0.12)', badgeBorder: 'rgba(16,185,129,0.22)', badgeText: 'text-emerald-400',
  },
}

const CATEGORY_LABELS: Record<string, string> = {
  expansion_blockers: 'Expansion Blockers',
  financial_exposure: 'Financial Exposure',
  tenant_protections: 'Tenant Protections',
}

function getScoreColor(score: number): { ring: string; text: string; glow: string } {
  if (score >= 80) return { ring: '#10b981', text: 'text-emerald-400', glow: 'rgba(16,185,129,0.25)' }
  if (score >= 50) return { ring: '#f59e0b', text: 'text-amber-400', glow: 'rgba(245,158,11,0.20)' }
  return { ring: '#ef4444', text: 'text-red-400', glow: 'rgba(239,68,68,0.25)' }
}

function getScoreLabel(score: number): string {
  if (score >= 80) return 'Excellent'
  if (score >= 65) return 'Good'
  if (score >= 50) return 'Fair'
  if (score >= 30) return 'Poor'
  return 'Critical'
}

function CircularScore({ score }: { score: number }) {
  const colors = getScoreColor(score)
  const radius = 54
  const circumference = 2 * Math.PI * radius
  const progress = (score / 100) * circumference
  const offset = circumference - progress

  return (
    <div className="relative flex items-center justify-center" style={{ width: 140, height: 140 }}>
      {/* Glow effect */}
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: `radial-gradient(circle, ${colors.glow} 0%, transparent 70%)`,
          filter: 'blur(12px)',
        }}
      />
      <svg width="140" height="140" className="relative -rotate-90">
        {/* Background track */}
        <circle
          cx="70" cy="70" r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth="10"
        />
        {/* Progress arc */}
        <circle
          cx="70" cy="70" r={radius}
          fill="none"
          stroke={colors.ring}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1s cubic-bezier(0.34,1.56,0.64,1)' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-3xl font-extrabold tabular-nums ${colors.text}`}>{score}</span>
        <span className="text-[10px] font-semibold text-white/40 uppercase tracking-wider mt-0.5">
          {getScoreLabel(score)}
        </span>
      </div>
    </div>
  )
}

export function RiskScoreCard({ storeId }: RiskScoreCardProps) {
  const [overallScore, setOverallScore] = useState<number | null>(null)
  const [clauseScores, setClauseScores] = useState<ClauseScore[]>([])
  const [analyzedAt, setAnalyzedAt] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedClause, setExpandedClause] = useState<string | null>(null)

  const fetchScore = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/risk-score?store_id=${storeId}`)
      if (res.ok) {
        const data = await res.json()
        if (data.risk_score) {
          setOverallScore(data.risk_score.overall_score)
          setClauseScores(data.risk_score.clause_scores ?? [])
          setAnalyzedAt(data.risk_score.analyzed_at)
        }
      }
    } catch {
      // Fail silently
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchScore() }, [storeId]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleAnalyze = async () => {
    setGenerating(true)
    setError(null)
    try {
      const res = await fetch('/api/risk-score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ store_id: storeId }),
      })
      const data = await res.json()
      if (res.ok) {
        setOverallScore(data.overall_score)
        setClauseScores(data.clause_scores ?? [])
        setAnalyzedAt(data.analyzed_at)
      } else {
        setError(data.error ?? 'Analysis failed.')
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setGenerating(false)
    }
  }

  // Loading skeleton
  if (loading) {
    return (
      <div className="glass-card rounded-2xl p-6 space-y-4 animate-pulse">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl shrink-0" style={{ background: 'rgba(255,255,255,0.06)' }} />
          <div className="space-y-1.5 flex-1">
            <div className="h-3.5 w-40 rounded-md" style={{ background: 'rgba(255,255,255,0.08)' }} />
            <div className="h-2.5 w-56 rounded-md" style={{ background: 'rgba(255,255,255,0.05)' }} />
          </div>
        </div>
        <div className="flex justify-center py-6">
          <div className="w-[140px] h-[140px] rounded-full" style={{ background: 'rgba(255,255,255,0.04)' }} />
        </div>
      </div>
    )
  }

  // No score yet — show enhanced empty state
  if (overallScore === null) {
    return (
      <div className="glass-card rounded-2xl p-6" id="risk-score">
        <div className="flex items-center gap-3 mb-5">
          <div
            className="flex items-center justify-center w-9 h-9 rounded-xl shrink-0"
            style={{ background: 'rgba(139,92,246,0.10)', border: '1px solid rgba(139,92,246,0.20)' }}
          >
            <ShieldAlert className="h-4 w-4 text-violet-400" />
          </div>
          <div>
            <p className="font-semibold text-sm">Lease Risk Score</p>
            <p className="text-xs text-muted-foreground/60">AI-powered clause risk analysis</p>
          </div>
        </div>
        <div className="text-center py-4">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4" style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.15)' }}>
            <ShieldAlert className="h-7 w-7 text-violet-400/60" />
          </div>
          <p className="font-semibold text-sm mb-1">Your lease hasn&apos;t been analyzed yet</p>
          <p className="text-xs text-muted-foreground/60 mb-5 max-w-xs mx-auto">
            Click Analyze to generate a risk score across 20 clause categories. Takes about 30 seconds.
          </p>
          {error && <p className="text-xs text-red-400/80 mb-3">{error}</p>}
          <button
            onClick={handleAnalyze}
            disabled={generating}
            className="inline-flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors disabled:opacity-50"
            style={{ background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.30)', color: 'rgb(167,139,250)' }}
          >
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
            {generating ? 'Analyzing...' : 'Analyze Now'}
          </button>
        </div>
      </div>
    )
  }

  // Group clauses by severity for display (red first)
  const severityOrder: ClauseSeverity[] = ['red', 'yellow', 'green']
  const grouped = severityOrder.map(severity => ({
    severity,
    clauses: clauseScores.filter(c => c.severity === severity),
  })).filter(g => g.clauses.length > 0)

  // Top 3 recommendations from red/yellow clauses
  const recommendations = clauseScores
    .filter(c => c.severity !== 'green' && c.recommendation)
    .sort((a, b) => (a.severity === 'red' ? 0 : 1) - (b.severity === 'red' ? 0 : 1))
    .slice(0, 3)

  const scoreColors = getScoreColor(overallScore)

  return (
    <div className="glass-card rounded-2xl p-6 space-y-6" id="risk-score">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="flex items-center justify-center w-9 h-9 rounded-xl shrink-0"
            style={{ background: 'rgba(139,92,246,0.10)', border: '1px solid rgba(139,92,246,0.20)' }}
          >
            <ShieldCheck className="h-4 w-4 text-violet-400" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-sm">Lease Risk Score</p>
            <p className="text-xs text-muted-foreground/60">
              {analyzedAt
                ? `Analyzed ${new Date(analyzedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
                : 'AI-powered clause risk analysis'}
            </p>
          </div>
        </div>
        <button
          onClick={handleAnalyze}
          disabled={generating}
          title="Re-analyze"
          className="flex items-center gap-1.5 text-xs text-muted-foreground/60 hover:text-white/70 transition-colors shrink-0 disabled:opacity-40"
        >
          {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          {generating ? 'Analyzing...' : 'Re-analyze'}
        </button>
      </div>

      {error && <p className="text-xs text-red-400/80">{error}</p>}

      {/* Circular score */}
      <div className="flex flex-col items-center gap-3 py-2">
        <CircularScore score={overallScore} />
        <p className="text-xs text-white/40 text-center max-w-[260px]">
          {overallScore >= 80
            ? 'Your lease terms are well-balanced with strong tenant protections.'
            : overallScore >= 50
            ? 'Some lease areas need attention. Review the flagged clauses below.'
            : 'Several high-risk clauses detected. Consult your attorney about these terms.'}
        </p>
      </div>

      {/* Severity summary badges */}
      <div className="flex items-center justify-center gap-2">
        {severityOrder.map(sev => {
          const count = clauseScores.filter(c => c.severity === sev).length
          if (count === 0) return null
          const cfg = SEVERITY_CONFIG[sev]
          return (
            <span
              key={sev}
              className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-md ${cfg.badgeText}`}
              style={{ background: cfg.badgeBg, border: `1px solid ${cfg.badgeBorder}` }}
            >
              <cfg.icon className="h-3 w-3" />
              {count} {cfg.label}
            </span>
          )
        })}
      </div>

      {/* Clause list grouped by severity */}
      <div className="space-y-2">
        {grouped.map(group => (
          <div key={group.severity} className="space-y-1.5">
            {group.clauses.map(clause => {
              const cfg = SEVERITY_CONFIG[clause.severity]
              const Icon = cfg.icon
              const isExpanded = expandedClause === `${clause.category}-${clause.clause}`

              return (
                <div
                  key={`${clause.category}-${clause.clause}`}
                  className="rounded-xl overflow-hidden transition-all"
                  style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}
                >
                  <button
                    onClick={() => setExpandedClause(isExpanded ? null : `${clause.category}-${clause.clause}`)}
                    className="w-full px-4 py-3 flex items-center gap-3 text-left"
                  >
                    <Icon className={`h-4 w-4 ${cfg.text} shrink-0`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{clause.clause}</p>
                      <p className="text-[10px] text-white/35 uppercase tracking-wider">
                        {CATEGORY_LABELS[clause.category] ?? clause.category}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded ${cfg.badgeText} uppercase tracking-wider`}
                      style={{ background: cfg.badgeBg, border: `1px solid ${cfg.badgeBorder}` }}
                    >
                      {cfg.label}
                    </span>
                    <ChevronDown className={`h-3.5 w-3.5 text-white/30 transition-transform shrink-0 ${isExpanded ? 'rotate-180' : ''}`} />
                  </button>

                  {isExpanded && (
                    <div className="px-4 pb-4 pt-1 space-y-2 border-t" style={{ borderColor: cfg.border }}>
                      <p className="text-xs text-white/60 leading-relaxed">{clause.summary}</p>
                      {clause.citation && (
                        <span
                          className="inline-block text-[10px] font-medium px-1.5 py-0.5 rounded"
                          style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)', color: 'rgb(52,211,153)' }}
                        >
                          {clause.citation}
                        </span>
                      )}
                      {clause.recommendation && (
                        <div className="flex items-start gap-2 mt-1">
                          <Lightbulb className="h-3.5 w-3.5 text-amber-400/60 mt-0.5 shrink-0" />
                          <p className="text-xs text-amber-300/70 leading-relaxed italic">{clause.recommendation}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ))}
      </div>

      {/* How to Improve — top 3 recommendations */}
      {recommendations.length > 0 && (
        <div
          className="rounded-xl px-4 py-4 space-y-3"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className={`h-4 w-4 ${scoreColors.text}`} />
            <p className="text-xs font-semibold text-white/50 uppercase tracking-widest">How to Improve</p>
          </div>
          <div className="space-y-2.5">
            {recommendations.map((rec, i) => {
              const cfg = SEVERITY_CONFIG[rec.severity]
              return (
                <div key={i} className="flex items-start gap-2.5">
                  <span
                    className={`flex items-center justify-center w-5 h-5 rounded-md text-[10px] font-bold shrink-0 mt-0.5 ${cfg.badgeText}`}
                    style={{ background: cfg.badgeBg, border: `1px solid ${cfg.badgeBorder}` }}
                  >
                    {i + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-white/70">{rec.clause}</p>
                    <p className="text-xs text-white/45 leading-relaxed">{rec.recommendation}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <p className="text-[10px] text-white/25 italic">
        AI-generated risk assessment — consult a real estate attorney for legal advice.
      </p>
    </div>
  )
}
