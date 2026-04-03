'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import {
  Building2, BarChart3, ShieldCheck, DollarSign, CalendarClock,
  Plus, Loader2, Send, ArrowRight, Menu, ChevronDown, ChevronUp,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, ReferenceLine,
} from 'recharts'

// ── Types ────────────────────────────────────────────────────────────────────

interface PortfolioLocation {
  id: string
  store_name: string
  shopping_center_name: string | null
  address: string | null
  risk_score: number | null
  lease_expiry: string | null
  years_remaining: number | null
  monthly_rent: number | null
  annual_rent: number | null
  square_footage: number | null
  rent_per_sf: number | null
  document_count: number
  top_risk: string | null
  clause_scores: Array<{
    clause: string
    category: string
    severity: 'red' | 'yellow' | 'green'
    summary: string
  }>
}

interface CriticalDate {
  date_type: string
  date_value: string
  description: string
  store_name: string
  store_id: string
}

interface PortfolioData {
  total_locations: number
  locations: PortfolioLocation[]
  upcoming_critical_dates: CriticalDate[]
  average_risk_score: number | null
  total_annual_rent: number | null
  total_square_footage: number | null
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatCurrency(val: number): string {
  if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(1)}M`
  if (val >= 1_000) return `$${(val / 1_000).toFixed(0)}K`
  return `$${val.toLocaleString()}`
}

function getExpiryColor(years: number | null): string {
  if (years == null) return '#6b7280'
  if (years < 0) return '#ef4444'
  if (years < 2) return '#ef4444'
  if (years < 5) return '#f59e0b'
  return '#10b981'
}

function getRiskColor(score: number | null): string {
  if (score == null) return '#6b7280'
  if (score >= 80) return '#10b981'
  if (score >= 50) return '#f59e0b'
  return '#ef4444'
}

function getDaysUntil(dateStr: string): number {
  const d = new Date(dateStr)
  const now = new Date()
  return Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

function getUrgencyColor(days: number): { bg: string; border: string; text: string; label: string } {
  if (days < 0) return { bg: 'rgba(107,114,128,0.12)', border: 'rgba(107,114,128,0.25)', text: 'text-gray-400', label: 'Passed' }
  if (days <= 30) return { bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.25)', text: 'text-red-400', label: `${days}d` }
  if (days <= 90) return { bg: 'rgba(245,158,11,0.10)', border: 'rgba(245,158,11,0.22)', text: 'text-amber-400', label: `${days}d` }
  return { bg: 'rgba(16,185,129,0.10)', border: 'rgba(16,185,129,0.20)', text: 'text-emerald-400', label: `${days}d` }
}

// ── Heatmap columns ──────────────────────────────────────────────────────────
const HEATMAP_COLUMNS = [
  { key: 'exclusivity', label: 'Exclusivity', keywords: ['exclusive', 'exclusiv'] },
  { key: 'assignment', label: 'Assignment', keywords: ['assign', 'subleas', 'sublet', 'transfer'] },
  { key: 'escalation', label: 'Rent Escalation', keywords: ['escalat', 'increase', 'rent adjust'] },
  { key: 'cam_cap', label: 'CAM Cap', keywords: ['cam', 'common area', 'cap', 'operating'] },
  { key: 'renewal', label: 'Renewal', keywords: ['renew', 'option', 'extend'] },
  { key: 'termination', label: 'Termination', keywords: ['terminat', 'cancel', 'surrender', 'exit'] },
]

function mapClauseToHeatmapCell(
  clauseScores: PortfolioLocation['clause_scores'],
  columnKeywords: string[]
): { severity: 'red' | 'yellow' | 'green' | 'gray'; summary: string } {
  for (const clause of clauseScores) {
    const lower = clause.clause.toLowerCase()
    if (columnKeywords.some(kw => lower.includes(kw))) {
      return { severity: clause.severity, summary: clause.summary }
    }
  }
  return { severity: 'gray', summary: 'No data' }
}

const SEVERITY_DOT: Record<string, string> = {
  red: 'bg-red-500',
  yellow: 'bg-amber-500',
  green: 'bg-emerald-500',
  gray: 'bg-white/10',
}

// ── Chart tooltip style ──────────────────────────────────────────────────────
const tooltipStyle = {
  contentStyle: {
    background: 'rgba(15,15,25,0.95)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '12px',
    fontSize: '13px',
    color: '#e2e8f0',
    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
  },
  labelStyle: { color: '#94a3b8', fontSize: '11px', fontWeight: 600 },
}

// ── Mini circular gauge ──────────────────────────────────────────────────────
function MiniGauge({ score }: { score: number }) {
  const color = getRiskColor(score)
  const radius = 20
  const circumference = 2 * Math.PI * radius
  const progress = (score / 100) * circumference
  const offset = circumference - progress

  return (
    <svg width="52" height="52" className="-rotate-90">
      <circle cx="26" cy="26" r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="5" />
      <circle
        cx="26" cy="26" r={radius} fill="none" stroke={color} strokeWidth="5"
        strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset}
        style={{ transition: 'stroke-dashoffset 1s ease' }}
      />
      <text
        x="26" y="26" textAnchor="middle" dominantBaseline="central"
        fill={color} fontSize="14" fontWeight="800"
        className="rotate-90 origin-center"
      >
        {score}
      </text>
    </svg>
  )
}

// ── Main Component ───────────────────────────────────────────────────────────

export function PortfolioClient({ userName }: { userName: string }) {
  const [data, setData] = useState<PortfolioData | null>(null)
  const [loading, setLoading] = useState(true)
  const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [heatmapSort, setHeatmapSort] = useState<{ col: string; asc: boolean } | null>(null)
  const [hoveredCell, setHoveredCell] = useState<{ locId: string; col: string } | null>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/portfolio')
      .then(r => r.json())
      .then(d => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  // ── Portfolio AI chat ────────────────────────────────────────────────────────
  const sendChat = useCallback(async () => {
    if (!chatInput.trim() || chatLoading) return
    const userMsg = chatInput.trim()
    setChatInput('')
    setChatMessages(prev => [...prev, { role: 'user', content: userMsg }])
    setChatLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ id: crypto.randomUUID(), role: 'user', parts: [{ type: 'text', text: userMsg }] }],
          store_id: null, // null = search across ALL stores
        }),
      })

      if (!res.ok) {
        setChatMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, something went wrong. Please try again.' }])
        return
      }

      // Read streamed response
      const reader = res.body?.getReader()
      if (!reader) return
      const decoder = new TextDecoder()
      let assistantText = ''
      setChatMessages(prev => [...prev, { role: 'assistant', content: '' }])

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        // Parse SSE: extract text parts from the stream
        const lines = chunk.split('\n')
        for (const line of lines) {
          // Vercel AI SDK streams text as: 0:"text content"
          if (line.startsWith('0:')) {
            try {
              const text = JSON.parse(line.slice(2))
              if (typeof text === 'string') {
                assistantText += text
                setChatMessages(prev => {
                  const updated = [...prev]
                  updated[updated.length - 1] = { role: 'assistant', content: assistantText }
                  return updated
                })
              }
            } catch {
              // skip non-JSON lines
            }
          }
        }
      }
    } catch {
      setChatMessages(prev => [...prev, { role: 'assistant', content: 'Network error. Please try again.' }])
    } finally {
      setChatLoading(false)
    }
  }, [chatInput, chatLoading])

  // ── Heatmap sorting ──────────────────────────────────────────────────────────
  const sortedLocations = data?.locations ? [...data.locations] : []
  if (heatmapSort && data) {
    const col = HEATMAP_COLUMNS.find(c => c.key === heatmapSort.col)
    if (col) {
      const severityOrder: Record<string, number> = { red: 0, yellow: 1, green: 2, gray: 3 }
      sortedLocations.sort((a, b) => {
        const aCell = mapClauseToHeatmapCell(a.clause_scores, col.keywords)
        const bCell = mapClauseToHeatmapCell(b.clause_scores, col.keywords)
        const diff = severityOrder[aCell.severity] - severityOrder[bCell.severity]
        return heatmapSort.asc ? diff : -diff
      })
    }
  }

  // ── Loading state ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen">
        <Header userName={userName} />
        <main className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-400/60" />
          </div>
        </main>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen">
        <Header userName={userName} />
        <main className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
          <div className="glass-card rounded-2xl p-12 text-center">
            <p className="text-muted-foreground">Failed to load portfolio data. Please refresh.</p>
          </div>
        </main>
      </div>
    )
  }

  const upcomingCount = data.upcoming_critical_dates.filter(d => getDaysUntil(d.date_value) > 0 && getDaysUntil(d.date_value) <= 90).length

  // ── Chart data ─────────────────────────────────────────────────────────────
  const expiryData = data.locations
    .filter(l => l.lease_expiry)
    .map(l => ({
      name: l.store_name.length > 18 ? l.store_name.slice(0, 16) + '…' : l.store_name,
      fullName: l.store_name,
      years: l.years_remaining ?? 0,
      expiry: l.lease_expiry,
      color: getExpiryColor(l.years_remaining),
    }))

  const riskData = data.locations
    .filter(l => l.risk_score != null)
    .map(l => ({
      name: l.store_name.length > 18 ? l.store_name.slice(0, 16) + '…' : l.store_name,
      fullName: l.store_name,
      score: l.risk_score!,
      topRisk: l.top_risk,
      color: getRiskColor(l.risk_score),
    }))

  const rentData = data.locations
    .filter(l => l.annual_rent != null && l.annual_rent > 0)
    .sort((a, b) => (b.annual_rent ?? 0) - (a.annual_rent ?? 0))
    .map(l => ({
      name: l.store_name.length > 18 ? l.store_name.slice(0, 16) + '…' : l.store_name,
      fullName: l.store_name,
      rent: l.annual_rent!,
    }))

  const exampleQuestions = [
    'Which locations have the highest risk?',
    'How many leases expire in the next 3 years?',
    'Compare my rent per square foot across locations',
    'What are my total CAM obligations?',
  ]

  return (
    <div className="min-h-screen">
      <Header userName={userName} />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10 space-y-8">
        {/* ── Page header ───────────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <BarChart3 className="h-4 w-4 text-emerald-400/60" />
              <span className="text-xs font-medium text-emerald-400/70 uppercase tracking-widest">
                Portfolio Analytics
              </span>
            </div>
            <h1 className="text-3xl font-bold">Portfolio Overview</h1>
            <p className="text-muted-foreground text-sm mt-1.5 font-light">
              {data.total_locations} location{data.total_locations !== 1 ? 's' : ''} in your portfolio
            </p>
          </div>
          <Link href="/dashboard">
            <button
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
              style={{
                background: 'linear-gradient(135deg, rgba(16,185,129,0.9), rgba(13,148,136,0.9))',
                border: '1px solid rgba(16,185,129,0.3)',
              }}
            >
              <Plus className="h-4 w-4" />
              Add Location
            </button>
          </Link>
        </div>

        {/* ── Stats bar ─────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            icon={<Building2 className="h-5 w-5 text-emerald-400" />}
            label="Total Locations"
            value={String(data.total_locations)}
          />
          <StatCard
            icon={data.average_risk_score != null
              ? <MiniGauge score={data.average_risk_score} />
              : <ShieldCheck className="h-5 w-5 text-white/30" />}
            label="Avg Risk Score"
            value={data.average_risk_score != null ? '' : 'N/A'}
            isGauge={data.average_risk_score != null}
          />
          <StatCard
            icon={<DollarSign className="h-5 w-5 text-emerald-400" />}
            label="Total Annual Rent"
            value={data.total_annual_rent ? formatCurrency(data.total_annual_rent) : 'N/A'}
          />
          <StatCard
            icon={<CalendarClock className="h-5 w-5" style={{ color: upcomingCount > 0 ? '#f59e0b' : '#10b981' }} />}
            label="Critical Dates (90d)"
            value={String(upcomingCount)}
            urgent={upcomingCount > 0}
          />
        </div>

        {/* ── Chart 1: Lease Expiration Timeline ────────────────────────────── */}
        {expiryData.length > 0 && (
          <div className="glass-card rounded-2xl p-6">
            <p className="text-xs font-semibold text-muted-foreground/80 uppercase tracking-widest mb-5">
              Lease Expiration Timeline
            </p>
            <div style={{ height: Math.max(280, expiryData.length * 40) }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={expiryData} margin={{ top: 10, right: 20, left: 10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis
                    dataKey="name" tick={{ fill: '#94a3b8', fontSize: 12 }}
                    axisLine={{ stroke: 'rgba(255,255,255,0.08)' }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: '#94a3b8', fontSize: 12 }}
                    axisLine={{ stroke: 'rgba(255,255,255,0.08)' }}
                    tickLine={false}
                    label={{ value: 'Years Remaining', angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 11, dx: -5 }}
                  />
                  <ReferenceLine y={0} stroke="rgba(255,255,255,0.15)" strokeWidth={1} />
                  <Tooltip
                    {...tooltipStyle}
                    formatter={(value, _name, props) => {
                      const yr = Number(value).toFixed(1)
                      const p = props?.payload as { fullName?: string; expiry?: string | null } | undefined
                      return [`${yr} years (expires ${p?.expiry ?? 'N/A'})`, p?.fullName ?? '']
                    }}
                  />
                  <Bar dataKey="years" radius={[6, 6, 0, 0]} maxBarSize={48}>
                    {expiryData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.color} fillOpacity={0.85} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* ── Chart 2: Risk Score Comparison ─────────────────────────────────── */}
        {riskData.length > 0 && (
          <div className="glass-card rounded-2xl p-6">
            <p className="text-xs font-semibold text-muted-foreground/80 uppercase tracking-widest mb-5">
              Risk Score Comparison
            </p>
            <div style={{ height: Math.max(280, riskData.length * 40) }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={riskData} margin={{ top: 10, right: 20, left: 10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis
                    dataKey="name" tick={{ fill: '#94a3b8', fontSize: 12 }}
                    axisLine={{ stroke: 'rgba(255,255,255,0.08)' }}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fill: '#94a3b8', fontSize: 12 }}
                    axisLine={{ stroke: 'rgba(255,255,255,0.08)' }}
                    tickLine={false}
                  />
                  <ReferenceLine y={50} stroke="rgba(239,68,68,0.3)" strokeDasharray="4 4" label={{ value: '50', fill: '#ef4444', fontSize: 10, position: 'right' }} />
                  <ReferenceLine y={80} stroke="rgba(16,185,129,0.3)" strokeDasharray="4 4" label={{ value: '80', fill: '#10b981', fontSize: 10, position: 'right' }} />
                  <Tooltip
                    {...tooltipStyle}
                    formatter={(value, _name, props) => {
                      const p = props?.payload as { fullName?: string; topRisk?: string | null } | undefined
                      return [`Score: ${value}${p?.topRisk ? ` — Top risk: ${p.topRisk}` : ''}`, p?.fullName ?? '']
                    }}
                  />
                  <Bar dataKey="score" radius={[6, 6, 0, 0]} maxBarSize={48}>
                    {riskData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.color} fillOpacity={0.85} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* ── Row: Rent Chart + Heatmap ──────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Chart 3: Rent Comparison */}
          {rentData.length > 0 && (
            <div className="glass-card rounded-2xl p-6">
              <p className="text-xs font-semibold text-muted-foreground/80 uppercase tracking-widest mb-5">
                Annual Rent by Location
              </p>
              <div style={{ height: Math.max(250, rentData.length * 44) }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={rentData} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
                    <XAxis
                      type="number"
                      tick={{ fill: '#94a3b8', fontSize: 11 }}
                      axisLine={{ stroke: 'rgba(255,255,255,0.08)' }}
                      tickLine={false}
                      tickFormatter={(v: number) => formatCurrency(v)}
                    />
                    <YAxis
                      type="category" dataKey="name" width={120}
                      tick={{ fill: '#94a3b8', fontSize: 12 }}
                      axisLine={{ stroke: 'rgba(255,255,255,0.08)' }}
                      tickLine={false}
                    />
                    <Tooltip
                      {...tooltipStyle}
                      formatter={(value, _name, props) => {
                        const p = props?.payload as { fullName?: string } | undefined
                        return [formatCurrency(Number(value)), p?.fullName ?? '']
                      }}
                    />
                    <Bar dataKey="rent" radius={[0, 6, 6, 0]} maxBarSize={32}>
                      {rentData.map((_entry, idx) => (
                        <Cell key={idx} fill={`url(#emeraldGradient)`} />
                      ))}
                    </Bar>
                    <defs>
                      <linearGradient id="emeraldGradient" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#10b981" stopOpacity={0.7} />
                        <stop offset="100%" stopColor="#14b8a6" stopOpacity={0.9} />
                      </linearGradient>
                    </defs>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Chart 4: Risk Heatmap Table */}
          <div className="glass-card rounded-2xl p-6 overflow-hidden">
            <p className="text-xs font-semibold text-muted-foreground/80 uppercase tracking-widest mb-5">
              Clause Risk Heatmap
            </p>
            {sortedLocations.length > 0 ? (
              <div className="overflow-x-auto -mx-2">
                <table className="w-full min-w-[480px] text-xs">
                  <thead>
                    <tr className="border-b border-white/[0.06]">
                      <th className="text-left py-2 px-2 font-semibold text-muted-foreground/60">Location</th>
                      {HEATMAP_COLUMNS.map(col => (
                        <th
                          key={col.key}
                          className="text-center py-2 px-1.5 font-semibold text-muted-foreground/60 cursor-pointer hover:text-white/60 transition-colors select-none"
                          onClick={() =>
                            setHeatmapSort(prev =>
                              prev?.col === col.key
                                ? { col: col.key, asc: !prev.asc }
                                : { col: col.key, asc: true }
                            )
                          }
                        >
                          <span className="inline-flex items-center gap-0.5">
                            {col.label}
                            {heatmapSort?.col === col.key && (
                              heatmapSort.asc
                                ? <ChevronUp className="h-3 w-3" />
                                : <ChevronDown className="h-3 w-3" />
                            )}
                          </span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sortedLocations.map(loc => (
                      <tr key={loc.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                        <td className="py-2.5 px-2">
                          <Link
                            href={`/location/${loc.id}`}
                            className="text-white/80 hover:text-emerald-400 transition-colors font-medium truncate block max-w-[130px]"
                            title={loc.store_name}
                          >
                            {loc.store_name}
                          </Link>
                        </td>
                        {HEATMAP_COLUMNS.map(col => {
                          const cell = mapClauseToHeatmapCell(loc.clause_scores, col.keywords)
                          const isHovered = hoveredCell?.locId === loc.id && hoveredCell?.col === col.key
                          return (
                            <td key={col.key} className="text-center py-2.5 px-1.5 relative">
                              <Link href={`/location/${loc.id}`}>
                                <span
                                  className={`inline-block w-3.5 h-3.5 rounded-full ${SEVERITY_DOT[cell.severity]} cursor-pointer transition-transform hover:scale-125`}
                                  onMouseEnter={() => setHoveredCell({ locId: loc.id, col: col.key })}
                                  onMouseLeave={() => setHoveredCell(null)}
                                />
                              </Link>
                              {isHovered && cell.severity !== 'gray' && (
                                <div
                                  className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-52 p-2.5 rounded-lg text-left"
                                  style={{
                                    background: 'rgba(15,15,25,0.95)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                                  }}
                                >
                                  <p className="text-[11px] text-white/70 leading-relaxed">{cell.summary}</p>
                                </div>
                              )}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground/50 text-center py-8">
                No risk data yet. Analyze your leases to see the heatmap.
              </p>
            )}

            {/* Legend */}
            <div className="flex items-center gap-4 mt-4 pt-3 border-t border-white/[0.05]">
              {[
                { color: 'bg-red-500', label: 'High Risk' },
                { color: 'bg-amber-500', label: 'Moderate' },
                { color: 'bg-emerald-500', label: 'Low Risk' },
                { color: 'bg-white/10', label: 'No Data' },
              ].map(item => (
                <span key={item.label} className="flex items-center gap-1.5 text-[10px] text-white/40">
                  <span className={`w-2.5 h-2.5 rounded-full ${item.color}`} />
                  {item.label}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* ── Critical Dates ─────────────────────────────────────────────────── */}
        {data.upcoming_critical_dates.length > 0 && (
          <div className="glass-card rounded-2xl p-6">
            <p className="text-xs font-semibold text-muted-foreground/80 uppercase tracking-widest mb-5">
              Upcoming Critical Dates
            </p>
            <div className="space-y-2">
              {data.upcoming_critical_dates.map((d, i) => {
                const days = getDaysUntil(d.date_value)
                const urgency = getUrgencyColor(days)
                const isPast = days < 0
                return (
                  <Link
                    key={i}
                    href={`/location/${d.store_id}`}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all hover:bg-white/[0.03] ${isPast ? 'opacity-50' : ''}`}
                    style={{ border: '1px solid rgba(255,255,255,0.04)' }}
                  >
                    <span
                      className={`shrink-0 text-[10px] font-bold px-2 py-1 rounded-md ${urgency.text}`}
                      style={{ background: urgency.bg, border: `1px solid ${urgency.border}`, minWidth: '42px', textAlign: 'center' }}
                    >
                      {urgency.label}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {d.description || d.date_type.replace(/_/g, ' ')}
                      </p>
                      <p className="text-[11px] text-muted-foreground/50">
                        {new Date(d.date_value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        {' — '}{d.store_name}
                      </p>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-white/20 shrink-0" />
                  </Link>
                )
              })}
            </div>
          </div>
        )}

        {/* ── Portfolio AI Chat ──────────────────────────────────────────────── */}
        <div className="glass-card rounded-2xl p-6">
          <p className="text-xs font-semibold text-muted-foreground/80 uppercase tracking-widest mb-4">
            Portfolio AI Chat
          </p>

          {/* Example chips */}
          {chatMessages.length === 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {exampleQuestions.map(q => (
                <button
                  key={q}
                  onClick={() => { setChatInput(q) }}
                  className="text-xs px-3 py-1.5 rounded-lg text-emerald-400/80 hover:text-emerald-300 transition-colors"
                  style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.15)' }}
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* Messages */}
          {chatMessages.length > 0 && (
            <div className="space-y-3 mb-4 max-h-80 overflow-y-auto pr-2">
              {chatMessages.map((msg, i) => (
                <div
                  key={i}
                  className={`text-sm leading-relaxed px-4 py-3 rounded-xl ${
                    msg.role === 'user'
                      ? 'bg-emerald-500/10 border border-emerald-500/15 ml-8'
                      : 'bg-white/[0.03] border border-white/[0.06] mr-8'
                  }`}
                >
                  <p className={`text-[10px] font-semibold uppercase tracking-wider mb-1 ${
                    msg.role === 'user' ? 'text-emerald-400/60' : 'text-white/30'
                  }`}>
                    {msg.role === 'user' ? 'You' : 'Provelo AI'}
                  </p>
                  <p className="text-white/80 whitespace-pre-wrap">{msg.content || (chatLoading && i === chatMessages.length - 1 ? '...' : '')}</p>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
          )}

          {/* Input */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendChat()}
              placeholder="Ask about your entire portfolio..."
              className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-emerald-500/30 transition-colors"
              disabled={chatLoading}
            />
            <button
              onClick={sendChat}
              disabled={chatLoading || !chatInput.trim()}
              className="flex items-center justify-center w-11 h-11 rounded-xl transition-all disabled:opacity-30"
              style={{
                background: 'linear-gradient(135deg, rgba(16,185,129,0.9), rgba(13,148,136,0.9))',
                border: '1px solid rgba(16,185,129,0.3)',
              }}
            >
              {chatLoading ? <Loader2 className="h-4 w-4 animate-spin text-white" /> : <Send className="h-4 w-4 text-white" />}
            </button>
          </div>
          <p className="text-[10px] text-white/20 mt-2 italic">
            Searches across all your locations&apos; lease documents. Always specify which location info comes from.
          </p>
        </div>
      </main>
    </div>
  )
}

// ── Sub-components ───────────────────────────────────────────────────────────

function Header({ userName }: { userName: string }) {
  return (
    <header className="glass border-b border-white/[0.07] px-4 sm:px-6 py-4 flex items-center justify-between">
      <div className="flex items-center gap-5">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div
            className="flex items-center justify-center w-8 h-8 rounded-xl transition-opacity group-hover:opacity-80"
            style={{
              background: 'linear-gradient(135deg, rgba(16,185,129,0.25), rgba(20,184,166,0.15))',
              border: '1px solid rgba(16,185,129,0.2)',
            }}
          >
            <span className="text-xs font-extrabold text-emerald-400">PV</span>
          </div>
          <span className="font-bold text-base tracking-tight">Provelo</span>
        </Link>
        <nav className="hidden sm:flex items-center gap-1">
          <Link href="/dashboard" className="text-sm text-muted-foreground/70 hover:text-foreground/90 font-medium px-3 py-1.5 rounded-lg hover:bg-white/[0.04] transition-colors">
            Dashboard
          </Link>
          <Link href="/portfolio" className="text-sm text-foreground/90 font-medium px-3 py-1.5 rounded-lg bg-white/[0.06]">
            Portfolio
          </Link>
          <Link href="/settings" className="text-sm text-muted-foreground/70 hover:text-foreground/90 font-medium px-3 py-1.5 rounded-lg hover:bg-white/[0.04] transition-colors">
            Settings
          </Link>
        </nav>
      </div>
      <form action="/api/auth/signout" method="POST" className="hidden sm:block">
        <button className="text-sm text-muted-foreground/85 hover:text-foreground transition-colors">
          Sign out
        </button>
      </form>
      {/* Mobile hamburger menu */}
      <details className="sm:hidden relative">
        <summary className="list-none cursor-pointer p-2 text-muted-foreground">
          <Menu className="h-5 w-5" />
        </summary>
        <div className="absolute right-0 top-full mt-1 w-44 rounded-xl glass-card p-2 z-50">
          <Link href="/dashboard" className="block px-3 py-2.5 text-sm rounded-lg hover:bg-white/[0.06] transition-colors">Dashboard</Link>
          <Link href="/portfolio" className="block px-3 py-2.5 text-sm rounded-lg bg-white/[0.06]">Portfolio</Link>
          <Link href="/settings" className="block px-3 py-2.5 text-sm rounded-lg hover:bg-white/[0.06] transition-colors">Settings</Link>
          <form action="/api/auth/signout" method="POST">
            <button className="w-full text-left px-3 py-2.5 text-sm rounded-lg hover:bg-white/[0.06] text-muted-foreground transition-colors">
              Sign out
            </button>
          </form>
        </div>
      </details>
    </header>
  )
}

function StatCard({ icon, label, value, isGauge, urgent }: {
  icon: React.ReactNode
  label: string
  value: string
  isGauge?: boolean
  urgent?: boolean
}) {
  return (
    <div
      className="rounded-xl px-4 py-4 flex items-center gap-3"
      style={{
        background: 'rgba(255,255,255,0.03)',
        backdropFilter: 'blur(20px)',
        border: `1px solid ${urgent ? 'rgba(245,158,11,0.20)' : 'rgba(255,255,255,0.06)'}`,
      }}
    >
      <div className="shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold text-muted-foreground/50 uppercase tracking-wider">{label}</p>
        {!isGauge && <p className="text-xl font-bold mt-0.5">{value}</p>}
      </div>
    </div>
  )
}
