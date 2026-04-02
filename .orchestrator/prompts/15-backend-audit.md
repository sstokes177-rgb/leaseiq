# Task 15: Backend + Security Audit

Read the entire src/ directory before making any changes.

## Project Context

This is a Next.js 16 (App Router, TypeScript) web app called LeaseIQ for commercial retail tenants. Key tech:
- Tailwind CSS + shadcn/ui
- Vercel AI SDK (`ai` + `@ai-sdk/anthropic`)
- Claude API
- Supabase (PostgreSQL + pgvector + Auth + Storage)
- Supabase clients in `src/lib/supabase.ts`:
  - `createServerSupabaseClient()` — respects RLS
  - `createAdminSupabaseClient()` — bypasses RLS (for server-side writes)
- pdf-parse (server-only)
- OpenAI embeddings

### Environment Variables
- ANTHROPIC_API_KEY
- OPENAI_API_KEY
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY

---

## What This Task Must Do

Perform a comprehensive backend and security audit. Check every API route, library function, and database query for security vulnerabilities and code quality issues. Fix everything found.

### Audit 1: Authentication Checks on ALL API Routes

Read EVERY file in `src/app/api/` recursively. For each API route, verify:

1. **Auth check exists**: Every route must call `supabase.auth.getUser()` and return 401 if no user.
2. **Auth check is the FIRST thing**: No database queries or processing should happen before auth verification.

**Routes to audit** (list all files in `src/app/api/`):
- `src/app/api/auth/signout/route.ts`
- `src/app/api/chat/route.ts`
- `src/app/api/conversations/route.ts`
- `src/app/api/conversations/[id]/route.ts`
- `src/app/api/documents/route.ts`
- `src/app/api/documents/[id]/url/route.ts`
- `src/app/api/documents/signed-url/route.ts`
- `src/app/api/documents/reprocess/route.ts`
- `src/app/api/upload/route.ts`
- `src/app/api/lease-summary/route.ts`
- `src/app/api/lease-summary/generate/route.ts`
- `src/app/api/obligations/route.ts`
- `src/app/api/obligations/generate/route.ts`
- `src/app/api/cam-analysis/route.ts`
- `src/app/api/cam-reconciliation/route.ts`
- `src/app/api/percentage-rent/route.ts`
- `src/app/api/occupancy-cost/route.ts`
- `src/app/api/lease-clauses/route.ts`
- `src/app/api/stores/route.ts`
- `src/app/api/stores/[id]/detect-asset-class/route.ts`
- `src/app/api/settings/route.ts`
- `src/app/api/team/route.ts`
- `src/app/api/critical-dates/route.ts` (if exists)
- `src/app/api/rent-escalation/route.ts` (if exists)
- Any other routes

For each route, the pattern MUST be:
```typescript
const supabase = await createServerSupabaseClient()
const { data: { user } } = await supabase.auth.getUser()
if (!user) return new Response('Unauthorized', { status: 401 })
// or return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
```

**Fix any route missing auth checks.**

### Audit 2: Tenant ID Filtering on ALL Queries

For every database query in every API route and library file, verify:

1. **All SELECT queries include tenant_id filter**: `eq('tenant_id', user.id)`
2. **All INSERT operations set tenant_id**: The tenant_id field is set from `user.id`
3. **All UPDATE/DELETE operations include tenant_id filter**: Prevent users from modifying other tenants' data

**CRITICAL**: When `store_id` is provided, queries must ALSO filter by store_id to prevent cross-location data leaks.

Files to audit for tenant_id filtering:
- All API routes (listed above)
- `src/lib/ragChain.ts`
- `src/lib/vectorStore.ts`
- `src/lib/leaseSummary.ts`
- `src/lib/obligationMatrix.ts`
- `src/lib/camAnalysis.ts`
- `src/lib/extractCriticalDates.ts`
- `src/lib/extractDisplayName.ts`
- `src/lib/validateDocument.ts`

### Audit 3: RLS Policies

Check `supabase/migrations/` for RLS policies. Verify:

1. All tables have RLS enabled: `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`
2. Each table has appropriate policies:
   - SELECT: `auth.uid() = tenant_id`
   - INSERT: `auth.uid() = tenant_id`
   - UPDATE: `auth.uid() = tenant_id`
   - DELETE: `auth.uid() = tenant_id`

