#!/bin/bash
set -euo pipefail

PROJECT_DIR="/c/Users/sydne/Desktop/Coding APP/leaseiq"
PROMPTS_DIR="$PROJECT_DIR/.orchestrator/prompts-phase4"
LOGS_DIR="$PROJECT_DIR/.orchestrator/logs-phase4"
STATUS_FILE="$PROJECT_DIR/.orchestrator/status-phase4.log"
TIMEOUT_SECONDS=3000
MAX_TURNS=80

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

timestamp() { date "+%Y-%m-%d %H:%M:%S"; }
log() { echo -e "${CYAN}[$(timestamp)]${NC} $1"; }
log_pass() { echo -e "${GREEN}[$(timestamp)] PASS${NC} — $1"; }
log_fail() { echo -e "${RED}[$(timestamp)] FAIL${NC} — $1"; }
log_skip() { echo -e "${YELLOW}[$(timestamp)] SKIP${NC} — $1"; }

cd "$PROJECT_DIR"
unset ANTHROPIC_API_KEY 2>/dev/null || true
mkdir -p "$PROMPTS_DIR" "$LOGS_DIR"

log "================================================================"
log "PROVELO PHASE 4 — AUDITS + FIXES + ABOUT PAGE"
log "6 Tasks | 50 min timeout each"
log "================================================================"
log ""
log "Writing prompt files..."


cat > "$PROMPTS_DIR/00-critical-fixes.md" << 'TASKEOF'
Read the entire src/ directory before making any changes.

## TASK: Critical Bug Fixes — Chat UUID, JSON Parsing, Visual Overhaul

---

### FIX 1: CHAT UUID ERROR (this has failed 3+ times — must be fixed NOW)

Error: "invalid input syntax for type uuid: VoJ7u4nxOEjtCnsE"

The useChat hook from @ai-sdk/react generates short random IDs. Supabase needs UUIDs.

In src/app/api/chat/route.ts:
1. Find where conversationId is extracted from the request body
2. Add this validation IMMEDIATELY after extracting it:

```typescript
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function ensureUUID(id: string | undefined | null): string | null {
  if (!id) return null;
  if (UUID_REGEX.test(id)) return id;
  // Not a valid UUID — generate a new one
  return crypto.randomUUID();
}
```

3. Replace the raw conversationId with: `const safeConversationId = ensureUUID(conversationId)`
4. Use safeConversationId in ALL Supabase operations instead of conversationId
5. Return the safeConversationId in the response headers so the frontend can update:
   Add to the stream response: `headers: { 'X-Conversation-Id': safeConversationId }`

In src/app/chat/page.tsx:
1. Find where activeConversationId is created — it should use crypto.randomUUID()
2. Find the useChat hook configuration
3. Ensure body sends: `{ id: activeConversationId, store_id: storeId }`
4. The useChat hook's `id` prop should be set to activeConversationId
5. On response, check for X-Conversation-Id header and update state if different

---

### FIX 2: JSON PARSE FAILURES (risk-score, lease-compare, and ALL AI routes)

Claude sometimes returns ```json ... ``` fenced JSON. The parser must strip this.

Create a shared utility in src/lib/parseAIJSON.ts:

```typescript
export function parseAIJSON<T = unknown>(raw: string): T {
  let text = raw.trim();
  
  // Strip markdown code fences
  text = text.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '');
  text = text.trim();
  
  // Try direct parse first
  try {
    return JSON.parse(text) as T;
  } catch {
    // Fallback: find first { and last }
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      return JSON.parse(text.slice(firstBrace, lastBrace + 1)) as T;
    }
    // Try array
    const firstBracket = text.indexOf('[');
    const lastBracket = text.lastIndexOf(']');
    if (firstBracket !== -1 && lastBracket > firstBracket) {
      return JSON.parse(text.slice(firstBracket, lastBracket + 1)) as T;
    }
    throw new Error(`Failed to parse AI JSON response: ${text.slice(0, 200)}`);
  }
}
```

