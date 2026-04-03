#!/bin/bash
# ============================================================================
# Provelo V2 Setup + Run
# This script creates all 18 task prompts then runs the orchestrator.
# Run from: cd "/c/Users/sydne/Desktop/Coding APP/leaseiq"
# ============================================================================

set -euo pipefail
PROJECT_DIR="/c/Users/sydne/Desktop/Coding APP/leaseiq"
PROMPTS_DIR="$PROJECT_DIR/.orchestrator/prompts-v2"
LOGS_DIR="$PROJECT_DIR/.orchestrator/logs-v2"

cd "$PROJECT_DIR"
unset ANTHROPIC_API_KEY 2>/dev/null || true
mkdir -p "$PROMPTS_DIR" "$LOGS_DIR"

echo "Creating 18 task prompts..."

#=== TASK 00 ===
cat > "$PROMPTS_DIR/00-rebrand-hydration.md" << 'TASKEOF'
Read the entire src/ directory, package.json, and CLAUDE.md before making any changes.

## TASK: Complete rebrand to Provelo + Fix hydration errors

### PART 1: REBRAND TO PROVELO
Search EVERY file in the entire project. Replace ALL instances:
- "ClauseIQ" -> "Provelo"
- "clauseiq" -> "provelo"
- "CLAUSEIQ" -> "PROVELO"
- "LeaseIQ" -> "Provelo"
- "leaseiq" -> "provelo" (except in file paths and git URLs)
- "LEASEIQ" -> "PROVELO"
- "Clause IQ" -> "Provelo"
- "Lease IQ" -> "Provelo"

Check specifically: src/app/page.tsx, src/app/layout.tsx, src/components/, package.json (name field), CLAUDE.md, src/lib/prompts.ts, src/app/api/, any CSS/config files.

Logo initials: Change to "PV" wherever the logo shows initials.
Tagline: Keep "Commercial Lease Intelligence".
Color scheme: Keep existing dark theme with emerald accents.

### PART 2: FIX HYDRATION ERRORS
The mdP component (custom paragraph renderer for react-markdown) renders a <p> tag. Inside it, ArticleRef renders tooltip/popup elements containing <div> and <p> tags. HTML spec forbids block elements inside <p>.

Fix:
1. Find the mdP function in chat message rendering code.
2. Change mdP from <p> to <div> with identical className.
3. Inside ArticleRef tooltip popup, change any <p> tags to <span>.
4. Verify no other markdown components have nesting issues.

### VERIFICATION
Run: grep -ri "clauseiq\|leaseiq" src/ --include="*.tsx" --include="*.ts" --include="*.md" | grep -v node_modules | grep -v ".next"
Should return ZERO results except git URLs.
Run npx next build to verify. Fix any errors.
TASKEOF

#=== TASK 01 ===
cat > "$PROMPTS_DIR/01-critical-dates-colors.md" << 'TASKEOF'
Read the entire src/ directory before making any changes.

## TASK: Fix critical dates color logic and rent escalation text brightness

### FIX 1: CRITICAL DATES COLOR CODING
Current logic shows lease expirations 19.5 years out as GREY instead of GREEN. Fix:
- RED: 0-30 days away (urgent)
- YELLOW/AMBER: 31-90 days away (upcoming)
- GREEN: More than 90 days away AND lease is active (healthy)
- GREY: Date is in the past (expired/completed)

Apply to ALL critical dates: lease expiration, renewal deadlines, CAM objection windows, insurance renewals, rent escalation dates, option exercise dates.

### FIX 2: RENT ESCALATION TIMELINE TEXT BRIGHTNESS
The rent escalation timeline text is too dim/grey. Fix:
- Change text from grey/muted to white or near-white (text-white/90 or text-gray-200)
- All labels, amounts, dates, period descriptions must be clearly readable
- Current period highlighted with emerald accent
- Future periods clearly visible (not dimmed)
- Past periods slightly muted but still readable

### FIX 3: LEASE EXPIRATION DISPLAY
Ensure location detail page shows expiration date, time remaining, and GREEN color badge for far-future active leases.

Run npx next build to verify. Fix any errors.
TASKEOF

#=== TASK 02 ===
cat > "$PROMPTS_DIR/02-pdf-panel-overhaul.md" << 'TASKEOF'
Read the entire src/ directory before making any changes.

