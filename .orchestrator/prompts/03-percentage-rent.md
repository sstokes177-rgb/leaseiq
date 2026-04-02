# Task 03: Percentage Rent Tracker

Read the entire src/ directory before making any changes.

## Project Context

This is a Next.js 16 (App Router, TypeScript) web app called LeaseIQ for commercial retail tenants. Key tech:
- Tailwind CSS + shadcn/ui
- Vercel AI SDK (`ai` + `@ai-sdk/anthropic`) — `generateText` from `ai`, `anthropic` from `@ai-sdk/anthropic`
- Claude API: `claude-haiku-4-5-20251001` for extraction tasks
- Supabase (PostgreSQL + pgvector + Auth + Storage)
- Supabase client factories in `src/lib/supabase.ts`:
  - `createServerSupabaseClient()` — for server components/API routes (uses cookies, respects RLS)
  - `createAdminSupabaseClient()` — bypasses RLS (for server-side writes)

### Styling Rules (MUST follow exactly)
- Dark theme: body gradient `linear-gradient(160deg, #1a1d25 0%, #13151d 55%, #0f1118 100%)`
- Emerald accents: `#10b981`, highlights `rgba(16,185,129,...)`
- Font: Plus Jakarta Sans
- Glass cards: `glass-card` class (bg rgba(255,255,255,0.04), backdrop-blur-24px, border rgba(255,255,255,0.07))
- Labels: `text-[10px] font-semibold text-white/35 uppercase tracking-widest`
- Values: `text-sm text-white/85` or `text-white/25 italic` for null
- Section backgrounds: `background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07)`
- Icon containers: `w-9 h-9 rounded-xl` with tinted bg/border

### Existing Database Tables (from migration 003)
```sql
CREATE TABLE IF NOT EXISTS percentage_rent_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  breakpoint NUMERIC,
  percentage NUMERIC,
  natural_breakpoint BOOLEAN DEFAULT false,
  lease_year_start_month INTEGER DEFAULT 1,
  config_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(store_id, tenant_id)
);

CREATE TABLE IF NOT EXISTS percentage_rent_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  year INTEGER NOT NULL,
  gross_sales NUMERIC NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(store_id, tenant_id, month, year)
);
```

### Existing Files (READ these first)
- `src/app/api/percentage-rent/route.ts` — GET and POST handlers
- `src/components/PercentageRentCard.tsx` — UI component
- `src/types/index.ts` — Has `PercentageRentEntry` and `PercentageRentConfig` types

### Existing Types
```typescript
interface PercentageRentConfig {
  breakpoint: number | null
  percentage: number | null
  natural_breakpoint: boolean
  lease_year_start_month: number
}

interface PercentageRentEntry {
  id: string
  month: number
  year: number
  gross_sales: number
}
```

---

## What This Task Must Do

Verify and complete the Percentage Rent Tracker. This feature:
1. Extracts the percentage rent breakpoint and percentage from the lease
2. Allows tenants to input monthly gross sales
3. Shows a progress bar: current cumulative sales vs breakpoint
4. Calculates percentage rent owed when sales exceed breakpoint

### Step 1: Verify the API Route

Read `src/app/api/percentage-rent/route.ts`.

**GET handler** should:
1. Authenticate user
2. Accept `store_id` query param
3. Fetch `percentage_rent_config` for this store/tenant
4. Fetch `percentage_rent_entries` for this store/tenant, ordered by year desc then month desc
5. Return `{ config, entries }`

**POST handler** should handle two actions:
1. `action: 'extract_config'` — Extract percentage rent terms from the lease:
   - Fetch document chunks for this store
   - Search for percentage rent keywords: "percentage rent", "breakpoint", "natural breakpoint", "gross sales", "overage rent"
   - Send to Claude Haiku for extraction
   - Upsert to `percentage_rent_config`
   - Return the config

2. `action: 'save_entry'` — Save a monthly sales entry:
   - Accept `{ store_id, month, year, gross_sales }`
   - Upsert to `percentage_rent_entries` (UNIQUE on store_id, tenant_id, month, year)
   - Return the saved entry

