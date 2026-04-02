# Task 05: Rent Escalation Timeline

Read the entire src/ directory before making any changes.

## Project Context

This is a Next.js 16 (App Router, TypeScript) web app called LeaseIQ for commercial retail tenants. Key tech:
- Tailwind CSS + shadcn/ui
- Vercel AI SDK (`ai` + `@ai-sdk/anthropic`)
- Claude API: `claude-haiku-4-5-20251001` for extraction
- Supabase (PostgreSQL + Auth)

### Styling Rules (MUST follow)
- Dark theme with emerald accents (#10b981)
- Font: Plus Jakarta Sans
- Glass cards: `glass-card` class (backdrop-blur, bg-white/4%)
- Labels: `text-[10px] font-semibold text-white/35 uppercase tracking-widest`
- Values: `text-sm text-white/85`

### Existing Files (READ these first)
- `src/components/RentEscalationTimeline.tsx` — Existing component
- `src/app/api/lease-summary/route.ts` — GET handler that returns lease summary
- `src/lib/leaseSummary.ts` — Generates lease summary with `rent_escalation` field

### Existing Component Analysis

The `RentEscalationTimeline` component already exists. Read it carefully. It:
1. Fetches the lease summary from GET `/api/lease-summary?store_id=...`
2. Parses `base_rent_monthly`, `rent_escalation`, `lease_start_date`, `lease_end_date`
3. Extracts an escalation percentage from the escalation string (e.g., "3% annual" → 3)
4. Generates a year-by-year timeline with projected rents
5. Highlights the current year
6. Returns null if no data is available

---

## What This Task Must Do

The existing component works for simple percentage escalations but needs enhancement for more complex escalation schedules.

### Step 1: Enhance Escalation Schedule Extraction

The current `parseSummaryForEscalation` function only handles a single percentage like "3% annually". Many leases have complex schedules like:
- "3% for years 1-5, then 4% for years 6-10"
- "$500/year increase"
- "CPI-based adjustment"
- Fixed step schedules: "Year 1: $5,000, Year 2: $5,250, Year 3: $5,500"

Create a new API endpoint to extract a detailed escalation schedule from the lease:

**Create `src/app/api/rent-escalation/route.ts`:**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase'
import { generateText } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { keywordSearchChunks } from '@/lib/vectorStore'

export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const storeId = new URL(request.url).searchParams.get('store_id')
  if (!storeId) return NextResponse.json({ error: 'store_id required' }, { status: 400 })

  // First try to get the lease summary for basic data
  const admin = createAdminSupabaseClient()
  const { data: summaryRow } = await admin
    .from('lease_summaries').select('summary_data')
    .eq('store_id', storeId).eq('tenant_id', user.id).maybeSingle()

  const summary = summaryRow?.summary_data

  if (!summary) {
    return NextResponse.json({ schedule: null, summary: null })
  }

  // Search for rent escalation chunks for detailed extraction
  const keywords = ['rent escalation', 'rent increase', 'annual increase', 'rent adjustment', 'base rent', 'minimum rent']
  const results = await Promise.all(
    keywords.map(kw => keywordSearchChunks(kw, user.id, 6, storeId).catch(() => []))
  )

  const seen = new Set<string>()
  const chunks: string[] = []
  for (const batch of results) {
    for (const chunk of batch) {
      if (!seen.has(chunk.id)) {
        seen.add(chunk.id)
        chunks.push(chunk.content)
      }
    }
  }

  // If we have chunks, extract a detailed schedule
  let detailedSchedule = null
  if (chunks.length > 0) {
    try {
      const { text } = await generateText({
        model: anthropic('claude-haiku-4-5-20251001'),
        maxOutputTokens: 800,
        messages: [{
          role: 'user',
          content: `Extract the rent escalation schedule from these lease excerpts. Return ONLY valid JSON:
{
  "type": "percentage" | "fixed_amount" | "step_schedule" | "cpi" | "unknown",
  "annual_percentage": number or null (if type is "percentage"),
  "annual_fixed_increase": number or null (if type is "fixed_amount", e.g. 500 for $500/year),
  "steps": [
    { "year": 1, "monthly_rent": number, "effective_date": "string or null" }
  ] or null (if type is "step_schedule" — list each year with its specific rent),
  "cpi_details": "string or null" (if type is "cpi", describe the CPI adjustment terms),
  "description": "one sentence summary of the escalation terms",
  "article": "Article/Section reference or null"
}

If the lease specifies exact rents for each period, populate the "steps" array.
If it's a simple percentage increase, set "type": "percentage" and "annual_percentage".
If it's a fixed dollar increase per year, set "type": "fixed_amount" and "annual_fixed_increase".

Lease excerpts:
${chunks.slice(0, 15).join('\n\n---\n\n').slice(0, 15000)}`,
        }],
      })

      detailedSchedule = JSON.parse(text.trim().replace(/^```json\s*|\s*```$/g, ''))
    } catch (err) {
      console.error('[RentEscalation] Extraction failed:', err)
    }
  }

  return NextResponse.json({ schedule: detailedSchedule, summary })
}
```

### Step 2: Enhance the RentEscalationTimeline Component

Modify `src/components/RentEscalationTimeline.tsx` to:

1. Call the new `/api/rent-escalation` endpoint instead of just the lease summary
2. Use the detailed schedule data if available, falling back to the simple percentage parsing
3. Improve the visual timeline

**Updated data flow:**
```typescript
useEffect(() => {
  const fetchData = async () => {
    try {
      const res = await fetch(`/api/rent-escalation?store_id=${storeId}`)
      if (res.ok) {
        const data = await res.json()
        if (data.schedule?.steps) {
          // Use detailed step schedule from Claude extraction
          setYears(data.schedule.steps.map((step: any, i: number) => ({
            year: step.year_number || (startYear + i),
            monthlyRent: step.monthly_rent,
            annualRent: step.monthly_rent * 12,
            escalationPct: null, // individual steps don't have a single pct
            effectiveDate: step.effective_date || '',
            isCurrent: (step.year_number || (startYear + i)) === currentYear,
          })))
        } else if (data.summary) {
          // Fall back to parsing from summary
          setYears(parseSummaryForEscalation(data.summary))
        }
        if (data.schedule?.description) setDescription(data.schedule.description)
        if (data.schedule?.article) setArticle(data.schedule.article)
      }
    } catch {
      // Fall back to lease summary only
      try {
        const res = await fetch(`/api/lease-summary?store_id=${storeId}`)
        if (res.ok) {
          const data = await res.json()
          const summary = data.summary?.summary_data
          if (summary) setYears(parseSummaryForEscalation(summary))
        }
      } catch {}
    } finally {
      setLoading(false)
    }
  }
  fetchData()
}, [storeId])
```

**Visual Enhancements:**

Add to the component:
- A description line showing the escalation type (e.g., "3% annual increase per Article 5.2")
- Visual bars for each year showing relative rent amounts
- The current year should be prominently highlighted
- Past years should be dimmed
- Show the annual increase amount/percentage for each year

Enhance each row:

```tsx
<div
  key={y.year}
  className={`rounded-lg px-4 py-3 flex items-center gap-4 transition-all ${isPast ? 'opacity-45' : ''}`}
  style={{
    background: y.isCurrent ? 'rgba(59,130,246,0.10)' : 'rgba(255,255,255,0.02)',
    border: y.isCurrent ? '1px solid rgba(59,130,246,0.22)' : '1px solid rgba(255,255,255,0.05)',
  }}
