Read the entire src/ directory.

## TASK: Final Integration Pass — Fix Everything Previous Tasks Broke

This is the LAST task. The previous 5 tasks may have introduced conflicts, duplicate code, or broken each other's work. This task fixes ALL of that.

---

### STEP 1: BUILD CHECK
Run: npx next build
If it fails, read EVERY error and fix them ALL. Common issues after multi-task runs:
- Duplicate imports
- Conflicting component props (Task 00 added onArticleClick but Task 02 removed it)
- Missing files referenced by other files
- Type mismatches between API response and frontend expectations

### STEP 2: VERIFY KEY FEATURES WORK

Trace through the code for each feature and verify the data flow is complete:

1. **Chat saving:** chat/page.tsx → useChat body sends UUID → /api/chat receives it → validates UUID → saves to conversations + messages tables → ChatSidebar fetches from /api/conversations → displays list
   - If ANY link is broken, fix it

2. **Risk score:** RiskScoreCard triggers → /api/risk-score → fetches chunks → sends to Claude → parseAIJSON → saves to lease_risk_scores → displays in card
   - Citations must be clickable → verify onArticleClick prop chain from location page to RiskScoreCard to CitationSidePanel

3. **Lease comparison:** button on location page → /api/lease-compare → fetches chunks per document → sends to Claude → parseAIJSON → displays side-by-side
   - Verify it only shows when location has 2+ documents

4. **Portfolio:** /portfolio page → /api/portfolio → aggregates data → renders charts + heatmap
   - Verify Recharts imports work
   - Verify data flows from all stores

5. **Command palette:** Cmd+K → CommandPalette opens → lists commands → navigates on select
   - Verify it's registered in the root layout

6. **Notifications:** bell icon → dropdown → fetches from /api/notifications → displays list
   - Verify notification creation on dashboard load for critical dates

7. **About page:** /about route → renders story sections
   - Verify navigation links exist (landing page navbar, sidebar)

### STEP 3: NAVIGATION INTEGRITY

Verify ALL navigation paths:
- Landing page → Sign In → Login page
- Landing page → Start Free → Signup page
- Login → Dashboard
- Dashboard → click location → Location detail page
- Location page → each tab works and shows content
- Location page → Chat tab → shows conversation list → click opens chat
- Location page → Ask Your Lease button → opens chat
- Sidebar → Dashboard, Portfolio, Settings, each location
- Sidebar logo (PV/Provelo) → navigates to landing page
- Command palette → all navigation commands work
- About page accessible from landing page

### STEP 4: REMOVE CONFLICTS

Check for:
- Multiple definitions of the same component
- Duplicate CSS class definitions
- Conflicting state management (two components trying to control the same state)
- Circular imports

### STEP 5: FINAL BUILD AND LINT

1. Run: npx tsc --noEmit — fix ALL type errors
2. Run: npx next build — must pass with ZERO errors
3. Run: git add . && git commit -m "Phase 4 Complete: All audits passed, production ready" && git push

This is the absolute final task. The app must build cleanly and every feature must have a complete code path.

