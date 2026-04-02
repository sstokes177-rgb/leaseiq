# Task 04: Total Occupancy Cost Calculator

Read the entire src/ directory before making any changes.

## Project Context

This is a Next.js 16 (App Router, TypeScript) web app called LeaseIQ for commercial retail tenants. Key tech:
- Tailwind CSS + shadcn/ui
- Vercel AI SDK (`ai` + `@ai-sdk/anthropic`)
- Supabase (PostgreSQL + Auth)
- Supabase clients in `src/lib/supabase.ts`: `createServerSupabaseClient()`, `createAdminSupabaseClient()`

### Styling Rules (MUST follow)
- Dark theme: body gradient `linear-gradient(160deg, #1a1d25 0%, #13151d 55%, #0f1118 100%)`
- Emerald accents: `#10b981`, highlights `rgba(16,185,129,...)`
- Font: Plus Jakarta Sans
- Glass cards: `glass-card` class
- Labels: `text-[10px] font-semibold text-white/35 uppercase tracking-widest`
- Values: `text-sm text-white/85`
- Section backgrounds: `rgba(255,255,255,0.03)` with `border: 1px solid rgba(255,255,255,0.07)`

### Existing Database Tables (from migration 003)
```sql
CREATE TABLE IF NOT EXISTS occupancy_cost_overrides (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  insurance_monthly NUMERIC,
  tax_monthly NUMERIC,
  other_monthly NUMERIC,
  other_description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(store_id, tenant_id)
);
```

### Existing Files (READ these first)
- `src/app/api/occupancy-cost/route.ts` — GET and POST handlers
- `src/components/OccupancyCostCard.tsx` — UI component
- `src/types/index.ts` — Has `OccupancyCostOverrides` type

### Existing Type
```typescript
interface OccupancyCostOverrides {
  insurance_monthly: number | null
  tax_monthly: number | null
  other_monthly: number | null
  other_description: string | null
}
```

---

## What This Task Must Do

Verify and complete the Total Occupancy Cost Calculator. This feature:
1. Pulls base rent from the lease summary
2. Pulls CAM charges from the CAM analysis
3. Allows manual input of insurance, tax, and other costs
4. Shows a comprehensive cost breakdown card
5. Calculates per-square-foot occupancy cost

### Step 1: Verify the API Route

Read `src/app/api/occupancy-cost/route.ts`.

**GET handler** should:
1. Authenticate user
2. Accept `store_id` query param
3. Fetch in parallel:
   - `lease_summaries` for this store (base_rent_monthly, square_footage)
   - `cam_analysis` for this store (CAM charges)
   - `occupancy_cost_overrides` for this store (insurance, tax, other)
   - `percentage_rent_entries` for this store (to calculate annual percentage rent)
4. Return all data in one response:
```json
{
  "summary": { "base_rent_monthly": "$5,000", "square_footage": "2,500" },
  "cam": { "proportionate_share_pct": "3.5%", "cam_cap": "$8/sqft" },
  "overrides": { "insurance_monthly": 450, "tax_monthly": 800, "other_monthly": 200 },
  "total_sales": 500000
}
```

**POST handler** should:
1. Accept `{ store_id, insurance_monthly, tax_monthly, other_monthly, other_description }`
2. Upsert to `occupancy_cost_overrides`
3. Return the saved overrides