>
  {/* Year label */}
  <div className="w-12 shrink-0 text-center">
    <span className={`text-xs font-bold ${y.isCurrent ? 'text-blue-400' : 'text-white/50'}`}>
      {y.year}
    </span>
  </div>

  {/* Visual bar */}
  <div className="flex-1 min-w-0">
    <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)' }}>
      <div
        className="h-full rounded-full"
        style={{
          width: `${maxRent > 0 ? (y.monthlyRent / maxRent) * 100 : 100}%`,
          background: y.isCurrent
            ? 'linear-gradient(90deg, rgba(59,130,246,0.6), rgba(59,130,246,0.9))'
            : 'linear-gradient(90deg, rgba(255,255,255,0.08), rgba(255,255,255,0.15))',
        }}
      />
    </div>
  </div>

  {/* Amounts */}
  <div className="text-right shrink-0 w-32">
    <span className={`text-xs font-semibold ${y.isCurrent ? 'text-white' : 'text-white/70'}`}>
      ${y.monthlyRent.toLocaleString(undefined, { minimumFractionDigits: 2 })}/mo
    </span>
    <span className="text-[10px] text-white/30 ml-2">
      ${y.annualRent.toLocaleString(undefined, { maximumFractionDigits: 0 })}/yr
    </span>
  </div>

  {/* Change indicator */}
  <div className="w-14 text-right shrink-0">
    {y.escalationPct != null && y.escalationPct > 0 ? (
      <span className="text-[10px] font-medium text-amber-400/80">+{y.escalationPct}%</span>
    ) : y.escalationPct === null && i > 0 ? (
      <span className="text-[10px] text-white/25">—</span>
    ) : (
      <span className="text-[10px] text-white/35">Base</span>
    )}
  </div>

  {/* Current badge */}
  {y.isCurrent && (
    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-blue-500/15 text-blue-400 border border-blue-500/25 shrink-0">
      Current
    </span>
  )}
</div>
```

Use blue color theme for the icon (already in existing component):
- Icon bg: `rgba(59,130,246,0.10)`, border: `rgba(59,130,246,0.20)`
- Icon: `ArrowUpRight` from lucide-react, `text-blue-400`

### Step 3: Verify Location Page Integration

Read `src/app/location/[id]/page.tsx`. Verify `<RentEscalationTimeline storeId={id} />` is rendered.

---

## Files to Create or Modify

### Create:
1. `src/app/api/rent-escalation/route.ts` — New GET endpoint for detailed schedule extraction

### Modify (read first):
1. `src/components/RentEscalationTimeline.tsx` — Enhance with detailed schedule, visual bars, better layout

### Check (read only, fix if broken):
1. `src/app/location/[id]/page.tsx` — Verify card is rendered
2. `src/lib/vectorStore.ts` — Verify `keywordSearchChunks` function exists

---

Run `npx next build` to verify. Fix any errors.