## TASK: Fix PDF side panel — resizable, toggle views, reset on close

### FIX 1: TOGGLE BETWEEN EXTRACTED TEXT AND PDF
When clicking an article reference, the right panel shows both extracted text AND PDF overlapping. Add a TOGGLE:
- Two tab buttons at top: "Extracted Text" | "Original PDF"
- Default to "Extracted Text" view
- Only show ONE view at a time
- Active tab has emerald underline/highlight
- Tab buttons min 44px height for accessibility
- Text in extracted view min 16px font size

### FIX 2: RESIZABLE PANEL
Add a drag handle on LEFT edge of panel (6px wide, subtle grip dots):
- Drag LEFT = panel wider, Drag RIGHT = narrower
- Min width: 300px, Max: 70vw, Default: 40vw
- Cursor: col-resize on hover
- Add "Full Screen" button in header (90vw)
- Add "Reset" button in header (back to 40vw)
- Use onMouseDown/onMouseMove/onMouseUp pattern
- Chat area uses flex-1 to auto-adjust

### FIX 3: RESET ON CLOSE/REOPEN
When panel closes (X button) and reopens, return to DEFAULT size (40vw), not last dragged size.

### FIX 4: MOBILE
Under 768px: panel is full screen (100% width) with close button, no drag handle.

### READABILITY (45+ users)
All text: min 16px. Line height: 1.7 min. Touch targets: min 44px.

Run npx next build to verify. Fix any errors.
TASKEOF

#=== TASK 03 ===
cat > "$PROMPTS_DIR/03-buttons-chat-history.md" << 'TASKEOF'
Read the entire src/ directory before making any changes.

## TASK: Move action buttons to top + implement in-app chat history saving

### PART 1: MOVE BUTTONS TO TOP
On location detail page, "Ask Your Lease" and "Upload Documents" buttons are buried too far down.
Move BOTH to the very TOP, directly below the location header:
- "Ask Your Lease" = PRIMARY (emerald gradient, white text, chat icon)
- "Upload Documents" = SECONDARY (outlined, border-emerald, emerald text, upload icon)
- Desktop: side by side, ~200-250px each
- Mobile: stack vertically, full width
- Below buttons: lease summary, obligation matrix, critical dates, documents

### PART 2: IN-APP CHAT HISTORY
Implement persistent chat history using existing conversations and messages tables:

DATABASE:
- On chat start, create conversation: id, tenant_id, store_id, title (from first message), created_at, updated_at
- Save EVERY message: id, conversation_id, role, content, citations (jsonb), created_at
- Auto-generate title from first user message (first 50 chars)

SIDEBAR (LEFT side of chat):
- List of past conversations for CURRENT store only
- Each shows: title, date, message count
- Click to load past conversation
- "New Chat" button at top
- Mobile: hidden by default, toggle via history icon

SAVING:
- Auto-save after each assistant response
- Persists across navigation
- Scoped to specific store/location
- RLS: tenants see only their own conversations

Run npx next build to verify. Fix any errors.
TASKEOF

#=== TASK 04 ===
cat > "$PROMPTS_DIR/04-auth-system.md" << 'TASKEOF'
Read the entire src/ directory before making any changes.

## TASK: Email verification, password reset, and auth improvements

### PART 1: EMAIL VERIFICATION
After signup, redirect to "Check your email" page (src/app/verify-email/page.tsx).
Include "Resend verification email" button.
Add callback route: src/app/auth/callback/route.ts to handle verification redirect.
Exchange code for session, redirect to /dashboard on success.

### PART 2: PASSWORD RESET
Add "Forgot Password?" link on login page.
Create /forgot-password page: email input, calls supabase.auth.resetPasswordForEmail().
Show generic message: "If an account exists, we've sent a reset link."
Create /reset-password page: new password + confirm fields, strength meter.
On submit: supabase.auth.updateUser({ password }).
Redirect to /dashboard on success.

### PART 3: CHANGE PASSWORD IN SETTINGS
Add "Change Password" section in settings:
- Current Password field (for UX trust)
- New Password + Confirm fields
- Min 8 chars, strength meter
- Success/error toast

### PART 4: GOOGLE OAUTH
Add "Continue with Google" button on login/signup:
supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: origin + '/auth/callback' } })

