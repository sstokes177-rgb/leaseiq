# Task 07: Enhanced Critical Dates

Read the entire src/ directory before making any changes.

## Project Context

This is a Next.js 16 (App Router, TypeScript) web app called LeaseIQ for commercial retail tenants. Key tech:
- Tailwind CSS + shadcn/ui
- Supabase (PostgreSQL + Auth)
- Supabase clients: `createServerSupabaseClient()`, `createAdminSupabaseClient()` from `src/lib/supabase.ts`

### Styling Rules (MUST follow)
- Dark theme: body gradient `linear-gradient(160deg, #1a1d25 0%, #13151d 55%, #0f1118 100%)`
- Emerald accents: `#10b981`
- Font: Plus Jakarta Sans
- Glass cards: `glass-card` class
- Labels: `text-[10px] font-semibold text-white/35 uppercase tracking-widest`
- Values: `text-sm text-white/85`

### Existing Database Table
```sql
-- From migration 002
CREATE TABLE IF NOT EXISTS critical_dates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  date_type TEXT NOT NULL,
  date_value DATE,
  description TEXT,
  alert_days_before INTEGER DEFAULT 90,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### Existing Files (READ these first)
- `src/app/location/[id]/page.tsx` — Location page with inline critical dates section (lines ~278-356)
- `src/lib/extractCriticalDates.ts` — AI extraction of dates from lease text
- `src/app/api/upload/route.ts` — Upload endpoint that triggers date extraction

### Existing Critical Date Extraction

The `extractCriticalDates` function in `src/lib/extractCriticalDates.ts` extracts:
- date_type: "Lease Expiration", "Rent Commencement", "Renewal Option Deadline", etc.
- date_value: ISO YYYY-MM-DD format
- description: 1-2 sentence explanation
- alert_days_before: 365 for expiration, 90 for options, 30 for deadlines

### Current Location Page Implementation

The location page (`src/app/location/[id]/page.tsx`) already displays critical dates inline with:
- `daysUntil()` function to calculate days remaining
- `formatCountdown()` for human-readable countdowns
- `urgencyBadge()` for red/amber/green badges
- Color-coded icon backgrounds based on urgency

---

## What This Task Must Do

Enhance the critical dates display. Currently it's an inline section in the location page. Extract it into a dedicated client component with better features.

### Step 1: Create a CriticalDatesCard Component

Create `src/components/CriticalDatesCard.tsx`:

```typescript
'use client'

import { useState, useEffect } from 'react'
import {
  Calendar, AlertCircle, AlertTriangle, Clock,
  ChevronDown, ChevronUp, Bell
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

// Actionable guidance for each date type
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
```

The component should:

1. **Fetch dates** from the server (pass them as props from the server component, or fetch client-side)
2. **Sort**: Upcoming first (nearest date first), then past dates
3. **Color code**: Red (<30d), Yellow (<90d), Green (<365d), Grey (>365d or past)
4. **Countdown displays**: "12 days", "3 months", "1.5 years"
5. **Actionable guidance**: Per-date-type advice
6. **Expandable details**: Click to expand description and guidance
7. **Summary banner**: Show count of urgent items at top

**Render structure:**
```tsx
export function CriticalDatesCard({ storeId }: CriticalDatesCardProps) {
  const [dates, setDates] = useState<(CriticalDate & { days: number; urgency: UrgencyLevel })[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showPast, setShowPast] = useState(false)

  useEffect(() => {
    fetch(`/api/critical-dates?store_id=${storeId}`)
      .then(r => r.json())
      .then(data => {
        const processed = (data.dates ?? [])
          .filter((d: CriticalDate) => d.date_value)
          .map((d: CriticalDate) => {
            const days = daysUntil(d.date_value!)
            return { ...d, days, urgency: getUrgency(days) }
          })
          .sort((a: any, b: any) => {
            // Upcoming first, then past
            if (a.days >= 0 && b.days >= 0) return a.days - b.days
            if (a.days < 0 && b.days < 0) return b.days - a.days
            return a.days >= 0 ? -1 : 1
          })
        setDates(processed)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [storeId])

  // ... render with glass-card, urgency colors, expandable rows
}
```

### Step 2: Create a Critical Dates API Endpoint

Create `src/app/api/critical-dates/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const storeId = new URL(request.url).searchParams.get('store_id')
  if (!storeId) return NextResponse.json({ error: 'store_id required' }, { status: 400 })

  const { data, error } = await supabase
    .from('critical_dates')
    .select('id, date_type, date_value, description, alert_days_before, store_id')
    .eq('tenant_id', user.id)
    .eq('store_id', storeId)
    .not('date_value', 'is', null)
    .order('date_value', { ascending: true })
    .limit(20)

  if (error) return NextResponse.json({ dates: [] })
  return NextResponse.json({ dates: data ?? [] })
}
```

### Step 3: Update Location Page

In `src/app/location/[id]/page.tsx`:
1. Replace the inline critical dates section with `<CriticalDatesCard storeId={id} />`
2. Remove the inline `daysUntil`, `formatCountdown`, and `urgencyBadge` functions (they're now in the component)
3. Remove the inline critical dates rendering code
4. Import and render the new component:

```tsx
import { CriticalDatesCard } from '@/components/CriticalDatesCard'

// In the JSX, replace the inline critical dates section with:
{hasDocuments && <CriticalDatesCard storeId={id} />}
```

Remove the old `criticalDates` fetch from the server component since the client component handles it now.

### Step 4: Each Date Row Should Have

For each critical date, render an expandable row:

```tsx
<div
  key={date.id}
  className="rounded-xl overflow-hidden transition-all"
  style={{ background: config.bgColor, border: `1px solid ${config.borderColor}` }}
>
  {/* Main row — always visible */}
  <button
    onClick={() => setExpandedId(expandedId === date.id ? null : date.id)}
    className="w-full px-4 py-3.5 flex items-center gap-3 text-left"
  >
    <div className="flex items-center justify-center w-9 h-9 rounded-lg shrink-0"
      style={{ background: config.bgColor, border: `1px solid ${config.borderColor}` }}>
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
      {getGuidance(date.date_type) && (
        <div className="flex items-start gap-2 mt-2">
          <Bell className="h-3.5 w-3.5 text-emerald-400/60 mt-0.5 shrink-0" />
          <p className="text-xs text-emerald-300/70 leading-relaxed italic">
            {getGuidance(date.date_type)}
          </p>
        </div>
      )}
    </div>
  )}
</div>
```

---

## Files to Create or Modify

### Create:
1. `src/components/CriticalDatesCard.tsx` — New client component
2. `src/app/api/critical-dates/route.ts` — New API endpoint

### Modify (read first):
1. `src/app/location/[id]/page.tsx` — Replace inline dates with component

---

Run `npx next build` to verify. Fix any errors.
