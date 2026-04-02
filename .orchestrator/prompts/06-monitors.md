# Task 06: Co-Tenancy + Exclusive Use Monitors

Read the entire src/ directory before making any changes.

## Project Context

This is a Next.js 16 (App Router, TypeScript) web app called LeaseIQ for commercial retail tenants. Key tech:
- Tailwind CSS + shadcn/ui
- Vercel AI SDK (`ai` + `@ai-sdk/anthropic`) — `generateText` from `ai`, `anthropic` from `@ai-sdk/anthropic`
- Claude API: `claude-haiku-4-5-20251001` for extraction
- Supabase (PostgreSQL + pgvector + Auth)
- Keyword search: `keywordSearchChunks(keyword, tenantId, matchCount, storeId)` from `src/lib/vectorStore.ts`

### Styling Rules (MUST follow)
- Dark theme with emerald accents (#10b981)
- Font: Plus Jakarta Sans
- Glass cards: `glass-card` class (backdrop-blur, bg-white/4%, border white/7%)
- Labels: `text-[10px] font-semibold text-white/35 uppercase tracking-widest`
- Values: `text-sm text-white/85`
- Section bgs: `rgba(255,255,255,0.03)` with `border: 1px solid rgba(255,255,255,0.07)`

### Existing Files (READ these first)
- `src/app/api/lease-clauses/route.ts` — Existing API endpoint
- `src/components/LeaseClauseCard.tsx` — Existing UI component
- `src/app/location/[id]/page.tsx` — Location page (renders clause cards)

---

## What This Task Must Do

Verify and enhance the Co-Tenancy and Exclusive Use monitors. These features:
1. Search the lease for co-tenancy clauses (occupancy requirements that trigger rent reductions)
2. Search the lease for exclusive use clauses (restrictions on competing businesses)
3. Display results as info cards with article citations
4. Show a clear "Not found" state if no such clause exists

### Step 1: Verify the API Route

Read `src/app/api/lease-clauses/route.ts`. It should:

1. Accept `store_id` and `type` query params (`type` = "co-tenancy" or "exclusive-use")
2. Authenticate the user
3. Search for relevant chunks using keyword search
4. Send to Claude for structured extraction
5. Return the extracted clause data

Verify it works. If incomplete, here's the reference implementation:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase'
import { generateText } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { keywordSearchChunks } from '@/lib/vectorStore'

export const maxDuration = 60

const CLAUSE_KEYWORDS: Record<string, string[]> = {
  'co-tenancy': [
    'co-tenancy', 'co tenancy', 'occupancy requirement', 'anchor tenant',
    'opening co-tenancy', 'operating co-tenancy', 'minimum occupancy',
    'rent reduction', 'reduced rent', 'percentage rent in lieu',
  ],
  'exclusive-use': [
    'exclusive use', 'exclusive right', 'restricted use', 'competing business',
    'radius restriction', 'non-compete', 'use restriction', 'prohibited use',
  ],
}

const CLAUDE_PROMPTS: Record<string, string> = {
  'co-tenancy': `Analyze these lease excerpts for CO-TENANCY provisions. Co-tenancy clauses protect the tenant by requiring certain occupancy levels or the presence of specific anchor tenants in the shopping center.

Return ONLY valid JSON:
{
  "has_clause": boolean,
  "summary": "2-3 sentence description of the co-tenancy provision, or 'No co-tenancy clause was found in the reviewed lease sections.' if not found",
  "trigger_conditions": "string or null — what conditions trigger the co-tenancy right (e.g., 'If occupancy falls below 70%' or 'If the anchor tenant closes')",
  "rent_reduction": "string or null — what rent reduction applies when triggered (e.g., 'Rent reduced to 4% of gross sales' or 'Tenant pays percentage rent only')",
  "termination_right": "string or null — whether tenant can terminate if co-tenancy is not restored within a period",
  "article": "string or null — Article/Section reference (e.g., 'Article 6.3')"
}`,

  'exclusive-use': `Analyze these lease excerpts for EXCLUSIVE USE provisions. Exclusive use clauses restrict the landlord from leasing to competing businesses in the same center.

Return ONLY valid JSON:
{
  "has_clause": boolean,
  "summary": "2-3 sentence description of the exclusive use provision, or 'No exclusive use clause was found in the reviewed lease sections.' if not found",
  "exclusive_use_description": "string or null — what exclusive use the tenant has (e.g., 'Exclusive right to operate a bakery and sell baked goods')",
  "restrictions": "string or null — what restrictions apply to other tenants in the center",
  "remedies": "string or null — what happens if the landlord violates the exclusive use (rent reduction, termination right, etc.)",
  "article": "string or null — Article/Section reference"
}`,
}

export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(request.url)
  const storeId = url.searchParams.get('store_id')
  const clauseType = url.searchParams.get('type') as 'co-tenancy' | 'exclusive-use'

  if (!storeId || !clauseType) {
    return NextResponse.json({ error: 'store_id and type required' }, { status: 400 })
  }

  if (!CLAUSE_KEYWORDS[clauseType]) {
    return NextResponse.json({ error: 'Invalid clause type' }, { status: 400 })
  }

  // Verify store belongs to user
  const { data: store } = await supabase
    .from('stores').select('id').eq('id', storeId).eq('tenant_id', user.id).maybeSingle()
  if (!store) return NextResponse.json({ error: 'Store not found' }, { status: 404 })

  // Search for clause-related chunks
  const keywords = CLAUSE_KEYWORDS[clauseType]
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

  // Fallback: if keyword search returns nothing, try DB filter
  if (chunks.length === 0) {
    const admin = createAdminSupabaseClient()
    const patterns = clauseType === 'co-tenancy'
      ? 'co.tenancy|occupancy|anchor'
      : 'exclusive.use|exclusive.right|competing|non.compete'

    const { data: rawChunks } = await admin
      .from('document_chunks').select('content')
      .eq('store_id', storeId).eq('tenant_id', user.id).limit(50)

    const filtered = (rawChunks ?? []).filter(c =>
      new RegExp(patterns, 'i').test(c.content)
    )
    chunks.push(...filtered.map(c => c.content).slice(0, 15))
  }

  if (chunks.length === 0) {
    // No relevant text found — return "not found" result
    return NextResponse.json({
      clause: {
        has_clause: false,
        summary: clauseType === 'co-tenancy'
          ? 'No co-tenancy clause was found in the reviewed lease sections. This may mean your lease does not include co-tenancy protections, or the relevant section was not captured during document processing.'
          : 'No exclusive use clause was found in the reviewed lease sections. This may mean your lease does not include exclusive use protections, or the relevant section was not captured during document processing.',
      },
    })
  }

  try {
    const { text } = await generateText({
      model: anthropic('claude-haiku-4-5-20251001'),
      maxOutputTokens: 600,
      messages: [{
        role: 'user',
        content: `${CLAUDE_PROMPTS[clauseType]}

Lease excerpts:
${chunks.slice(0, 15).join('\n\n---\n\n').slice(0, 15000)}`,
      }],
    })

    const clause = JSON.parse(text.trim().replace(/^```json\s*|\s*```$/g, ''))
    return NextResponse.json({ clause })
  } catch (err) {
    console.error(`[LeaseClause] ${clauseType} extraction failed:`, err)
    return NextResponse.json({
      clause: {
        has_clause: false,
        summary: 'Analysis could not be completed. Please try again.',
      },
    })
  }
}
```

### Step 2: Verify the LeaseClauseCard Component

Read `src/components/LeaseClauseCard.tsx`. It should:

1. Fetch clause data on mount from GET `/api/lease-clauses?store_id=...&type=...`
2. Show loading skeleton
3. Show "not found" state with appropriate messaging
4. Show clause details when found

Verify the component handles these states correctly:
- **Loading**: Animated skeleton
- **No clause found**: `ShieldAlert` icon with dimmed message
- **Clause found**: `ShieldCheck` icon with clause details

The existing component should already have this structure. Verify the following:

**Co-tenancy card displays:**
- Summary
- Trigger conditions (when the co-tenancy protection kicks in)
- Rent reduction (what savings apply)
- Termination right (can tenant exit if conditions persist)
- Article reference

**Exclusive use card displays:**
- Summary
- Exclusive use description (what the tenant's exclusive right is)
- Restrictions (what competitors cannot do)
- Remedies (what happens if violated)
- Article reference

Color themes (already in existing component):
- Co-tenancy: pink (`rgba(236,72,153,...)`), icon `Users`, `text-pink-400`
- Exclusive use: sky blue (`rgba(14,165,233,...)`), icon `Store`, `text-sky-400`

### Step 3: Verify Location Page Integration

Read `src/app/location/[id]/page.tsx`. The clause cards should be rendered in a 2-column grid:

```tsx
{hasDocuments && (
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
    <LeaseClauseCard storeId={id} clauseType="co-tenancy" />
    <LeaseClauseCard storeId={id} clauseType="exclusive-use" />
  </div>
)}
```

This should already be there. Verify and fix if needed.

### Step 4: Add Article Citation Badges

Ensure both clause cards show the article reference as an emerald badge when available:

```tsx
{data.article && (
  <span
    className="inline-block text-[10px] font-medium px-1.5 py-0.5 rounded"
    style={{
      background: 'rgba(16,185,129,0.12)',
      border: '1px solid rgba(16,185,129,0.25)',
      color: 'rgb(52,211,153)',
    }}
  >
    {data.article}
  </span>
)}
```

This should already be in the component. Verify.

---

## Files to Create or Modify

### Modify (read first):
1. `src/app/api/lease-clauses/route.ts` — Verify/fix the extraction logic
2. `src/components/LeaseClauseCard.tsx` — Verify all states render correctly

### Check (read only, fix if broken):
1. `src/app/location/[id]/page.tsx` — Verify both cards are rendered
2. `src/lib/vectorStore.ts` — Verify `keywordSearchChunks` function exists

---

Run `npx next build` to verify. Fix any errors.