### SECURITY (NIST SP 800-63B):
- Min 8 chars, no forced complexity rules
- No periodic forced resets
- Generic error messages to prevent user enumeration
- Rate limiting handled by Supabase built-in

Run npx next build to verify. Fix any errors.
TASKEOF

#=== TASK 05 ===
cat > "$PROMPTS_DIR/05-risk-scoring.md" << 'TASKEOF'
Read the entire src/ directory before making any changes.

## TASK: Build Lease Risk Scoring System (like Leasecake LIFT)

### API ROUTE: /api/risk-score/route.ts
Accept store_id. Retrieve chunks. Send to Claude for risk analysis.

Score these clause categories (Red/Yellow/Green each):

EXPANSION BLOCKERS: Exclusivity, Radius restriction, Use restriction, Co-tenancy, Relocation clause, Assignment/subletting

FINANCIAL EXPOSURE: Rent escalation severity, CAM pass-through scope, Percentage rent trigger, CAM cap existence, Operating hours, Insurance requirements, Late fee/default

TENANT PROTECTIONS (score by ABSENCE): Renewal option, Termination right, SNDA, CAM audit right, Exclusive use, Go-dark right, Force majeure

Claude returns per clause: severity, summary, citation, recommendation.
Calculate overall RISK SCORE 0-100 (100=excellent, 0=risky).

### DATABASE: lease_risk_scores
id, store_id, tenant_id, overall_score (int), clause_scores (jsonb), analyzed_at. RLS for tenant isolation.

### UI: Risk Score Card on location detail page
- Large circular score (0-100), color: 80-100 green, 50-79 yellow, 0-49 red
- Clause list grouped by severity (red first)
- Each expandable for details
- "Re-analyze" button
- "How to improve" section with top 3 recommendations
- Style: dark theme, emerald accents, frosted glass cards

Run npx next build to verify. Fix any errors.
TASKEOF

#=== TASK 06 ===
cat > "$PROMPTS_DIR/06-cam-forensic-audit.md" << 'TASKEOF'
Read the entire src/ directory before making any changes.

## TASK: Build CAM Forensic Audit System (14 detection rules like CAMAudit.io)

### HOW IT WORKS:
1. Tenant uploads annual CAM reconciliation statement (PDF)
2. Extract text from statement
3. Cross-reference against lease CAM provisions
4. Run 14 detection rules
5. Display findings with severity and estimated overcharge

### API ROUTE: /api/cam-audit/route.ts
Accept store_id + uploaded CAM statement PDF.

14 DETECTION RULES:
Math-Based: (1) Management fee overcharge (2) Pro-rata share error (3) Gross-up violation (4) CAM cap violation (5) Base year error (6) Controllable expense cap overcharge (7) Estimated payment true-up error

Classification (AI): (8) Gross lease charges (9) Excluded service charges (10) Insurance overcharge (11) Tax overallocation (12) Utility overcharge (13) Common area misclassification (14) Landlord overhead pass-through

Claude returns per rule: rule_name, status (violation_found/within_limits/insufficient_data), estimated_overcharge (dollars), explanation, lease_reference, statement_reference.

### DATABASE: cam_audits
id, store_id, tenant_id, statement_file_name, total_potential_overcharge, findings (jsonb), audit_date, dispute_deadline. RLS.

### UI: CAM Audit section on location detail page
- Upload area for CAM statement
- "Run Forensic Audit" button
- Results: total overcharge (large, red if > $0), findings list by severity
- "Generate Dispute Letter" button: Claude drafts professional letter citing lease provisions
- If no audit run: educational content about 40% error rate
- Dispute letter downloadable as PDF

Run npx next build to verify. Fix any errors.
TASKEOF

#=== TASK 07 ===
cat > "$PROMPTS_DIR/07-lease-comparison.md" << 'TASKEOF'
Read the entire src/ directory before making any changes.

## TASK: Build AI Lease Comparison (Side-by-Side Amendment Analysis)

### API ROUTE: /api/lease-compare/route.ts
Accept store_id, document_id_1, document_id_2. Retrieve chunks for both. Send to Claude for comparison.

Claude identifies per clause: clause_name, change_type (modified/added/deleted/unchanged), original_text summary, amended_text summary, impact (favorable/unfavorable/neutral), explanation.

### DATABASE: lease_comparisons
id, store_id, tenant_id, doc_id_1, doc_id_2, comparison_results (jsonb), created_at. RLS.