Verify and fix if needed. Here's the reference implementation:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const storeId = new URL(request.url).searchParams.get('store_id')
  if (!storeId) return NextResponse.json({ error: 'store_id required' }, { status: 400 })

  const admin = createAdminSupabaseClient()

  const [summaryRes, camRes, overridesRes, salesRes] = await Promise.all([
    admin.from('lease_summaries').select('summary_data')
      .eq('store_id', storeId).eq('tenant_id', user.id).maybeSingle(),
    admin.from('cam_analysis').select('analysis_data')
      .eq('store_id', storeId).eq('tenant_id', user.id).maybeSingle(),
    admin.from('occupancy_cost_overrides').select('*')
      .eq('store_id', storeId).eq('tenant_id', user.id).maybeSingle(),
    admin.from('percentage_rent_entries').select('gross_sales')
      .eq('store_id', storeId).eq('tenant_id', user.id),
  ])

  const totalSales = (salesRes.data ?? []).reduce((sum, e) => sum + Number(e.gross_sales || 0), 0)

  return NextResponse.json({
    summary: summaryRes.data?.summary_data ?? null,
    cam: camRes.data?.analysis_data ?? null,
    overrides: overridesRes.data ?? null,
    total_sales: totalSales,
  })
}

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { store_id: storeId, insurance_monthly, tax_monthly, other_monthly, other_description } = body

  if (!storeId) return NextResponse.json({ error: 'store_id required' }, { status: 400 })

  const admin = createAdminSupabaseClient()

  // Verify store ownership
  const { data: store } = await supabase
    .from('stores').select('id').eq('id', storeId).eq('tenant_id', user.id).maybeSingle()
  if (!store) return NextResponse.json({ error: 'Store not found' }, { status: 404 })

  // Upsert overrides
  const { data: existing } = await admin
    .from('occupancy_cost_overrides').select('id')
    .eq('store_id', storeId).eq('tenant_id', user.id).maybeSingle()

  const overrideData = {
    insurance_monthly: insurance_monthly ?? null,
    tax_monthly: tax_monthly ?? null,
    other_monthly: other_monthly ?? null,
    other_description: other_description ?? null,
    updated_at: new Date().toISOString(),
  }

  if (existing) {
    await admin.from('occupancy_cost_overrides')
      .update(overrideData).eq('id', existing.id)
  } else {
    await admin.from('occupancy_cost_overrides').insert({
      store_id: storeId,
      tenant_id: user.id,
      ...overrideData,
    })
  }

  return NextResponse.json({ success: true, overrides: overrideData })
}
```

### Step 2: Verify and Enhance the OccupancyCostCard Component

Read `src/components/OccupancyCostCard.tsx`. Ensure it has:

**Cost Breakdown Card:**
- Base Rent (from lease summary)
- CAM Charges (estimated from CAM analysis if available)
- Insurance (from overrides or manual input)
- Property Tax (from overrides or manual input)
- Other Charges (from overrides or manual input)
- **Total Monthly Occupancy Cost** (sum of all)
- **Per Square Foot** calculation (annual total / square footage)

**Visual Breakdown:**
```tsx
// Parse numbers from lease summary
const baseRent = parseFloat((summary?.base_rent_monthly ?? '0').replace(/[^0-9.-]/g, '')) || 0
const sqft = parseFloat((summary?.square_footage ?? '0').replace(/[^0-9.-]/g, '')) || 0
const insurance = Number(overrides?.insurance_monthly) || 0
const tax = Number(overrides?.tax_monthly) || 0
const other = Number(overrides?.other_monthly) || 0

// Estimate CAM from analysis if available
let camEstimate = 0
if (cam?.proportionate_share_pct && sqft) {
  // Very rough estimate — the actual CAM depends on total expenses
  // Show as "estimated" with a note
}

const totalMonthly = baseRent + camEstimate + insurance + tax + other
const totalAnnual = totalMonthly * 12
const perSqFt = sqft > 0 ? totalAnnual / sqft : 0
```

Display as a vertical breakdown:

```tsx
<div className="space-y-2">
  <CostRow label="Base Rent" amount={baseRent} highlight />
  <CostRow label="CAM Charges" amount={camEstimate} note="Estimated" />
  <CostRow label="Insurance" amount={insurance} editable />
  <CostRow label="Property Tax" amount={tax} editable />
  <CostRow label="Other" amount={other} editable />
  <div className="border-t border-white/[0.10] pt-2 mt-2">
    <CostRow label="Total Monthly" amount={totalMonthly} total />
  </div>
</div>
```

**Manual Override Inputs:**
- Three input fields for insurance, tax, other (monthly amounts)
- Save button to POST overrides
- Use `glass-input` styling for inputs
- Show "$/mo" suffix in inputs

**Per-SqFt Display:**
```tsx
{sqft > 0 && (
  <div className="rounded-xl px-4 py-3 text-center"
    style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.18)' }}>
    <p className="text-[10px] font-semibold text-emerald-400/60 uppercase tracking-widest">Total Occupancy Cost</p>
    <p className="text-2xl font-bold text-emerald-300 mt-1">
      ${perSqFt.toFixed(2)}<span className="text-sm font-normal text-emerald-300/60">/sqft/yr</span>
    </p>
    <p className="text-xs text-white/40 mt-1">${totalAnnual.toLocaleString()}/year · {sqft.toLocaleString()} sqft</p>
  </div>
)}
```

Use teal color theme for the icon:
- Icon bg: `rgba(20,184,166,0.10)`, border: `rgba(20,184,166,0.20)`
- Icon: `Calculator` from lucide-react, `text-teal-400`

### Step 3: Verify Location Page Integration

Read `src/app/location/[id]/page.tsx`. Verify `<OccupancyCostCard storeId={id} />` is rendered.

---

## Files to Create or Modify

### Modify (read first):
1. `src/app/api/occupancy-cost/route.ts` — Verify/fix GET and POST
2. `src/components/OccupancyCostCard.tsx` — Verify/enhance with breakdown, per-sqft, override inputs

### Check (read only, fix if broken):
1. `src/app/location/[id]/page.tsx` — Verify card is rendered
2. `src/types/index.ts` — Verify types

---

Run `npx next build` to verify. Fix any errors.
