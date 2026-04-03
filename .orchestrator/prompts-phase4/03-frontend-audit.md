Read the entire src/ directory.

## TASK: Complete Frontend Code Audit

---

### HYDRATION ERRORS
Search every component for:
- <p> tags containing <div>, <p>, or any block elements → change outer to <div> with same className
- Components reading localStorage during initial render (causes server/client mismatch) → wrap in useEffect
- Dynamic dates or random values rendered during SSR → use useEffect + useState pattern
- Fix ALL "Hydration failed" or "Text content does not match" warnings

### CONSOLE ERRORS
Trace through every component checking for:
- Missing `key` props in .map() → add unique keys
- Uncontrolled-to-controlled input transitions → set default values
- Missing useEffect dependencies → add to dependency array or suppress with reason
- Async operations without try-catch → wrap in error handling
- Unhandled promise rejections → add .catch()

### DEAD CODE
- Run: grep for unused imports across all files
- Remove commented-out code blocks
- Remove components not imported anywhere
- Remove API routes not called from frontend
- Remove any TODO/FIXME that has been resolved

### BROKEN LINKS
- Check every Link component and router.push call
- Verify all navigation targets exist as pages
- Fix any 404 routes

### TYPE SAFETY
- Run: npx tsc --noEmit
- Fix ALL TypeScript errors
- Replace 'any' with proper types where possible
- Add return types to API route handlers
- Ensure all props are typed

### LOADING AND ERROR STATES
Every data-fetching component must have:
1. Loading: skeleton shapes matching content
2. Error: user-friendly message + retry button
3. Empty: helpful message with CTA

Check specifically: LeaseSummaryCard, ObligationMatrixCard, RiskScoreCard, CamAuditCard, CamAnalysisCard, CriticalDatesCard, ChatSidebar, Portfolio charts, Dashboard stats

---

Run npx next build — fix ALL errors.
Then: git add . && git commit -m "Phase 4: Frontend code audit complete" && git push