### UI: "Compare Documents" button on location detail page
- Two document dropdowns + "Compare" button
- Side-by-side results: Document A left, Document B right
- Green=favorable, Red=unfavorable, Yellow=neutral, Grey=unchanged (collapsed)
- Summary at top: "X modified, Y added, Z deleted. Overall: [impact]"
- Mobile: stacked view instead of side-by-side

Run npx next build to verify. Fix any errors.
TASKEOF

#=== TASK 08 ===
cat > "$PROMPTS_DIR/08-portfolio-analytics.md" << 'TASKEOF'
Read the entire src/ directory before making any changes.

## TASK: Build Portfolio Analytics Dashboard

### PAGE: /dashboard/portfolio
Only show if tenant has 2+ locations. Add "Portfolio" to sidebar nav.

### SUMMARY CARDS (top row):
Total Monthly Rent, Total Annual Occupancy Cost, Average Risk Score, Upcoming Critical Dates (next 90 days), Total Locations

### CHARTS (use Recharts — install if needed: npm install recharts):
1. Rent by Location (horizontal bar, sorted highest to lowest)
2. Lease Expiration Timeline (gantt showing when each expires, color by urgency)
3. Occupancy Cost Breakdown (stacked bar: rent vs CAM vs insurance vs taxes per location)
4. Risk Score Distribution (bar chart per location, red/yellow/green zones)

### PORTFOLIO AI Q&A
Chat input at top: "Ask about your portfolio..."
Searches ALL locations' chunks. Include store name in context so Claude references specific locations.
Example: "What's my total exposure in Georgia?", "Which locations have highest CAM?"

### API: /api/portfolio/route.ts
Queries lease_summaries, cam_analysis, lease_risk_scores, critical_dates across all tenant's stores. Returns aggregated data.

Run npx next build to verify. Fix any errors.
TASKEOF

#=== TASK 09 ===
cat > "$PROMPTS_DIR/09-cmd-k-notifications.md" << 'TASKEOF'
Read the entire src/ directory before making any changes.

## TASK: Command Palette (Cmd+K) and Notification Center

### COMMAND PALETTE (Cmd+K / Ctrl+K)
Create src/components/CommandPalette.tsx. Keyboard listener in root layout.

Modal: centered, dark bg-gray-900/95, backdrop-blur-xl, 600px wide.
Search input at top (autofocused, 18px). Results list with keyboard nav (arrows + Enter + Escape).

Commands: "Go to Dashboard/Portfolio/Settings/[Store Name]", "Upload Document", "New Chat", "Export Lease Summary", "Run CAM Audit", "Analyze Risk Score"

### NOTIFICATION CENTER
Bell icon in top-right header with unread count badge.
Dropdown panel with notifications:
- Critical date approaching (30/90 days)
- Analysis complete (risk score, CAM audit)
- Team member joined

Database: notifications table (id, tenant_id, store_id, type, title, message, link, read boolean, created_at). RLS.
Auto-generate on: critical dates within 30/90 days, analysis completion, team updates.
Each notification clickable to navigate to context.

### KEYBOARD SHORTCUTS
Cmd+K=palette, Cmd+N=new chat, Cmd+U=upload, Escape=close modals.

Run npx next build to verify. Fix any errors.
TASKEOF

#=== TASK 10 ===
cat > "$PROMPTS_DIR/10-onboarding.md" << 'TASKEOF'
Read the entire src/ directory before making any changes.

## TASK: Progressive Onboarding Flow

### ONBOARDING CHECKLIST
After first signup, show checklist card on dashboard:
1. "Add your first location"
2. "Upload your lease"
3. "Ask your first question"
4. "Review your lease summary"
5. "Check your risk score"

Progress bar: "3 of 5 complete". Auto-checks when completed. Celebration on completion. Dismissible.
Store in tenant_profiles (add onboarding_completed boolean, onboarding_progress jsonb).

### EMPTY STATES
- Dashboard no locations: "Welcome! Add your first location." + button
- Location no documents: "Upload your lease to unlock AI intelligence." + button
- Chat no conversations: suggested questions
- Portfolio < 2 locations: "Add more locations for portfolio insights."

### WELCOME TOUR (3-4 tooltips on first login)
Point to: sidebar nav, chat button, upload area, notification bell.
"Next" button + step counter. Store in localStorage.

