Read the entire src/ directory before making any changes.

## TASK: Full Frontend + Backend Audit — Final Production Quality Pass

This is the FINAL task. Go through the entire codebase and fix everything that's broken, inconsistent, incomplete, or unpolished. The app must feel production-ready when this task completes.

---

### PART 1: CONSOLE ERROR SWEEP

1. Mentally trace through every page: landing, login, signup, forgot-password, reset-password, verify-email, dashboard, portfolio, each location detail page, chat, settings, onboarding
2. In each component, check for:
   - Missing key props in .map() iterations
   - Uncontrolled-to-controlled input switches
   - Missing useEffect dependency arrays
   - Async operations without error handling
   - Components that read from localStorage during SSR (causes hydration mismatch)
3. Fix ALL hydration errors:
   - Any <p> containing <div>, <p>, or block elements → change outer to <div>
   - Any dynamic content that differs between server and client → wrap in useEffect or use suppressHydrationWarning

---

### PART 2: DEAD CODE REMOVAL

1. Search for and remove:
   - Unused imports (TypeScript will flag most)
   - Commented-out code blocks (if they're not TODOs)
   - Components that aren't imported anywhere
   - API routes that aren't called from any frontend code
   - CSS classes defined but never used
2. Remove the pm-dashboard directory if it still exists (Task 03 should have done this)
3. Remove any test/demo data or placeholder content

---

### PART 3: BRANDING FINAL CHECK

Search the ENTIRE codebase for:
- "ClauseIQ", "clauseiq" → replace with "Provelo" / "provelo"
- "LeaseIQ", "leaseiq" → replace with "Provelo" / "provelo"
- "Tenora", "tenora" → replace with "Provelo" / "provelo"
- Any other old brand names
- Logo initials should be "PV" everywhere
- Tagline: "Commercial Lease Intelligence"

---

### PART 4: API ROUTE SECURITY

Check every file in src/app/api/:
1. Every route must verify authentication:
```typescript
const supabase = await createServerSupabaseClient()
const { data: { user } } = await supabase.auth.getUser()
if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
```
2. All Supabase queries for user data must filter by tenant_id = user.id
3. No API route should expose data from other tenants
4. All error responses should be user-friendly, not raw error messages
5. Add try-catch around every async operation

---

### PART 5: TYPE SAFETY

Run: npx tsc --noEmit

Fix ALL TypeScript errors:
- Replace 'any' types with proper interfaces
- Add missing return types
- Fix "possibly undefined" errors with proper null checks
- Ensure all component props are properly typed

---

### PART 6: LOADING AND ERROR STATES

Every component that fetches data must have:
1. Loading state: skeleton loader OR spinner with message
2. Error state: user-friendly message + "Try again" button
3. Empty state: helpful message explaining what to do (from Task 02)

Check these components specifically:
- LeaseSummaryCard
- ObligationMatrixCard
- RiskScoreCard
- CamAuditCard
- CriticalDatesCard
- ChatSidebar
- Portfolio page charts
- Dashboard stats

---

### PART 7: PERFORMANCE

1. Check for N+1 query patterns (looping with individual DB calls)
2. Verify all Supabase queries have LIMIT clauses
3. Ensure no component re-renders unnecessarily (memo heavy components if needed)
4. Check that Recharts is only imported on pages that use charts
5. Verify images use Next.js Image component (not raw <img>)

---

### PART 8: ACCESSIBILITY BASICS

1. All interactive elements should have aria-labels
2. All images should have alt text
3. Focus states should be visible (outline-emerald-500 or similar)
4. Color alone should not convey meaning (always pair with text/icons)
5. Form inputs should have associated labels

---

### FINAL BUILD AND COMMIT

1. Run: npx tsc --noEmit — fix ALL TypeScript errors
2. Run: npx next build — fix ALL build errors
3. Run: npx next lint — fix ALL lint errors (or note them)
4. Then: git add . && git commit -m "Phase 3 Complete: Production-ready audit — all fixes applied" && git push

This is the final task. The app should be production-ready after this.