Now replace JSON.parse in EVERY API route that parses AI-generated text:
- src/app/api/risk-score/route.ts
- src/app/api/lease-compare/route.ts (if it exists)
- src/app/api/cam-audit/route.ts
- src/app/api/lease-summary/generate/route.ts
- src/app/api/obligations/generate/route.ts
- src/app/api/lease-clauses/route.ts
- Any other route that calls Claude/AI and parses the response

Import and use: `import { parseAIJSON } from '@/lib/parseAIJSON'`

---

### FIX 3: LOCATION PAGE TAB BAR STYLING

The tab bar looks awkward — flat black bar with empty space. Redesign:

1. Remove any dark background band behind the tabs. The tabs should float naturally on the page background.
2. Tab bar container: no background color, just a subtle bottom border (border-b border-white/[0.06]) to separate from content
3. Each tab: text-sm font-medium px-4 py-3 relative transition-all
4. Active tab: text-emerald-400 with a 2px emerald bottom border (pseudo-element or border-b-2 border-emerald-500)
5. Inactive tab: text-gray-400 hover:text-gray-200
6. NO pill/rounded background on tabs — just clean underline style (like Stripe's dashboard tabs)
7. The tab bar should be full width, with tabs left-aligned (not centered)
8. Add subtle spacing: mt-6 mb-8 between the buttons above and the tab content below
9. The tab bar should be sticky (stick to top when scrolling) with a backdrop-blur-xl bg-gray-950/80

Content area below tabs:
- Minimum height: calc(100vh - 300px) so it never looks empty
- If a section has limited content, pad it and center it vertically
- Remove excessive whitespace between cards — use gap-6 instead of gap-8 or larger

---

### FIX 4: CHAT TAB — SHOW HISTORICAL CHATS

The Chat tab on the location page currently shows just an "Open Chat" button with lots of empty space. Instead:

1. Show a list of historical conversations for this location directly in the Chat tab
2. Fetch conversations from /api/conversations?store_id=X
3. Display as a clean list:
   - Each conversation: title, date, message count preview
   - Click to open that conversation in the full chat page
   - Style: cards with hover effect, or a clean list with dividers
4. Above the list: "New Chat" button (opens chat with a fresh conversation)
5. If no conversations exist: show the empty state with suggested questions
6. Each conversation card:
   - Left: chat icon
   - Middle: title (font-medium text-white), relative date (text-sm text-gray-400)
   - Right: arrow icon indicating it's clickable
   - Hover: bg-white/[0.04] transition
   - Click: navigates to /chat?store=STORE_ID&conversation=CONV_ID

---

### FIX 5: SIDEBAR EXPAND TOGGLE

The sidebar is collapsed to icons with no way to expand. Add:

1. A toggle button at the bottom of the sidebar (or top-right corner)
2. When collapsed: show a small ChevronRight icon button
3. When expanded: show ChevronLeft icon button
4. Button style: w-8 h-8 rounded-full bg-white/[0.06] hover:bg-white/[0.1] flex items-center justify-center transition-all
5. Position: absolute right-[-16px] top-[50%] transform -translate-y-1/2 (half inside, half outside the sidebar) with z-10
6. OR at the bottom of the sidebar as a full-width row
7. Store state in localStorage key 'provelo_sidebar_expanded'
8. Default: expanded (showing full text labels)

---

Run npx next build — fix ALL errors.
Then: git add . && git commit -m "Phase 4: Fix chat UUID, JSON parsing, tab styling, chat history, sidebar toggle" && git push

TASKEOF
log "  Created 00-critical-fixes.md"

cat > "$PROMPTS_DIR/01-about-page.md" << 'TASKEOF'
Read the entire src/ directory before making any changes.

## TASK: Build an "About Provelo" Page — Story-Driven Walkthrough

Create a beautiful, professional page that walks prospective users through HOW Provelo helps tenants, using a scenario-based narrative. This is NOT a features list — it's a STORY.

IMPORTANT: Do NOT slander property management companies. Do NOT position Provelo as adversarial to landlords or managers. Position it as a tool that helps tenants be informed, organized, and proactive — something that benefits everyone.

---

### CREATE: src/app/about/page.tsx

**Narrative structure — tell a story of a tenant named "Sarah" who manages 12 retail locations:**

**Section 1: The Challenge**
"Sarah runs 12 retail locations across three states. Each location has a different lease, different terms, different critical dates. She spends hours every month digging through filing cabinets and PDFs trying to answer basic questions about her leases."
- Paint the picture of complexity without blaming anyone
- Tone: empathetic, relatable

**Section 2: Upload and Understand (Lease Abstraction)**
"Sarah uploads her first lease to Provelo. In under two minutes, the AI reads all 87 pages and builds a complete summary — tenant name, landlord, lease dates, rent schedule, renewal options, permitted use, and every critical clause."
- Highlight: AI-extracted summary, instant understanding
- Visual: show a mock card layout resembling the lease summary

**Section 3: Ask Anything (AI Chat)**
"'Who's responsible for HVAC repairs?' Sarah types. Provelo responds in seconds: 'Per Article 9.1 of your base lease, HVAC maintenance is your responsibility as the tenant. You must maintain a service contract per Section 9.1(c).' Every answer cites the exact article."
- Highlight: natural language Q&A, article-level citations
- Tone: conversational, empowering

**Section 4: Know Your Risk (Risk Scoring)**
"Provelo scores Sarah's lease across 20 clause categories. Her downtown location scores 42 out of 100 — a red flag. The lease has no termination right, no CAM cap, and the landlord can relocate her with 90 days notice. Provelo generates specific negotiation recommendations with suggested lease language she can bring to her attorney."
- Highlight: risk scoring, negotiation playbook
- Tone: proactive, empowering

**Section 5: Catch Billing Errors (CAM Audit)**
"When Sarah receives her annual CAM reconciliation, she uploads it to Provelo. The system checks it against 14 detection rules and finds that her pro-rata share is calculated incorrectly — she's been overcharged $4,200 this year. Provelo generates a professional dispute letter she can send to her property manager."
- Highlight: forensic CAM audit, dispute letters
- Tone: factual, not adversarial — "billing errors happen, Provelo helps you catch them"

**Section 6: Never Miss a Date (Critical Dates)**
"Sarah's lease renewal deadline is in 6 months. Provelo alerts her 210 days before, then again at 90 days and 30 days. She never misses a deadline again."
- Highlight: configurable alerts, calendar view

**Section 7: See the Big Picture (Portfolio Analytics)**
"Across all 12 locations, Sarah can compare risk scores, track expirations, and spot trends. She sees that three leases expire within 8 months of each other — giving her leverage to negotiate better terms."
- Highlight: portfolio dashboard, cross-location intelligence

**Section 8: Compare Changes (Lease Comparison)**
"When Sarah's landlord proposes an amendment, she uploads it alongside her base lease. Provelo highlights every change — what was modified, whether it's favorable or unfavorable, and what she should watch out for."
- Highlight: side-by-side comparison, unique feature

**Final Section: CTA**
"Whether you manage 1 location or 1,000, Provelo gives you the lease intelligence you need to protect your business."
- "Start Free" button
- "No credit card required"

---

### DESIGN

- Full-page scroll experience
- Each section: full viewport height (or close to it) with clean typography
- Alternating subtle background tints between sections (very subtle — gray-950 vs gray-900/50)
- Large section numbers or chapter markers on the left (subtle, decorative)
- Typography: text-4xl for section headings, text-lg text-gray-300 for narrative, generous line-height (1.8)
- Use lucide-react icons as section markers (MessageSquare, Shield, BarChart3, Calendar, FileText, etc.)
- NO stock photos. Use icons, subtle gradients, and typography as the visual language.
- Smooth scroll between sections
- Each section fades in as user scrolls to it (use Intersection Observer + CSS transition)

---

### NAVIGATION

- Add "About" link in the landing page navbar (between "How It Works" and "For Tenants")
- Add "About" link in the app sidebar footer (small, text-gray-500)
- The About page should have the same navbar as the landing page (not the app sidebar)

---

Run npx next build — fix ALL errors.
Then: git add . && git commit -m "Phase 4: About Provelo story-driven walkthrough page" && git push

TASKEOF
log "  Created 01-about-page.md"

cat > "$PROMPTS_DIR/02-visual-audit.md" << 'TASKEOF'
Read the entire src/ directory before making any changes.

## TASK: Visual/UI Audit — Fix Empty Spaces, Add Professionalism, Institutional Feel

The app currently has too much empty space, inconsistent styling, and doesn't feel like a serious institutional product. Fix everything.

---

### PRINCIPLE: No empty space without purpose

Every section of the app should feel intentionally designed. Empty space should be "breathing room" between elements, NOT blank voids that make the page look unfinished.

### AUDIT EVERY PAGE:

**Dashboard (src/app/dashboard/page.tsx):**
- Stats cards should fill the full width in a clean grid (2 or 3 columns on desktop, 1 on mobile)
- If there's space below the cards, add: recent activity feed, quick actions, or portfolio summary
- If the user has no locations: the empty state should fill the viewport center — large, inviting, not a tiny message in the corner
- Remove any spacing larger than gap-6 between cards
- All cards should be the same height in a row (use grid with auto-rows or items-stretch)

**Location detail page (src/app/location/[id]/page.tsx):**
- Tab content area: minimum height so it never looks like an empty page
- Overview tab: lease summary should fill more width (max-w-4xl or wider), reduce inner padding if cards feel too spacious
- Risk & Compliance tab: if risk score hasn't been analyzed yet, show a prominent CTA card that fills the space
- Financial tab: if no CAM data, show an explanatory card about what this section does
- Documents tab: document list + upload zone should fill available space
- Chat tab: historical conversations list should fill the space, not a tiny "Open Chat" button centered in a void
- Between the location header and tabs: reduce vertical space. Header → buttons → tabs should feel compact and connected, not spread apart

**Portfolio page:**
- Charts should fill available width
- Below charts: if no data, show helpful empty states
- Heatmap table: full width

**Settings page:**
- Form fields should have reasonable max-width (640px), centered
- Remove excessive spacing between sections

---

### SPECIFIC VISUAL FIXES:

1. **Tab bar (location page):** Remove the dark band background. Tabs should use underline style (active = emerald bottom border, no pill background). Left-aligned, not centered.

2. **Card consistency:** Every card across the app must use:
   - bg-white/[0.03] (NOT bg-white/5 or bg-gray-800 or other variants)
   - border border-white/[0.06]
   - rounded-xl
   - p-6 (consistent padding)
   - NO heavy shadows

3. **Button consistency:**
   - Primary: bg-emerald-600 hover:bg-emerald-500 (NOT gradient — clean solid color)
   - Secondary: bg-transparent border border-white/[0.1] text-gray-300 hover:text-white hover:bg-white/[0.05]
   - Remove any gradient buttons — they look dated. Use solid colors.

4. **Typography consistency:**
   - Page titles: text-2xl font-semibold text-white
   - Section headers: text-lg font-medium text-white
   - Body: text-sm text-gray-300 (or text-base for important content)
   - Labels: text-xs uppercase tracking-wider text-gray-500
   - NO mixing of text sizes within the same context

5. **Reduce "Ask Your Lease" and "Upload Documents" button sizes:** They're too large and dominate the page. Make them normal-sized buttons that sit naturally below the header:
   - Remove the oversized width — auto width based on content
   - Smaller padding: px-5 py-2.5 (not px-8 py-4)
   - Keep the emerald primary style but tone down the prominence
   - They should feel like useful actions, not the ENTIRE purpose of the page

6. **Loading skeletons:** Replace any remaining spinners with skeleton loaders that match the content shape. Pulsing animation: animate-pulse bg-white/[0.06] rounded.

7. **Hover states on all interactive elements:** Every clickable thing should have a visible hover transition (opacity change, background change, or subtle scale).

---

### INSTITUTIONAL FEEL CHECKLIST:

- [ ] Consistent 8px spacing grid
- [ ] No element wider than its container
- [ ] All text is readable (contrast ratio 4.5:1+)
- [ ] No orphaned labels or headings without content
- [ ] Every loading state uses skeletons, not spinners
- [ ] Every error state has a helpful message, not a raw error
- [ ] No console errors
- [ ] Colors limited to: emerald (action), gray (neutral), red (danger), amber (warning)
- [ ] Animations are subtle (150-200ms, not flashy)

---

Run npx next build — fix ALL errors.
Then: git add . && git commit -m "Phase 4: Visual audit - fix empty spaces, professionalism, institutional feel" && git push

TASKEOF
log "  Created 02-visual-audit.md"

cat > "$PROMPTS_DIR/03-frontend-audit.md" << 'TASKEOF'
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

TASKEOF
log "  Created 03-frontend-audit.md"

cat > "$PROMPTS_DIR/04-backend-security-audit.md" << 'TASKEOF'
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

TASKEOF
log "  Created 04-backend-security-audit.md"

cat > "$PROMPTS_DIR/05-final-integration.md" << 'TASKEOF'
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

TASKEOF
log "  Created 05-final-integration.md"

log ""
log "All 6 prompt files created"
log ""
log "================================================================"
log "EXECUTING TASKS..."
log "================================================================"

echo "Phase 4 started at $(timestamp)" > "$STATUS_FILE"
echo "========================================" >> "$STATUS_FILE"

TOTAL=0
PASSED=0
FAILED=0
SKIPPED=0

for prompt_file in "$PROMPTS_DIR"/*.md; do
  [ -f "$prompt_file" ] || continue
  TOTAL=$((TOTAL + 1))
  task_name=$(basename "$prompt_file" .md)
  log_file="$LOGS_DIR/${task_name}.log"

  log ""
  log "TASK $TOTAL/6: $task_name"

  set +e
  timeout $TIMEOUT_SECONDS claude -p --dangerously-skip-permissions --max-turns $MAX_TURNS < "$prompt_file" > "$log_file" 2>&1
  exit_code=$?
  set -e

  if [ $exit_code -eq 124 ]; then
    log_skip "$task_name — TIMED OUT"
    echo "[$task_name] TIMEOUT" >> "$STATUS_FILE"
    SKIPPED=$((SKIPPED + 1))
    git add -A 2>/dev/null || true
    git commit -m "TIMEOUT: $task_name" --allow-empty 2>/dev/null || true
    git push 2>/dev/null || true
    continue
  fi

  log "  Building..."
  set +e
  npx next build > "$LOGS_DIR/${task_name}-build.log" 2>&1
  build_exit=$?
  set -e

  if [ $build_exit -eq 0 ]; then
    log_pass "$task_name"
    echo "[$task_name] PASS" >> "$STATUS_FILE"
    PASSED=$((PASSED + 1))
    git add -A
    git commit -m "PASS: $task_name" 2>/dev/null || true
    git push 2>/dev/null || true
  else
    log_fail "$task_name — auto-fixing..."
    FAILED=$((FAILED + 1))

    set +e
    echo "Read the build errors below and fix ALL TypeScript and compilation errors. Do NOT add new features — only fix errors so npx next build passes.

Build errors:
$(tail -80 "$LOGS_DIR/${task_name}-build.log")" | \
      timeout 600 claude -p --dangerously-skip-permissions --max-turns 20 > "$LOGS_DIR/${task_name}-fix.log" 2>&1
    npx next build > "$LOGS_DIR/${task_name}-rebuild.log" 2>&1
    rebuild_exit=$?
    set -e

    if [ $rebuild_exit -eq 0 ]; then
      log_pass "$task_name (fixed on retry)"
      echo "[$task_name] PASS (fixed)" >> "$STATUS_FILE"
      FAILED=$((FAILED - 1))
      PASSED=$((PASSED + 1))
    else
      log_fail "$task_name — still failing"
      echo "[$task_name] FAIL" >> "$STATUS_FILE"
    fi

    git add -A
    git commit -m "FIX: $task_name" 2>/dev/null || true
    git push 2>/dev/null || true
  fi
done

log ""
log "================================================================"
log "PHASE 4 COMPLETE"
log "================================================================"
log "Total: $TOTAL | Pass: $PASSED | Fail: $FAILED | Skip: $SKIPPED"
log "Status: $STATUS_FILE"
log "================================================================"

echo "========================================" >> "$STATUS_FILE"
echo "Completed at $(timestamp)" >> "$STATUS_FILE"
echo "TOTAL=$TOTAL PASS=$PASSED FAIL=$FAILED SKIP=$SKIPPED" >> "$STATUS_FILE"