Run npx next build to verify. Fix any errors.
TASKEOF

#=== TASK 11 ===
cat > "$PROMPTS_DIR/11-tenant-only.md" << 'TASKEOF'
Read the entire src/ directory before making any changes.

## TASK: Remove PM features — Provelo is TENANT-ONLY

### REMOVE:
- PM Admin Dashboard (any /pm-dashboard pages, nav links, API routes)
- PM role in onboarding (remove "property manager" option)
- Bulk lease upload for PMs
- Tenant invitation by PM
- Multi-tenant management from PM perspective
- PM-specific analytics (tenant adoption rates, etc.)

### KEEP:
- Team management (tenant's own team — coworkers, managers, lawyers)
- Multi-location support (tenant's portfolio)
- Role-based access within team (Admin/Member/Viewer)

### LANGUAGE AUDIT:
Replace "Property Manager" with "Team Admin" where it refers to internal roles.
Remove all language implying Provelo serves landlords.
Tone: "Provelo helps YOU understand YOUR lease."

### AI PROMPT AUDIT:
Check src/lib/prompts.ts. Ensure AI helps TENANTS, stays neutral, never takes landlord's side, suggests consulting attorney when ambiguous.

Run npx next build to verify. Fix any errors.
TASKEOF

#=== TASK 12 ===
cat > "$PROMPTS_DIR/12-ux-polish.md" << 'TASKEOF'
Read the entire src/ directory before making any changes.

## TASK: Modern SaaS UX Polish

### DESIGN CONSISTENCY (apply globally):
Typography: Plus Jakarta Sans/Inter. Headings=font-semibold text-white. Body=text-gray-300 (NOT gray-500/600). Muted=text-gray-400 minimum.
Background: dark (#0f1117 or gradient). Cards: bg-white/5 backdrop-blur-sm border-white/10 rounded-xl p-6.
Primary: emerald-500. Buttons: primary=bg-emerald-500 text-white, secondary=border-emerald outlined, ghost=transparent.
Spacing: p-6 cards, gap-4/gap-6 between sections, px-4 md:px-8 page padding.
All buttons: min-h-[40px], transition-all duration-200.
Nav: collapsible left sidebar (not top bar). Active=bg-white/10 text-white emerald left border.

### AUDIT EVERY PAGE:
Landing, login/signup, dashboard, location detail, chat, settings, portfolio. Fix: broken layouts, dim text, inconsistent cards, missing loading states, missing error states.

### LOADING STATES for every async: skeleton loaders, chat typing dots, upload progress bar.
### ERROR STATES: helpful messages, never raw errors/stack traces.

Run npx next build to verify. Fix any errors.
TASKEOF

#=== TASK 13 ===
cat > "$PROMPTS_DIR/13-landing-page.md" << 'TASKEOF'
Read the entire src/ directory before making any changes.

## TASK: Overhaul Landing Page for conversion

### HERO: "Know your lease. Protect your business."
Subheadline: "Upload your commercial lease and get instant AI-powered answers. Built exclusively for tenants."
Primary CTA: "Start Free Trial" (emerald). Secondary: "See How It Works"

### SOCIAL PROOF: "Built by property management professionals"

### FEATURES (4 blocks with icons):
1. "Ask anything in plain language" — cited answers from actual lease
2. "Know your risk score" — AI analyzes 20+ clauses, scores 0-100
3. "Catch CAM overcharges" — forensic audit with 14 detection rules, 15-20% recovery
4. "Track every deadline" — color-coded alerts for all critical dates

### PRICING (placeholder):
Starter $49/mo (3 leases), Professional $149/mo (15 leases, "Most Popular"), Business $349/mo (50 leases), Enterprise (Contact us).

### FOOTER: Product, Pricing, About, Contact, Privacy, Terms. "Built for tenants. Never for landlords." Copyright 2026 Provelo.
Dark theme, fast loading, mobile responsive.

Run npx next build to verify. Fix any errors.
TASKEOF

#=== TASK 14 ===
cat > "$PROMPTS_DIR/14-mobile-responsive.md" << 'TASKEOF'
Read the entire src/ directory before making any changes.

## TASK: Complete Mobile Responsive Overhaul (375px)

Fix EVERY page at 375px:
- Landing: hero wraps, CTAs full width, features/pricing stack
- Login/Signup: form centered, inputs full width
- Dashboard: sidebar=hamburger menu, cards stack, search full width, stats 2x2
- Location detail: buttons stack full width, tabs horizontal scroll
- Chat: sidebar hidden (toggle icon), messages max-w-[90%], input fixed bottom with safe area, PDF panel=full screen overlay
- Settings: fields full width, sections stack
- Portfolio: charts resize, stats 2-column, tables horizontal scroll

### GLOBAL:
Min touch target: 44x44px. Body text min 16px. Input font 16px (prevents iOS zoom).
Viewport meta: width=device-width, initial-scale=1, maximum-scale=1.
No horizontal overflow. Bottom safe area padding.

### HAMBURGER MENU:
Three-line icon top-left on mobile. Full-height sidebar overlay (bg-black/50, slides from left). Close on X/tap outside.

Run npx next build to verify. Fix any errors.
TASKEOF

#=== TASK 15 ===
cat > "$PROMPTS_DIR/15-exports-docs.md" << 'TASKEOF'
Read the entire src/ directory before making any changes.

## TASK: Improve exports and document management

### PDF EXPORTS (use jspdf or @react-pdf/renderer):
1. Lease Summary PDF — all extracted terms, Provelo branding header
2. Chat History PDF — messages formatted, citations included
3. Obligation Matrix PDF — two-column tenant/landlord with article refs
4. Risk Score Report PDF — score, all clause scores with colors, recommendations
5. CAM Audit Report PDF — findings, overcharges, actions (shareable with attorney)

### DOCUMENT MANAGEMENT on location detail:
- List: name, type, upload date, file size
- Preview button (PDF viewer)
- Download button (original file)
- Delete button with confirmation ("Are you sure? This removes document and all analysis.")
- Delete cascades: document -> chunks -> re-generate summary if needed

### CSV EXPORT on portfolio page:
"Export Data (CSV)" — all locations: name, address, lease dates, rent, CAM, risk score, critical dates. One row per location.

Run npx next build to verify. Fix any errors.
TASKEOF

#=== TASK 16 ===
cat > "$PROMPTS_DIR/16-frontend-audit.md" << 'TASKEOF'
Read the entire src/ directory before making any changes.

## TASK: Comprehensive Frontend Audit

### PAGE-BY-PAGE: Verify each loads without errors, data displays, buttons work, loading states, error states, dark theme consistent, navigation works, text readable.
Pages: /, /login, /signup, /forgot-password, /reset-password, /verify-email, /dashboard, /dashboard/portfolio, /dashboard/[storeId], /dashboard/[storeId]/chat, /settings, /auth/callback

### COMPONENTS: No TypeScript errors, no missing key props, no memory leaks, proper error boundaries, accessible (aria-labels, alt text), no console.log in production.

### VISUAL: All cards same style, buttons consistent, text hierarchy correct, spacing consistent, Provelo logo "PV" correct.

### FUNCTIONALITY: Upload->process->chat works, citations clickable->panel opens, sidebar links work, auth flows work, search/filter on dashboard works, settings save.

FIX ALL ISSUES FOUND. Run npx next build AND npx tsc --noEmit. Fix all errors.
TASKEOF

#=== TASK 17 ===
cat > "$PROMPTS_DIR/17-backend-security-audit.md" << 'TASKEOF'
Read the entire src/ directory before making any changes.

## TASK: Backend + Security Audit — Production Ready

### API ROUTES (every file in src/app/api/):
1. Auth check: supabase.auth.getUser() at top. 401 if missing.
2. Authorization: always derive tenant_id from session, never trust request body.
3. Store isolation: verify store belongs to authenticated tenant.
4. Input validation: UUID format on IDs, file type (PDF/DOCX only), file size (max 20MB), string lengths.
5. Error handling: try/catch, specific messages, generic for unknown, never expose stack traces. Proper HTTP codes (400/401/403/404/500).

### DATABASE:
RLS enabled on ALL tables: tenant_profiles, documents, document_chunks, stores, conversations, messages, lease_summaries, obligation_matrices, cam_analysis, percentage_rent_entries, critical_dates, team_invitations, notifications, lease_risk_scores, cam_audits, lease_comparisons, and any others.
Each policy: tenant sees/modifies only own data (tenant_id = auth.uid()).

### CROSS-TENANT LEAK PREVENTION:
- Chat NEVER returns other tenant's chunks
- store_id filter ALWAYS applied, NEVER falls back to tenant-wide search
- Vector search (match_documents) includes store_id filter
- Keyword search includes store_id filter
- Portfolio queries only return authenticated tenant's stores

### API KEY SECURITY:
- .env.local in .gitignore
- NO API keys in frontend code
- Anthropic key only in server-side routes
- Service role key only in server-side code

### CODE QUALITY:
Remove ALL console.log/warn/error from client code.
Remove TODO/FIXME comments that are resolved.
Remove commented-out code blocks.
Remove unused imports/variables.

### PERFORMANCE:
No N+1 queries. Indexes on tenant_id, store_id, document_id. LIMIT clauses on large fetches.

Run npx tsc --noEmit. Fix ALL TypeScript errors.
Run npx next build. Must complete with ZERO errors.
Then: git add . && git commit -m "Production-ready: full audit complete" && git push
TASKEOF

echo "All 18 prompts created in $PROMPTS_DIR"
echo ""
echo "Starting orchestrator..."
echo ""

# === ORCHESTRATOR ===
STATUS_FILE="$PROJECT_DIR/.orchestrator/status-v2.log"
TIMEOUT_SECONDS=2700
MAX_TURNS=75

echo "Build started at $(date '+%Y-%m-%d %H:%M:%S')" > "$STATUS_FILE"
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

  echo ""
  echo "[$(date '+%H:%M:%S')] TASK $TOTAL: $task_name"

  set +e
  timeout $TIMEOUT_SECONDS claude -p --dangerously-skip-permissions --max-turns $MAX_TURNS < "$prompt_file" > "$log_file" 2>&1
  exit_code=$?
  set -e

  if [ $exit_code -eq 124 ]; then
    echo "[$(date '+%H:%M:%S')] SKIP $task_name (TIMEOUT)"
    echo "[$task_name] TIMEOUT" >> "$STATUS_FILE"
    SKIPPED=$((SKIPPED + 1))
    git add -A 2>/dev/null || true
    git commit -m "TIMEOUT: $task_name" --allow-empty 2>/dev/null || true
    git push 2>/dev/null || true
    continue
  fi

  echo "[$(date '+%H:%M:%S')] Building..."
  set +e
  npx next build > "$LOGS_DIR/${task_name}-build.log" 2>&1
  build_exit=$?
  set -e

  if [ $build_exit -eq 0 ]; then
    echo "[$(date '+%H:%M:%S')] PASS $task_name"
    echo "[$task_name] PASS" >> "$STATUS_FILE"
    PASSED=$((PASSED + 1))
    git add -A
    git commit -m "PASS: $task_name" 2>/dev/null || true
    git push 2>/dev/null || true
  else
    echo "[$(date '+%H:%M:%S')] FAIL $task_name - fixing..."
    FAILED=$((FAILED + 1))

    set +e
    echo "Fix ALL build errors. Only fix errors, no new features.
Errors:
$(tail -80 "$LOGS_DIR/${task_name}-build.log")" | \
      timeout 600 claude -p --dangerously-skip-permissions --max-turns 20 > "$LOGS_DIR/${task_name}-fix.log" 2>&1
    npx next build > "$LOGS_DIR/${task_name}-rebuild.log" 2>&1
    rebuild_exit=$?
    set -e

    if [ $rebuild_exit -eq 0 ]; then
      echo "[$(date '+%H:%M:%S')] PASS $task_name (fixed)"
      echo "[$task_name] PASS (fixed)" >> "$STATUS_FILE"
      FAILED=$((FAILED - 1))
      PASSED=$((PASSED + 1))
    fi

    git add -A
    git commit -m "FAIL-FIX: $task_name" 2>/dev/null || true
    git push 2>/dev/null || true
  fi
done

echo ""
echo "================================================================"
echo "COMPLETE: $TOTAL tasks | PASS=$PASSED | FAIL=$FAILED | SKIP=$SKIPPED"
echo "================================================================"

echo "========================================" >> "$STATUS_FILE"
echo "Completed at $(date '+%Y-%m-%d %H:%M:%S')" >> "$STATUS_FILE"
echo "TOTAL=$TOTAL PASS=$PASSED FAIL=$FAILED SKIP=$SKIPPED" >> "$STATUS_FILE"
