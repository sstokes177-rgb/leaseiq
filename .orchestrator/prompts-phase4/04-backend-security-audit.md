Read the entire src/app/api/ directory and src/lib/ directory.

## TASK: Backend + Security Audit

---

### API ROUTE AUTHENTICATION
Check EVERY file in src/app/api/. Each route must:
1. Verify authentication at the top:
```typescript
const supabase = await createServerSupabaseClient()
const { data: { user } } = await supabase.auth.getUser()
if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
```
2. Filter all queries by tenant_id = user.id
3. Never expose data from other tenants

List of routes to check:
- /api/chat
- /api/conversations (and [id])
- /api/risk-score
- /api/cam-audit
- /api/cam-analysis
- /api/cam-reconciliation
- /api/lease-summary (and /generate)
- /api/obligations (and /generate)
- /api/lease-clauses
- /api/lease-compare
- /api/documents (and [id], reprocess, signed-url)
- /api/stores (and [id])
- /api/upload
- /api/settings
- /api/team
- /api/critical-dates
- /api/occupancy-cost
- /api/percentage-rent
- /api/rent-escalation
- /api/article-chunks
- /api/notifications (if exists)
- /api/portfolio (if exists)
- /api/onboarding (if exists)
- Any other routes

### ERROR HANDLING
Every route must have try-catch:
```typescript
try {
  // ... logic
  return NextResponse.json({ data })
} catch (error) {
  console.error('[RouteName] Error:', error)
  return NextResponse.json(
    { error: 'User-friendly message' },
    { status: 500 }
  )
}
```

### AI JSON PARSING
Verify that EVERY route calling Claude/AI uses the parseAIJSON utility (from Task 00), NOT raw JSON.parse. This prevents the markdown fence issue from breaking any feature.

### ENVIRONMENT VARIABLES
Check that the app handles missing env vars gracefully:
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY  
- SUPABASE_SERVICE_ROLE_KEY
- ANTHROPIC_API_KEY
If any are missing, the relevant features should show "Configuration needed" not crash.

### RATE LIMITING AWARENESS
AI-powered routes (chat, risk-score, cam-audit, lease-compare, lease-summary, obligations) should:
- Disable the trigger button for 3 seconds after click (frontend)
- Return 429 if called too frequently (simple in-memory tracking is fine)

### DATABASE QUERY SAFETY
- All queries must have LIMIT clauses (no unbounded SELECTs)
- Check for N+1 patterns (looping individual queries instead of batch)
- Verify indexes exist for common query patterns (the migrations should have created them)

### BRANDING CHECK
Final sweep for old brand names:
- Search for: ClauseIQ, clauseiq, LeaseIQ, leaseiq, Tenora, tenora
- Replace with: Provelo, provelo
- Logo initials: PV
- Tagline: Commercial Lease Intelligence

---

Run npx next build — fix ALL errors.
Then: git add . && git commit -m "Phase 4: Backend and security audit complete" && git push