Verify the route works. If incomplete, implement:

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

  const admin = createAdminSupabaseClient()

  const [configRes, entriesRes] = await Promise.all([
    admin.from('percentage_rent_config').select('*').eq('store_id', storeId).eq('tenant_id', user.id).maybeSingle(),
    admin.from('percentage_rent_entries').select('*').eq('store_id', storeId).eq('tenant_id', user.id).order('year', { ascending: false }).order('month', { ascending: false }),
  ])

  return NextResponse.json({
    config: configRes.data ?? null,
    entries: entriesRes.data ?? [],
  })
}

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { store_id: storeId, action } = body

  if (!storeId) return NextResponse.json({ error: 'store_id required' }, { status: 400 })

  const admin = createAdminSupabaseClient()

  // Verify store
  const { data: store } = await supabase
    .from('stores').select('id').eq('id', storeId).eq('tenant_id', user.id).maybeSingle()
  if (!store) return NextResponse.json({ error: 'Store not found' }, { status: 404 })

  if (action === 'extract_config') {
    // Search for percentage rent chunks
    const keywords = ['percentage rent', 'breakpoint', 'gross sales', 'overage rent', 'natural breakpoint']
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

    // Fallback: fetch raw chunks if keyword search returns nothing
    if (chunks.length === 0) {
      const { data: raw } = await admin
        .from('document_chunks').select('content')
        .eq('store_id', storeId).eq('tenant_id', user.id).limit(30)
      const filtered = (raw ?? []).filter(c =>
        /percentage|breakpoint|gross sales|overage/i.test(c.content)
      )
      chunks.push(...(filtered.length > 0 ? filtered : (raw ?? []).slice(0, 20)).map(c => c.content))
    }

    if (chunks.length === 0) {
      return NextResponse.json({ error: 'No document chunks found' }, { status: 422 })
    }

    try {
      const { text } = await generateText({
        model: anthropic('claude-haiku-4-5-20251001'),
        maxOutputTokens: 400,
        messages: [{
          role: 'user',
          content: `Extract percentage rent terms from these lease excerpts. Return ONLY valid JSON:
{
  "breakpoint": number or null (annual gross sales breakpoint in dollars, e.g. 500000),
  "percentage": number or null (percentage above breakpoint, e.g. 6 for 6%),
  "natural_breakpoint": boolean (true if breakpoint is calculated from base rent / percentage),
  "lease_year_start_month": number 1-12 (what month the lease year starts, default 1 for January)
}

Lease excerpts:
${chunks.slice(0, 20).join('\n\n---\n\n').slice(0, 15000)}`,
        }],
      })

      const config = JSON.parse(text.trim().replace(/^```json\s*|\s*```$/g, ''))

      // Upsert config
      const { data: existing } = await admin
        .from('percentage_rent_config').select('id')
        .eq('store_id', storeId).eq('tenant_id', user.id).maybeSingle()

      if (existing) {
        await admin.from('percentage_rent_config')
          .update({ ...config, updated_at: new Date().toISOString() })
          .eq('id', existing.id)
      } else {
        await admin.from('percentage_rent_config').insert({
          store_id: storeId,
          tenant_id: user.id,
          ...config,
        })
      }

      return NextResponse.json({ success: true, config })
    } catch (err) {
      console.error('[PercentageRent] Extraction failed:', err)
      return NextResponse.json({ error: 'Could not extract percentage rent terms' }, { status: 500 })
    }
  }

  if (action === 'save_entry') {
    const { month, year, gross_sales } = body
    if (!month || !year || gross_sales == null) {
      return NextResponse.json({ error: 'month, year, and gross_sales required' }, { status: 400 })
    }

    // Upsert entry (UNIQUE on store_id, tenant_id, month, year)
    const { data: existing } = await admin
      .from('percentage_rent_entries').select('id')
      .eq('store_id', storeId).eq('tenant_id', user.id)
      .eq('month', month).eq('year', year).maybeSingle()

    if (existing) {
      await admin.from('percentage_rent_entries')
        .update({ gross_sales }).eq('id', existing.id)
    } else {
      await admin.from('percentage_rent_entries').insert({
        store_id: storeId,
        tenant_id: user.id,
        month,
        year,
        gross_sales,
      })
    }

    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}
