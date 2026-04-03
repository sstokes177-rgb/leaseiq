'use client'

import { useState, useEffect, useRef } from 'react'
import {
  Calendar, AlertCircle, AlertTriangle,
  ChevronDown, ChevronLeft, ChevronRight, Bell,
  List, CalendarDays, X, Plus, Check,
} from 'lucide-react'

// ── Types ────────────────────────────────────────────────────────────────────

interface CriticalDate {
  id: string
  date_type: string
  date_value: string | null
  description: string
  alert_days_before: number
  store_id: string | null
  store_name?: string | null
  reminder_days?: number[] | null
}

interface CriticalDatesCardProps {
  storeId?: string
  crossLocation?: boolean
}

// ── Utilities ────────────────────────────────────────────────────────────────

function daysUntil(dateStr: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const d = new Date(dateStr + 'T00:00:00')
  return Math.round((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
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

type UrgencyLevel = 'critical' | 'warning' | 'safe' | 'past'

function getUrgency(days: number): UrgencyLevel {
  if (days < 0) return 'past'
  if (days <= 30) return 'critical'
  if (days <= 90) return 'warning'
  return 'safe'
}

const URGENCY_CONFIG: Record<UrgencyLevel, {
  bgColor: string; borderColor: string; iconColor: string;
  textColor: string; badgeBg: string; badgeBorder: string; badgeText: string;
  dotColor: string
}> = {
  critical: {
    bgColor: 'rgba(239,68,68,0.10)', borderColor: 'rgba(239,68,68,0.22)',
    iconColor: 'text-red-400', textColor: 'text-red-300',
    badgeBg: 'bg-red-500/20', badgeBorder: 'border-red-500/35', badgeText: 'text-red-400',
    dotColor: 'bg-red-500',
  },
  warning: {
    bgColor: 'rgba(245,158,11,0.08)', borderColor: 'rgba(245,158,11,0.20)',
    iconColor: 'text-amber-400', textColor: 'text-amber-300',
    badgeBg: 'bg-amber-500/15', badgeBorder: 'border-amber-500/25', badgeText: 'text-amber-400',
    dotColor: 'bg-amber-500',
  },
  safe: {
    bgColor: 'rgba(16,185,129,0.08)', borderColor: 'rgba(16,185,129,0.18)',
    iconColor: 'text-emerald-400', textColor: 'text-emerald-300',
    badgeBg: 'bg-emerald-500/12', badgeBorder: 'border-emerald-500/20', badgeText: 'text-emerald-400/80',
    dotColor: 'bg-emerald-500',
  },
  past: {
    bgColor: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.05)',
    iconColor: 'text-white/25', textColor: 'text-white/35',
    badgeBg: 'bg-white/[0.04]', badgeBorder: 'border-white/[0.06]', badgeText: 'text-white/35',
    dotColor: 'bg-white/20',
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

const REMINDER_OPTIONS = [7, 14, 30, 60, 90, 120, 180, 210, 365]

type ProcessedDate = CriticalDate & { days: number; urgency: UrgencyLevel }

// ── Time grouping for cross-location ─────────────────────────────────────────

type TimeGroup = 'This Month' | 'Next 3 Months' | 'Next 6 Months' | 'Beyond 6 Months' | 'Past'

function getTimeGroup(days: number): TimeGroup {
  if (days < 0) return 'Past'
  if (days <= 30) return 'This Month'
  if (days <= 90) return 'Next 3 Months'
  if (days <= 180) return 'Next 6 Months'
  return 'Beyond 6 Months'
}

const TIME_GROUP_ORDER: TimeGroup[] = ['This Month', 'Next 3 Months', 'Next 6 Months', 'Beyond 6 Months', 'Past']

// ── Month Calendar ───────────────────────────────────────────────────────────

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function MonthCalendar({ dates }: { dates: ProcessedDate[] }) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [selectedDay, setSelectedDay] = useState<number | null>(null)
  const popoverRef = useRef<HTMLDivElement>(null)

  // Close popover on outside click
  useEffect(() => {
    if (selectedDay === null) return
    const handler = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setSelectedDay(null)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [selectedDay])

  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstDayOfWeek = new Date(year, month, 1).getDay()

  // Index dates by day-of-month for the visible month
  const datesByDay: Record<number, ProcessedDate[]> = {}
  for (const d of dates) {
    if (!d.date_value) continue
    const dt = new Date(d.date_value + 'T00:00:00')
    if (dt.getFullYear() === year && dt.getMonth() === month) {
      const day = dt.getDate()
      if (!datesByDay[day]) datesByDay[day] = []
      datesByDay[day].push(d)
    }
  }

  const isToday = (day: number) =>
    today.getFullYear() === year && today.getMonth() === month && today.getDate() === day

  const goPrev = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1) }
    else setMonth(m => m - 1)
    setSelectedDay(null)
  }

  const goNext = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1) }
    else setMonth(m => m + 1)
    setSelectedDay(null)
  }

  const goToday = () => {
    setYear(today.getFullYear())
    setMonth(today.getMonth())
    setSelectedDay(null)
  }

  // Build grid cells: leading empties + day cells
  const cells: (number | null)[] = []
  for (let i = 0; i < firstDayOfWeek; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  return (
    <div>
      {/* Navigation */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={goPrev} className="p-1.5 rounded-lg hover:bg-white/[0.06] text-white/50 hover:text-white transition-colors">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold">{MONTH_NAMES[month]} {year}</span>
          <button
            onClick={goToday}
            className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors"
          >
            Today
          </button>
        </div>
        <button onClick={goNext} className="p-1.5 rounded-lg hover:bg-white/[0.06] text-white/50 hover:text-white transition-colors">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Day names header */}
      <div className="grid grid-cols-7 mb-1">
        {DAY_NAMES.map(name => (
          <div key={name} className="text-center text-[10px] font-semibold text-white/30 uppercase tracking-wider py-1">
            {name}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-px" style={{ background: 'rgba(255,255,255,0.03)' }}>
        {cells.map((day, i) => {
          if (day === null) {
            return <div key={`empty-${i}`} className="min-h-[80px]" style={{ background: 'rgba(255,255,255,0.01)' }} />
          }

          const events = datesByDay[day] ?? []
          const hasEvents = events.length > 0
          const isTodayCell = isToday(day)
          const isSelected = selectedDay === day

          // Get most urgent level for this day
          const urgencies = events.map(e => e.urgency)
          const displayDots = events.slice(0, 3) // max 3 dots

          return (
            <div
              key={day}
              className={`min-h-[80px] p-1.5 relative transition-colors ${hasEvents ? 'cursor-pointer hover:bg-white/[0.04]' : ''}`}
              style={{
                background: isTodayCell ? 'rgba(16,185,129,0.06)' : 'rgba(0,0,0,0.15)',
                ...(isTodayCell ? { boxShadow: 'inset 0 0 0 1.5px rgba(16,185,129,0.35)' } : {}),
              }}
              onClick={() => hasEvents ? setSelectedDay(isSelected ? null : day) : undefined}
            >
              <span className={`text-xs font-medium ${isTodayCell ? 'text-emerald-400' : hasEvents ? 'text-white/80' : 'text-white/30'}`}>
                {day}
              </span>

              {/* Colored dots */}
              {hasEvents && (
                <div className="flex items-center gap-0.5 mt-1.5 flex-wrap">
                  {displayDots.map((event, j) => (
                    <span
                      key={j}
                      className={`w-2 h-2 rounded-full ${URGENCY_CONFIG[event.urgency].dotColor}`}
                      title={event.date_type}
                    />
                  ))}
                  {events.length > 3 && (
                    <span className="text-[9px] text-white/40 ml-0.5">+{events.length - 3}</span>
                  )}
                </div>
              )}

              {/* Day popover */}
              {isSelected && hasEvents && (
                <div
                  ref={popoverRef}
                  className="absolute z-50 left-0 top-full mt-1 w-64 rounded-xl p-3 space-y-2"
                  style={{
                    background: 'rgba(17,19,27,0.97)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255,255,255,0.10)',
                    boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
                  }}
                  onClick={e => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-white/60">
                      {MONTH_NAMES[month]} {day}, {year}
                    </span>
                    <button onClick={() => setSelectedDay(null)} className="text-white/30 hover:text-white/60">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                  {events.map(event => {
                    const config = URGENCY_CONFIG[event.urgency]
                    return (
                      <div key={event.id} className="rounded-lg px-3 py-2" style={{ background: config.bgColor, border: `1px solid ${config.borderColor}` }}>
                        <p className="text-xs font-semibold">{event.date_type}</p>
                        {event.description && <p className="text-[11px] text-white/50 mt-0.5">{event.description}</p>}
                        {event.store_name && <p className="text-[10px] text-emerald-400/60 mt-0.5">{event.store_name}</p>}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-3 pt-2 border-t border-white/[0.05]">
        {[
          { color: 'bg-red-500', label: '<30 days' },
          { color: 'bg-amber-500', label: '30-90 days' },
          { color: 'bg-emerald-500', label: '>90 days' },
          { color: 'bg-white/20', label: 'Past' },
        ].map(item => (
          <span key={item.label} className="flex items-center gap-1 text-[10px] text-white/35">
            <span className={`w-2 h-2 rounded-full ${item.color}`} />
            {item.label}
          </span>
        ))}
      </div>
    </div>
  )
}

// ── Reminder Popover ─────────────────────────────────────────────────────────

function ReminderPopover({ date, onUpdate }: { date: ProcessedDate; onUpdate: (id: string, days: number[]) => void }) {
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<number[]>(date.reminder_days ?? [30])
  const [saving, setSaving] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const toggle = (val: number) => {
    setSelected(prev => prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val].sort((a, b) => a - b))
  }

  const save = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/critical-dates', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: date.id, reminder_days: selected }),
      })
      if (res.ok) {
        onUpdate(date.id, selected)
        setOpen(false)
      }
    } catch { /* silent */ }
    finally { setSaving(false) }
  }

  const currentReminders = date.reminder_days ?? [30]

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={e => { e.stopPropagation(); setOpen(!open) }}
        className="flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-white/[0.04] hover:bg-white/[0.08] text-white/40 hover:text-white/60 border border-white/[0.06] transition-colors"
        title="Set reminders"
      >
        <Bell className="h-2.5 w-2.5" />
        {currentReminders.map(d => `${d}d`).join(', ')}
      </button>

      {open && (
        <div
          className="absolute z-50 right-0 top-full mt-2 w-56 rounded-xl p-3"
          style={{
            background: 'rgba(17,19,27,0.97)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.10)',
            boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
          }}
          onClick={e => e.stopPropagation()}
        >
          <p className="text-xs font-semibold text-white/60 mb-2">Remind me before</p>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {REMINDER_OPTIONS.map(opt => (
              <button
                key={opt}
                onClick={() => toggle(opt)}
                className={`text-[11px] font-medium px-2 py-1 rounded-md border transition-colors ${
                  selected.includes(opt)
                    ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                    : 'bg-white/[0.03] border-white/[0.06] text-white/40 hover:text-white/60 hover:bg-white/[0.06]'
                }`}
              >
                {opt}d
              </button>
            ))}
          </div>
          <button
            onClick={save}
            disabled={saving || selected.length === 0}
            className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold py-1.5 rounded-lg transition-all disabled:opacity-40"
            style={{
              background: 'linear-gradient(135deg, rgba(16,185,129,0.9), rgba(13,148,136,0.9))',
              border: '1px solid rgba(16,185,129,0.3)',
            }}
          >
            <Check className="h-3 w-3" />
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      )}
    </div>
  )
}

// ── Main Component ───────────────────────────────────────────────────────────

export function CriticalDatesCard({ storeId, crossLocation }: CriticalDatesCardProps) {
  const [dates, setDates] = useState<ProcessedDate[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showPast, setShowPast] = useState(false)
  const [view, setView] = useState<'list' | 'calendar'>('list')

  useEffect(() => {
    const url = storeId
      ? `/api/critical-dates?store_id=${storeId}`
      : '/api/critical-dates'
    fetch(url)
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

  const handleReminderUpdate = (id: string, newDays: number[]) => {
    setDates(prev => prev.map(d => d.id === id ? { ...d, reminder_days: newDays } : d))
  }

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

  // Group by time period for cross-location view
  const grouped = crossLocation ? (() => {
    const groups: Partial<Record<TimeGroup, ProcessedDate[]>> = {}
    for (const d of visibleDates) {
      const g = getTimeGroup(d.days)
      if (!groups[g]) groups[g] = []
      groups[g]!.push(d)
    }
    return groups
  })() : null

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
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

        {/* View toggle */}
        <div className="flex items-center gap-0.5 p-0.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <button
            onClick={() => setView('list')}
            className={`flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-md transition-colors ${
              view === 'list' ? 'bg-white/[0.08] text-white' : 'text-white/35 hover:text-white/60'
            }`}
          >
            <List className="h-3 w-3" />
            List
          </button>
          <button
            onClick={() => setView('calendar')}
            className={`flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-md transition-colors ${
              view === 'calendar' ? 'bg-white/[0.08] text-white' : 'text-white/35 hover:text-white/60'
            }`}
          >
            <CalendarDays className="h-3 w-3" />
            Calendar
          </button>
        </div>
      </div>

      {/* Calendar view */}
      {view === 'calendar' && <MonthCalendar dates={dates} />}

      {/* List view */}
      {view === 'list' && (
        <>
          {/* Cross-location grouped view */}
          {crossLocation && grouped ? (
            <div className="space-y-5">
              {TIME_GROUP_ORDER.map(group => {
                const items = grouped[group]
                if (!items || items.length === 0) return null
                return (
                  <div key={group}>
                    <p className="text-[10px] font-semibold text-white/25 uppercase tracking-widest mb-2">{group}</p>
                    <div className="space-y-2">{items.map(date => (
                      <DateRow
                        key={date.id}
                        date={date}
                        expandedId={expandedId}
                        setExpandedId={setExpandedId}
                        onReminderUpdate={handleReminderUpdate}
                        showStoreName
                      />
                    ))}</div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="space-y-2.5">
              {visibleDates.map(date => (
                <DateRow
                  key={date.id}
                  date={date}
                  expandedId={expandedId}
                  setExpandedId={setExpandedId}
                  onReminderUpdate={handleReminderUpdate}
                  showStoreName={crossLocation}
                />
              ))}
            </div>
          )}

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
        </>
      )}
    </div>
  )
}

// ── Date Row (extracted for reuse) ───────────────────────────────────────────

function DateRow({
  date,
  expandedId,
  setExpandedId,
  onReminderUpdate,
  showStoreName,
}: {
  date: ProcessedDate
  expandedId: string | null
  setExpandedId: (id: string | null) => void
  onReminderUpdate: (id: string, days: number[]) => void
  showStoreName?: boolean
}) {
  const config = URGENCY_CONFIG[date.urgency]
  const guidance = getGuidance(date.date_type)

  return (
    <div
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
            {showStoreName && date.store_name && (
              <span className="text-emerald-400/50 ml-1.5">— {date.store_name}</span>
            )}
          </p>
        </div>

        {/* Reminder badge */}
        <ReminderPopover date={date} onUpdate={onReminderUpdate} />

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
}
