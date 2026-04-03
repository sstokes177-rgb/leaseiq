Read the entire src/ directory before making any changes.

## TASK: Full Frontend and Backend Audit — Final Quality Pass

This is the last task. Go through the entire codebase and fix everything that's broken, inconsistent, or unfinished.

---

### PART 1: FRONTEND AUDIT

**Hydration errors:**
- Open every page component. Check for <p> tags containing <div>, <p>, or block elements inside them. Replace outer <p> with <div>.
- Check for mismatched server/client rendering (dates, random values, localStorage reads during SSR)
- Fix all "Hydration failed" or "Text content does not match" warnings

**Console errors:**
- Run the app (npm run dev)
- Open browser console (F12)
- Navigate through EVERY page: landing, login, signup, dashboard, each location, chat, portfolio, settings
- Document and fix every console error and warning
- Common issues: missing keys in lists, uncontrolled-to-controlled input changes, missing dependencies in useEffect

**Dead code removal:**
- Remove any unused imports (TypeScript will flag these)
- Remove any commented-out code blocks
- Remove any components that aren't used anywhere
- Remove any API routes that aren't called
- Remove any TODO/FIXME comments that have been resolved

**Broken links:**
- Check every navigation link, button, and sidebar item
- Ensure they all point to existing pages
- Fix any 404s

**Loading states:**
- Every page that fetches data must have a loading state (skeleton or spinner)
- Every button that triggers an API call must have a loading state (spinner, disabled)
- No blank screens while data loads

**Error states:**
- Every API call must have error handling with user-friendly messages
- No unhandled promise rejections
- No generic "Something went wrong" — explain what failed and what to do

---

### PART 2: BACKEND AUDIT

**API route security:**
- Every API route must check authentication (verify session/token)
- No API route should be accessible without authentication (except login/signup/public pages)
- All Supabase queries must use the authenticated client (not the service role client for user-facing queries)
- RLS must be enabled on ALL tables with appropriate policies

**Database consistency:**
- Check that all referenced tables exist
- Check that all foreign key relationships are valid
- Check that all indexes exist for frequently queried columns (tenant_id, store_id, document_id, created_at)
- No orphaned records possible (ON DELETE CASCADE where appropriate)

**Environment variables:**
- Check that all required env vars are documented
- The app should not crash if an optional env var is missing — gracefully degrade
- Required vars: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, ANTHROPIC_API_KEY (or OPENAI_API_KEY)

**API error handling:**
```typescript
// Every API route should follow this pattern:
try {
  // ... logic
  return NextResponse.json({ data }, { status: 200 });
} catch (error) {
  console.error('[API_NAME] Error:', error);
  return NextResponse.json(
    { error: 'User-friendly message', details: error instanceof Error ? error.message : 'Unknown' },
    { status: 500 }
  );
}
```

**Rate limiting awareness:**
- AI-powered endpoints (chat, risk score, CAM audit) should not allow rapid repeated calls
- Add simple client-side throttling: disable the button for 3 seconds after a click
- Show "Please wait..." if user tries to re-submit too quickly

---

### PART 3: TYPE SAFETY

Run: `npx tsc --noEmit`

Fix ALL TypeScript errors. Specifically:
- Replace 'any' types with proper types where possible
- Add return types to all API route handlers
- Ensure all component props are properly typed
- Fix any "could be undefined" errors with proper null checks

---

### PART 4: PERFORMANCE CHECK

1. Check for N+1 query patterns (looping with individual database calls instead of batch queries)
2. Verify database queries have reasonable LIMIT clauses
3. Check that large data fetches use pagination
4. Ensure images/files go directly to Supabase Storage, not through API memory
5. Check that the Recharts/chart library isn't imported on pages that don't use charts (tree-shake)

---

### PART 5: BRANDING FINAL CHECK

Search the ENTIRE codebase one last time for any instances of:
- "ClauseIQ" or "clauseiq"
- "LeaseIQ" or "leaseiq"  
- "Tenora" or "tenora"
- Any other old brand names

Replace ALL with "Provelo" or "provelo". Logo initials: "PV". Tagline: "Commercial Lease Intelligence".

---

### FINAL BUILD

Run: npx next build
The build MUST complete with ZERO errors.

Then: git add . && git commit -m "Phase 2 Task 11: Full audit complete - production ready" && git push

This is the final task. The app should be production-ready after this.

