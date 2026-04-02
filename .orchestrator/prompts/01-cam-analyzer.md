# Task 01: CAM Charge Analyzer

Read the entire src/ directory before making any changes.

## Project Context

This is a Next.js 16 (App Router, TypeScript) web app called LeaseIQ for commercial retail tenants. Key tech:
- Tailwind CSS + shadcn/ui
- Vercel AI SDK (`ai` + `@ai-sdk/anthropic`) for LLM calls
- Claude API (claude-sonnet-4-6 for chat, claude-haiku-4-5-20251001 for extraction tasks)
- Supabase (PostgreSQL + pgvector + Auth + Storage)
- LangChain.js for embeddings (OpenAI text-embedding-3-small)

### Styling Rules (MUST follow exactly)
- Dark theme: body background is `linear-gradient(160deg, #1a1d25 0%, #13151d 55%, #0f1118 100%)`
- Emerald accents: primary color is `#10b981`, highlights use `rgba(16,185,129,...)`
- Font: Plus Jakarta Sans (loaded as `--font-sans`)
- Frosted glass cards: CSS class `glass-card` = `background: rgba(255,255,255,0.04); backdrop-filter: blur(24px); border: 1px solid rgba(255,255,255,0.07); box-shadow: 0 4px 24px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.05)`
- Card hover: `glass-card-lift` = hover translateY(-3px) with emerald border glow
- Labels: `text-[10px] font-semibold text-white/35 uppercase tracking-widest`
- Values: `text-sm text-white/85` or `text-white/25 italic` for null
- Section backgrounds: `rgba(255,255,255,0.03)` with `border: 1px solid rgba(255,255,255,0.07)`, rounded-xl
- Icon containers: `w-9 h-9 rounded-xl` with color-tinted background and border

### Existing Database Tables
The following tables already exist (check `supabase/migrations/003_cam_and_features.sql`):
- `cam_analysis` — id, store_id, tenant_id, analysis_data (JSONB), created_at, updated_at
- `document_chunks` — id, document_id, tenant_id, store_id, content, metadata, embedding

### Existing API Routes and Libraries
- `GET /api/cam-analysis` — Already exists at `src/app/api/cam-analysis/route.ts`. Fetches CAM analysis for a store.
- `POST /api/cam-analysis` — Already exists. Generates CAM analysis from lease chunks.
- `src/lib/camAnalysis.ts` — Already exists. Contains `generateCamAnalysis(storeId, tenantId)`.
- `src/components/CamAnalysisCard.tsx` — Already exists. Displays CAM analysis with audit window warning, key metrics, included/excluded items.

### Existing CamAnalysisData Type (in `src/types/index.ts`)
```typescript
interface CamAnalysisData {
  proportionate_share_pct: string | null
  admin_fee_pct: string | null
  cam_cap: string | null
  audit_window_days: number | null
  excluded_items: string[]
  included_items: string[]
  escalation_limit: string | null
}
```

---

## What This Task Must Do

The CAM Charge Analyzer already exists but needs enhancement. Verify and improve the following:

### 1. Verify the Existing CAM Analysis Pipeline Works

Read these files:
- `src/lib/camAnalysis.ts`
- `src/app/api/cam-analysis/route.ts` (both GET and POST handlers, likely in the same file or separate)
- `src/components/CamAnalysisCard.tsx`

Trace the flow:
1. User clicks "Analyze CAM charges" → POST `/api/cam-analysis` with `{ store_id }`
2. API calls `generateCamAnalysis(storeId, tenantId)`
3. Function searches for CAM-related chunks using keyword search
4. Sends chunks to Claude Haiku for structured extraction
5. Upserts to `cam_analysis` table
6. Returns `{ analysis_data }` to client

Verify each step works. Fix any issues found.

### 2. Add CAM Objection Window Countdown

The `CamAnalysisCard` already shows a static "You have X days" message for the audit window. Enhance this:

In `src/components/CamAnalysisCard.tsx`:
- Add a visual countdown component that calculates actual days remaining based on when the CAM reconciliation statement would typically be received.
- Since we don't know the exact statement date, show the audit window period prominently and add an informational note.
- The existing warning box with `AlertCircle` is good. Enhance it with:
  - Larger, more prominent display
  - Color coding: red if audit_window_days <= 30, amber if <= 90, green otherwise
  - A brief explanation of what the tenant should do during this window