```

### Step 2: Verify and Enhance the PercentageRentCard Component

Read `src/components/PercentageRentCard.tsx`. It should contain:

1. **Config Display**: Show breakpoint amount and percentage rate
2. **Extract Button**: "Extract from Lease" to call POST with `action: 'extract_config'`
3. **Sales Entry Form**: Month/year selectors and gross_sales input
4. **Progress Bar**: Visual representation of cumulative sales vs breakpoint
5. **Percentage Rent Calculation**: Show amount owed when sales exceed breakpoint

Ensure the component has these sections:

**Progress Bar:**
```tsx
// Calculate cumulative sales for current lease year
const currentYearEntries = entries.filter(e => e.year === currentLeaseYear)
const cumulativeSales = currentYearEntries.reduce((sum, e) => sum + Number(e.gross_sales), 0)
const breakpoint = Number(config.breakpoint) || 0
const progressPct = breakpoint > 0 ? Math.min((cumulativeSales / breakpoint) * 100, 100) : 0
const overBreakpoint = cumulativeSales > breakpoint
const overage = overBreakpoint ? cumulativeSales - breakpoint : 0
const percentageRentOwed = overage * (Number(config.percentage) || 0) / 100
```

Progress bar visual:
```tsx
<div className="space-y-2">
  <div className="flex items-center justify-between text-xs">
    <span className="text-white/60">Cumulative Sales</span>
    <span className={`font-semibold ${overBreakpoint ? 'text-red-400' : 'text-emerald-400'}`}>
      ${cumulativeSales.toLocaleString()}
    </span>
  </div>
  <div className="h-3 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
    <div
      className="h-full rounded-full transition-all duration-500"
      style={{
        width: `${progressPct}%`,
        background: overBreakpoint
          ? 'linear-gradient(90deg, rgba(239,68,68,0.7), rgba(239,68,68,0.9))'
          : 'linear-gradient(90deg, rgba(16,185,129,0.6), rgba(16,185,129,0.9))',
      }}
    />
  </div>
  <div className="flex items-center justify-between text-[10px]">
    <span className="text-white/35">$0</span>
    <span className="text-white/50 font-medium">Breakpoint: ${breakpoint.toLocaleString()}</span>
  </div>
</div>
```

**Percentage Rent Owed (if over breakpoint):**
```tsx
{overBreakpoint && (
  <div
    className="rounded-xl px-4 py-3 mt-4"
    style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.20)' }}
  >
    <p className="text-xs font-semibold text-red-400">Percentage Rent Due</p>
    <p className="text-lg font-bold text-red-300 mt-1">
      ${percentageRentOwed.toLocaleString(undefined, { minimumFractionDigits: 2 })}
    </p>
    <p className="text-[11px] text-red-300/60 mt-1">
      {config.percentage}% × ${overage.toLocaleString()} overage
    </p>
  </div>
)}
```

**Monthly Sales Entry Form:**
- Month dropdown (January–December)
- Year input (default to current year)
- Gross sales input (formatted currency)
- Save button
- Use glass-input styling for inputs

**Sales History Table:**
- Show recent entries with month, year, gross sales
- Allow editing existing entries

Use violet/purple color theme for the icon:
- Icon bg: `rgba(139,92,246,0.10)`, border: `rgba(139,92,246,0.20)`
- Icon: `TrendingUp` or `DollarSign` from lucide-react, `text-violet-400`

### Step 3: Verify Location Page Integration

Read `src/app/location/[id]/page.tsx`. Verify `<PercentageRentCard storeId={id} />` is rendered when documents exist.

---

## Files to Create or Modify

### Modify (read first):
1. `src/app/api/percentage-rent/route.ts` — Verify/fix GET and POST
2. `src/components/PercentageRentCard.tsx` — Verify/enhance UI with progress bar, form, calculations

### Check (read only, fix if broken):
1. `src/app/location/[id]/page.tsx` — Verify card is rendered
2. `src/types/index.ts` — Verify types exist
3. `supabase/migrations/003_cam_and_features.sql` — Verify tables exist

---

Run `npx next build` to verify. Fix any errors.