Tables that need RLS:
- tenant_profiles
- stores
- documents
- document_chunks
- conversations
- messages
- critical_dates
- lease_summaries
- obligation_matrices
- cam_analysis
- cam_reconciliations
- percentage_rent_config
- percentage_rent_entries
- occupancy_cost_overrides
- team_invitations

Note: Some operations use `createAdminSupabaseClient()` which bypasses RLS. This is intentional for server-side writes. BUT — verify that admin client is ONLY used in server-side code (not client-side) and that tenant_id filtering is still applied in the code even when using the admin client.

### Audit 4: No API Keys in Frontend Code

Search for any API keys or secrets in client-side code:

1. Search ALL files in `src/` for patterns like:
   - `ANTHROPIC_API_KEY`
   - `OPENAI_API_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `sk-` (OpenAI key prefix)
   - `sk-ant-` (Anthropic key prefix)

2. Verify these are ONLY referenced in:
   - `src/lib/` (server-only code)
   - `src/app/api/` (server-only code)
   - `.env` files

3. Verify `NEXT_PUBLIC_` prefix is ONLY on Supabase URL and Anon Key (which are safe to expose).

4. Check that `pdf-parse` is never imported in client components (it's server-only).

### Audit 5: File Upload Validation

Read `src/app/api/upload/route.ts`. Verify:

1. **File type validation**: Only accepted types (PDF, DOCX) are processed
2. **File size limit**: There should be a max file size check (e.g., 20MB)
3. **MIME type validation**: Don't trust the file extension alone
4. **Filename sanitization**: The filename stored in the DB should be sanitized
5. **Storage path**: Files stored in Supabase Storage should use `{userId}/{timestamp}_{filename}` format

### Audit 6: Input Validation and Sanitization

For every API route that accepts user input:

1. **JSON body parsing**: Wrapped in try/catch
2. **Required fields**: Validated before use
3. **String inputs**: Not directly interpolated into SQL (should use parameterized queries via Supabase client)
4. **UUID inputs**: Validated as proper UUIDs where applicable
5. **Numeric inputs**: Validated as numbers where applicable

### Audit 7: Console.log Cleanup

Search for `console.log` statements in ALL files:

1. **Server-side** (`src/app/api/`, `src/lib/`): Convert meaningful logs to `console.info` or leave as `console.error`/`console.warn`. Remove debug-only logs.
2. **Client-side** (`src/components/`, `src/app/` non-api): **REMOVE ALL** `console.log` statements. These leak into the browser console.

Keep:
- `console.error()` for actual error logging (server-side)
- `console.warn()` for important warnings (server-side)

Remove:
- `console.log()` debug statements
- `console.log()` in client components

### Audit 8: TypeScript Strict Check

Run `npx tsc --noEmit` and fix ALL TypeScript errors. Common issues:
- Missing type annotations
- `any` types that should be specific
- Unused imports
- Incorrect prop types
- Missing null checks

### Audit 9: Error Response Consistency

All API routes should return consistent error formats:
```typescript
// For JSON endpoints:
NextResponse.json({ error: 'Human-readable message' }, { status: 4xx })

// For streaming endpoints:
new Response('Human-readable message', { status: 4xx })
```

Never expose:
- Internal error messages or stack traces
- Database error details
- File system paths

### Audit 10: maxDuration Settings

For API routes that call Claude or do heavy processing, verify `export const maxDuration` is set appropriately:
- Chat route: 60-90 seconds
- Generate routes (summary, obligations, CAM): 60-90 seconds
- Upload/reprocess: 120 seconds
- Simple CRUD routes: default (no maxDuration needed)

---

## How to Execute This Audit

1. First, list all files in `src/app/api/` recursively
2. Read each API route file
3. Check each item above
4. Fix issues as you find them
5. Then read all files in `src/lib/`
6. Check for security issues
7. Search for console.log statements and API key leaks
8. Run `npx tsc --noEmit` and fix errors
9. Run `npx next build` and fix errors

---

Run `npx next build` to verify. Fix any errors.