Update the existing warning section in the component:

```tsx
{analysis.audit_window_days != null && (
  <div
    className="rounded-xl px-4 py-4 flex items-start gap-3"
    style={{
      background: analysis.audit_window_days <= 30
        ? 'rgba(239,68,68,0.10)'
        : analysis.audit_window_days <= 90
        ? 'rgba(245,158,11,0.08)'
        : 'rgba(16,185,129,0.08)',
      border: `1px solid ${
        analysis.audit_window_days <= 30
          ? 'rgba(239,68,68,0.22)'
          : analysis.audit_window_days <= 90
          ? 'rgba(245,158,11,0.20)'
          : 'rgba(16,185,129,0.18)'
      }`,
    }}
  >
    <AlertCircle className={`h-5 w-5 mt-0.5 shrink-0 ${
      analysis.audit_window_days <= 30 ? 'text-red-400' :
      analysis.audit_window_days <= 90 ? 'text-amber-400' : 'text-emerald-400'
    }`} />
    <div>
      <p className={`text-sm font-semibold ${
        analysis.audit_window_days <= 30 ? 'text-red-400' :
        analysis.audit_window_days <= 90 ? 'text-amber-400' : 'text-emerald-300'
      }`}>
        {analysis.audit_window_days}-Day CAM Objection Window
      </p>
      <p className="text-xs text-white/60 mt-1 leading-relaxed">
        After receiving the annual CAM reconciliation statement, you have {analysis.audit_window_days} days
        to review, object, or request a formal audit. Consider hiring a CAM auditor if charges seem unusually high.
      </p>
    </div>
  </div>
)}
```

### 3. Ensure the CAM Analysis Card Appears on the Location Detail Page

Read `src/app/location/[id]/page.tsx`. Verify that `<CamAnalysisCard storeId={id} />` is rendered when documents exist. It should already be there — if it is, no changes needed.

### 4. Verify Table Existence

The `cam_analysis` table should already exist from migration 003. However, if the table doesn't exist yet, the code should handle this gracefully.

In `src/lib/camAnalysis.ts`, ensure:
- The admin client is used for DB operations (bypasses RLS)
- Errors from the upsert are caught and logged
- The function returns `null` gracefully if the table doesn't exist

If the table needs to be created programmatically, add this to the beginning of `generateCamAnalysis`:

```typescript
// Ensure table exists (idempotent)
const admin = createAdminSupabaseClient()
await admin.rpc('exec_sql', {
  sql: `CREATE TABLE IF NOT EXISTS cam_analysis (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    analysis_data JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(store_id, tenant_id)
  );`
}).catch(() => {
  // exec_sql may not exist — table likely already exists from migration
})
```

**NOTE**: Only add this if the table doesn't already exist. Check the migration files first.

### 5. Improve CAM Keyword Search

In `src/lib/camAnalysis.ts`, the function searches for CAM-related chunks. Ensure the keyword list is comprehensive. The existing keywords should include:
- common area maintenance
- CAM
- operating expense
- proportionate share
- pro rata
- admin fee
- management fee
- reconciliation
- audit
- capital improvement
- controllable expense
- uncontrollable expense
- gross up
- base year
- expense stop

If any of these are missing, add them to the keyword search.

---

## Files to Create or Modify

### Files to MODIFY (read first, then edit):
1. `src/components/CamAnalysisCard.tsx` — Enhance audit window display
2. `src/lib/camAnalysis.ts` — Verify and improve keyword search, add error handling

### Files to CHECK (read and verify, fix only if broken):
1. `src/app/api/cam-analysis/route.ts` (or the directory containing GET/POST handlers)
2. `src/app/location/[id]/page.tsx` — Verify CamAnalysisCard is rendered
3. `src/types/index.ts` — Verify CamAnalysisData type exists
4. `supabase/migrations/003_cam_and_features.sql` — Verify table schema

---

## Verification

1. Run `npx tsc --noEmit` to check TypeScript compiles
2. Ensure no import errors

Run `npx next build` to verify. Fix any errors.
