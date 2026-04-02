'use client'

import { useState, useEffect } from 'react'
import {
  Calendar, AlertCircle, AlertTriangle,
  ChevronDown, Bell,
} from 'lucide-react'

interface CriticalDate {
  id: string
  date_type: string
  date_value: string | null
  description: string
  alert_days_before: number
  store_id: string | null
}

interface CriticalDatesCardProps {
  storeId: string
}

function daysUntil(dateStr: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const d = new Date(dateStr + 'T00:00:00')
  return Math.round((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatCountdown(days: number): string {
  if (days === 0) return 'Today'
  if (days === 1) return 'Tomorrow'
  if (days < 0) return `${Math.abs(days)} days ago`
  if (days <= 30) return `${days} days`
  if (days < 60) return `${Math.round(days / 7)} weeks`
  if (days < 365) {
    const months = Math.round(days / 30)
    return `${months} month${months !== 1 ? 's' : ''}`
  }
  const years = Math.round((days / 365) * 10) / 10
  return `${years} year${years !== 1 ? 's' : ''}`
}

type UrgencyLevel = 'critical' | 'warning' | 'safe' | 'distant' | 'past'

function getUrgency(days: number): UrgencyLevel {
  if (days < 0) return 'past'
  if (days <= 30) return 'critical'
  if (days <= 90) return 'warning'
  if (days <= 365) return 'safe'
  return 'distant'
}

const URGENCY_CONFIG: Record<UrgencyLevel, {
  bgColor: string; borderColor: string; iconColor: string;
  textColor: string; badgeBg: string; badgeBorder: string; badgeText: string
}> = {
  critical: {
    bgColor: 'rgba(239,68,68,0.10)', borderColor: 'rgba(239,68,68,0.22)',
    iconColor: 'text-red-400', textColor: 'text-red-300',
    badgeBg: 'bg-red-500/20', badgeBorder: 'border-red-500/35', badgeText: 'text-red-400',
  },
  warning: {
    bgColor: 'rgba(245,158,11,0.08)', borderColor: 'rgba(245,158,11,0.20)',
    iconColor: 'text-amber-400', textColor: 'text-amber-300',
    badgeBg: 'bg-amber-500/15', badgeBorder: 'border-amber-500/25', badgeText: 'text-amber-400',
  },
  safe: {
    bgColor: 'rgba(16,185,129,0.08)', borderColor: 'rgba(16,185,129,0.18)',
    iconColor: 'text-emerald-400', textColor: 'text-emerald-300',
    badgeBg: 'bg-emerald-500/12', badgeBorder: 'border-emerald-500/20', badgeText: 'text-emerald-400/80',
  },
  distant: {
    bgColor: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.07)',
    iconColor: 'text-white/40', textColor: 'text-white/60',
    badgeBg: 'bg-white/[0.05]', badgeBorder: 'border-white/[0.08]', badgeText: 'text-white/50',
  },
  past: {
    bgColor: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.05)',
    iconColor: 'text-white/25', textColor: 'text-white/35',
    badgeBg: 'bg-white/[0.04]', badgeBorder: 'border-white/[0.06]', badgeText: 'text-white/35',
  },
}

const DATE_GUIDANCE: Record<string, string> = {
  'Lease Expiration': 'Start renewal negotiations at least 6-12 months before expiration. Review renewal option terms in your lease.',
  'Renewal Option Deadline': 'You must exercise your renewal option by this date. Send written notice to your landlord as specified in the lease.',
  'Rent Commencement': 'Verify that the premises are ready for occupancy and any tenant improvement allowances have been applied.',
  'Rent Escalation': 'Review the escalation terms in your lease. Verify the new rent amount matches the lease schedule.',
  'Option Exercise Deadline': 'If you want to exercise this option, provide written notice before this deadline per the lease terms.',
  'Insurance Renewal': 'Ensure your insurance certificates are updated and provided to the landlord before this date.',
  'CAM Reconciliation': 'Review the annual CAM reconciliation statement carefully. You may have a right to audit within a specified window.',
  'Lease Commencement': 'The lease term officially begins on this date. Ensure all pre-commencement conditions have been met.',
}

function getGuidance(dateType: string): string | null {
  for (const [key, guidance] of Object.entries(DATE_GUIDANCE)) {
    if (dateType.toLowerCase().includes(key.toLowerCase())) return guidance
  }
  return null
}

type ProcessedDate = CriticalDate & { days: number; urgency: UrgencyLevel }

export function CriticalDatesCard({ storeId }: CriticalDatesCardProps) {
  const [dates, setDates] = useState<ProcessedDate[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showPast, setShowPast] = useState(false)

  useEffect(() => {
    fetch(`/api/critical-dates?store_id=${storeId}`)
      .then(r => r.json())
      .then(data => {
        const processed: ProcessedDate[] = (data.dates ?? [])
          .filter((d: CriticalDate) => d.date_value)
          .map((d: CriticalDate) => {
            const days = daysUntil(d.date_value!)
            return { ...d, days, urgency: getUrgency(days) }
          })
          .sort((a: ProcessedDate, b: ProcessedDate) => {
            if (a.days >= 0 && b.days >= 0) return a.days - b.days
            if (a.days < 0 && b.days < 0) return b.days - a.days
            return a.days >= 0 ? -1 : 1
          })
        setDates(processed)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [storeId])

  if (loading) {
    return (
      <div>
        <p className="text-[10px] font-semibold text-white/35 uppercase tracking-widest mb-4">
          Critical Dates
        </p>
        <div className="space-y-2.5">
          {[1, 2, 3].map(i => (
            <div key={i} className="glass-card rounded-xl px-5 py-4 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-white/[0.06]" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 bg-white/[0.06] rounded w-32" />
                  <div className="h-2.5 bg-white/[0.04] rounded w-24" />
                </div>
                <div className="h-6 bg-white/[0.06] rounded-md w-16" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (dates.length === 0) return null

  const upcomingDates = dates.filter(d => d.days >= 0)
  const pastDates = dates.filter(d => d.days < 0)
  const urgentCount = dates.filter(d => d.urgency === 'critical').length
  const warningCount = dates.filter(d => d.urgency === 'warning').length
  const visibleDates = showPast ? dates : upcomingDates

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <p className="text-[10px] font-semibold text-white/35 uppercase tracking-widest">
          Critical Dates
        </p>
        {urgentCount > 0 && (
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/25">
            <AlertCircle className="h-3 w-3" />
            {urgentCount} urgent
          </span>
        )}
        {warningCount > 0 && (
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-500/12 text-amber-400 border border-amber-500/20">
            <AlertTriangle className="h-3 w-3" />
            {warningCount} upcoming
          </span>
        )}
      </div>

      <div className="space-y-2.5">
        {visibleDates.map(date => {
          const config = URGENCY_CONFIG[date.urgency]
          const guidance = getGuidance(date.date_type)

          return (
            <div
              key={date.id}
              className="rounded-xl overflow-hidden transition-all"
              style={{ background: config.bgColor, border: `1px solid ${config.borderColor}` }}
            >
              {/* Main row */}
              <button
                onClick={() => setExpandedId(expandedId === date.id ? null : date.id)}
                className="w-full px-4 py-3.5 flex items-center gap-3 text-left"
              >
                <div
                  className="flex items-center justify-center w-9 h-9 rounded-lg shrink-0"
                  style={{ background: config.bgColor, border: `1px solid ${config.borderColor}` }}
                >
                  {date.urgency === 'critical' ? (
                    <AlertCircle className={`h-4 w-4 ${config.iconColor}`} />
                  ) : date.urgency === 'warning' ? (
                    <AlertTriangle className={`h-4 w-4 ${config.iconColor}`} />
                  ) : (
                    <Calendar className={`h-4 w-4 ${config.iconColor}`} />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold ${date.urgency === 'past' ? 'text-white/40' : ''}`}>
                    {date.date_type}
                  </p>
                  <p className={`text-xs ${date.urgency === 'past' ? 'text-white/25' : 'text-white/50'}`}>
                    {date.date_value ? formatDate(date.date_value) : 'Date unknown'}
                  </p>
                </div>

                {/* Countdown badge */}
                <span className={`shrink-0 text-xs font-semibold px-2.5 py-1 rounded-md border ${config.badgeBg} ${config.badgeBorder} ${config.badgeText}`}>
                  {date.days === 0 ? 'Today' : date.days < 0 ? 'Passed' : formatCountdown(date.days)}
                </span>

                <ChevronDown className={`h-3.5 w-3.5 text-white/30 transition-transform ${expandedId === date.id ? 'rotate-180' : ''}`} />
              </button>

              {/* Expanded details */}
              {expandedId === date.id && (
                <div className="px-4 pb-4 pt-1 space-y-2 border-t" style={{ borderColor: config.borderColor }}>
                  {date.description && (
                    <p className="text-xs text-white/60 leading-relaxed">{date.description}</p>
                  )}
                  {guidance && (
                    <div className="flex items-start gap-2 mt-2">
                      <Bell className="h-3.5 w-3.5 text-emerald-400/60 mt-0.5 shrink-0" />
                      <p className="text-xs text-emerald-300/70 leading-relaxed italic">
                        {guidance}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Toggle past dates */}
      {pastDates.length > 0 && (
        <button
          onClick={() => setShowPast(!showPast)}
          className="mt-3 text-xs text-white/40 hover:text-white/60 transition-colors flex items-center gap-1"
        >
          <ChevronDown className={`h-3 w-3 transition-transform ${showPast ? 'rotate-180' : ''}`} />
          {showPast ? 'Hide' : 'Show'} {pastDates.length} past date{pastDates.length !== 1 ? 's' : ''}
        </button>
      )}
    </div>
  )
}
