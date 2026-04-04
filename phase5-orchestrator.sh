#!/bin/bash
set -euo pipefail

PROJECT_DIR="/c/Users/sydne/Desktop/Coding APP/leaseiq"
PROMPTS_DIR="$PROJECT_DIR/.orchestrator/prompts-phase5"
LOGS_DIR="$PROJECT_DIR/.orchestrator/logs-phase5"
STATUS_FILE="$PROJECT_DIR/.orchestrator/status-phase5.log"
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
log "PROVELO PHASE 5 — PREMIUM FEATURES + ADMIN + PRICING"
log "5 Tasks | 50 min timeout each"
log "================================================================"
log ""
log "Writing prompt files..."


cat > "$PROMPTS_DIR/00-floating-pdf-fixes.md" << 'TASKEOF'
Read src/components/FloatingLeaseViewer.tsx and src/app/location/[id]/page.tsx.

## TASK: Fix Floating Lease PDF Viewer — Resize All Edges + Persist on Chat Tab

### FIX 1: RESIZE FROM ALL EDGES AND CORNERS

Currently the floating PDF viewer can only be resized from the bottom corners. Allow resizing from ALL edges and ALL corners — 8 resize handles total.

Implementation: detect which edge/corner the mouse is near and apply the appropriate resize behavior.

Add resize zones (invisible hit areas, 8px wide) on all edges:
- Top edge: cursor-ns-resize, dragging up increases height and moves Y up
- Bottom edge: cursor-ns-resize, dragging down increases height
- Left edge: cursor-ew-resize, dragging left increases width and moves X left
- Right edge: cursor-ew-resize, dragging right increases width
- Top-left corner: cursor-nwse-resize
- Top-right corner: cursor-nesw-resize
- Bottom-left corner: cursor-nesw-resize
- Bottom-right corner: cursor-nwse-resize

Each resize zone is a div positioned absolutely on the edge of the floating window. They should be invisible but have the correct cursor on hover.

During resize: enforce minimum size 300x300 and maximum size 90vw x 90vh. Prevent the window from going off screen.

### FIX 2: FLOATING VIEWER PERSISTS ON CHAT TAB

Currently the floating PDF viewer disappears when switching to the Chat tab. Fix this.

Root cause: the floating viewer state (open/closed) likely lives inside the location page component, and when the Chat tab renders, the viewer component may be conditionally excluded.

Fix: the FloatingLeaseViewer must render OUTSIDE of the tab content area. It should be at the top level of the location page, rendered regardless of which tab is active:

```tsx
return (
  <div>
    {/* Header, buttons, tabs */}
    
    {/* Tab content */}
    {activeTab === 'overview' && <OverviewContent />}
    {activeTab === 'chat' && <ChatContent />}
    {/* etc */}
    
    {/* Floating viewer - ALWAYS rendered when open, regardless of tab */}
    {floatingViewerOpen && pdfUrl && (
      <FloatingLeaseViewer pdfUrl={pdfUrl} documentName={docName} onClose={() => setFloatingViewerOpen(false)} />
    )}
  </div>
)
```

When switching to Chat tab specifically: the floating viewer should animate smoothly to the left side of the screen. Add a useEffect that watches the active tab:

```typescript
useEffect(() => {
  if (activeTab === 'chat' && floatingViewerOpen) {
    // Smoothly move to left side
    setViewerPosition(prev => ({
      ...prev,
      x: 16, // 16px from left edge
      transition: true // flag to enable CSS transition
    }))
  }
}, [activeTab, floatingViewerOpen])
```

In the FloatingLeaseViewer component, when transition flag is true, add: style={{ transition: 'left 0.3s ease, top 0.3s ease' }}. After the transition completes (300ms), remove the transition flag so dragging feels immediate again.

The user can still drag it elsewhere after it auto-slides to the left.

Run npx next build — fix any errors.
Then: git add . && git commit -m "Floating PDF: resize all edges, persist on chat tab" && git push

TASKEOF
log "  Created 00-floating-pdf-fixes.md"

cat > "$PROMPTS_DIR/01-document-validation.md" << 'TASKEOF'
Read src/app/api/upload/route.ts, src/lib/pdfProcessor.ts, src/components/FileUpload.tsx, src/components/BatchFileUpload.tsx, and any other upload-related files.

## TASK: Document Upload Validation — Block Unrelated PDFs, Prompt for Property-Related Non-Lease Docs

### THE RULES:

ALLOW (no warning): Base leases, amendments, exhibits, commencement letters, side letters, addendums, lease abstracts, estoppel certificates

ALLOW WITH CONFIRMATION: Property-related but not a lease document — shopping center handbooks, parking rules/guidelines, property manager communications, building rules and regulations, insurance certificates, CAM reconciliation statements, tenant improvement agreements, construction documents, zoning documents, environmental reports. Show prompt: "This document appears to be a [document type]. It will be stored for reference alongside your lease documents. Continue uploading?"

BLOCK COMPLETELY: Non-real-estate documents — personal documents, recipes, homework, images saved as PDF, financial statements unrelated to the property, random content with no connection to commercial real estate or property management.

### IMPLEMENTATION:

#### Step 1: Create classification API route — POST /api/documents/classify/route.ts

This route receives extracted text (first 1000 characters) and returns a classification:

```typescript
import { generateText } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'

// Send the first ~1000 chars to Claude for quick classification
const { text } = await generateText({
  model: anthropic('claude-haiku-4-5-20251001'),
  maxOutputTokens: 100,
  messages: [{
    role: 'user',
    content: `Classify this document. Read the text below and determine what type of document it is.

Return ONLY a JSON object with these fields:
- category: "lease" | "amendment" | "exhibit" | "commencement_letter" | "side_letter" | "cam_statement" | "property_related" | "unrelated"  
- description: brief 5-10 word description of what the document is
- confidence: "high" | "medium" | "low"

"property_related" means it relates to commercial real estate or property management but is not a lease document (handbooks, parking rules, building guidelines, insurance certs, tenant communications, etc.)

"unrelated" means it has nothing to do with commercial real estate, property, or leases.

TEXT:
${extractedText.slice(0, 1000)}`
  }]
})
```

#### Step 2: Integrate into the upload flow

In the upload API route (src/app/api/upload/route.ts):

1. After extracting text from the PDF, call the classification
2. Based on the result:
   - category is lease/amendment/exhibit/commencement_letter/side_letter: proceed normally, set document_type to the category
   - category is cam_statement or property_related: return a response with status "needs_confirmation" and the description
   - category is unrelated: return an error response with message "This document does not appear to be related to commercial real estate. Only lease documents, amendments, exhibits, property guidelines, and other real estate documents can be uploaded."

#### Step 3: Frontend confirmation flow

In the FileUpload and BatchFileUpload components:

1. After the initial upload API call, check the response
2. If response.needs_confirmation is true:
   - Show a modal/dialog: "This document appears to be a [description]. It will be stored for reference alongside your lease documents. Continue uploading?"
   - Two buttons: "Cancel" and "Upload Anyway"
   - If user clicks "Upload Anyway", re-call the upload API with a `force: true` flag that skips classification
3. If response.error about unrelated document:
   - Show an error message: "This document cannot be uploaded because it does not appear to be related to your property or lease. Only real estate documents are accepted."
   - Red error banner, dismiss button
4. If successful: proceed as normal

#### Step 4: Also validate on the frontend BEFORE upload

Quick client-side checks before even calling the API:
- File must be a PDF (check file.type === 'application/pdf' and extension is .pdf)
- File must be under 50MB
- File name should not contain path traversal characters

Show immediate error if these fail — dont waste an API call.

#### Step 5: Handle edge cases

If the AI classification fails (API error, timeout):
- Default to ALLOWING the upload with the document_type set to the user's selection
- Log the error for debugging
- Do not block uploads just because classification failed

If the document has very little extractable text (scanned PDF with no OCR):
- Allow it with a note: "Limited text could be extracted from this document. Some AI features may not work fully."
- Still classify based on whatever text was extracted

Run npx next build — fix any errors.
Then: git add . && git commit -m "Document upload validation: block unrelated, prompt property-related" && git push

TASKEOF
log "  Created 01-document-validation.md"

cat > "$PROMPTS_DIR/02-admin-dashboard.md" << 'TASKEOF'
Read the entire src/ directory before making any changes.

## TASK: Build Admin Analytics Dashboard — Business Owner Statistics

This is a PRIVATE dashboard only visible to the app owner (super_admin role). It shows business metrics for investor conversations and tracking how the product is performing.

### ACCESS CONTROL

This page is only accessible if the authenticated user has role = 'super_admin' in tenant_profiles.

Create a check:
```typescript
const { data: profile } = await supabase
  .from('tenant_profiles')
  .select('role')
  .eq('id', user.id)
  .maybeSingle()

if (profile?.role !== 'super_admin') {
  redirect('/dashboard')
}
```

Also hide the nav link unless user is super_admin.

To set yourself as super_admin, the user should run this SQL in Supabase:
```sql
UPDATE tenant_profiles SET role = 'super_admin' WHERE id = 'YOUR_USER_ID';
```

Include this SQL as a comment at the top of the page file for reference.

### CREATE: src/app/admin/page.tsx

### API ROUTE: GET /api/admin/stats/route.ts

This route queries across ALL tenants (using the admin Supabase client, not the user-scoped one). Only accessible to super_admin.

Return:
```typescript
{
  // User metrics
  total_users: number,
  users_this_week: number,
  users_this_month: number,
  users_by_day: Array<{ date: string, count: number }>, // last 30 days

  // Engagement metrics
  total_conversations: number,
  total_messages: number,
  messages_this_week: number,
  conversations_by_day: Array<{ date: string, count: number }>, // last 30 days

  // Document metrics
  total_documents: number,
  documents_this_week: number,
  total_chunks: number,

  // Feature usage
  total_risk_scores: number,
  total_cam_audits: number,
  total_stores: number,
  total_lease_summaries: number,

  // Active users (users who sent a message in last 7 days)
  active_users_7d: number,
  // Retained users (users who came back after first week)
  active_users_30d: number,

  // Top users by message count
  top_users: Array<{ email: string, message_count: number, store_count: number, last_active: string }>
}
```

Query examples:
```typescript
// Users by day (last 30 days)
const { data: usersByDay } = await adminSupabase
  .from('tenant_profiles')
  .select('created_at')
  .gte('created_at', thirtyDaysAgo.toISOString())

// Messages this week
const { count: messagesThisWeek } = await adminSupabase
  .from('messages')
  .select('*', { count: 'exact', head: true })
  .gte('created_at', sevenDaysAgo.toISOString())

// Active users (distinct tenant_ids who sent messages in last 7 days)
const { data: activeUsers } = await adminSupabase
  .from('conversations')
  .select('tenant_id')
  .gte('updated_at', sevenDaysAgo.toISOString())
```

### PAGE LAYOUT

**Header:** "Provelo Admin" — only visible to super_admin

**Stats Row (6 cards):**
- Total Users (number + sparkline trend)
- Active Users (7-day) 
- Total Messages
- Documents Uploaded
- Risk Scores Generated
- CAM Audits Run

Each card: bg-white/[0.03] border border-white/[0.06] rounded-xl p-6. Large number (text-3xl), label below (text-sm text-gray-400), percentage change vs prior period (green up arrow or red down arrow).

**Chart 1: User Signups Over Time (full width)**
- Recharts AreaChart
- X axis: last 30 days
- Y axis: new signups per day
- Emerald area fill
- Hover tooltip: date + count

**Chart 2: Daily Messages (full width)**
- Recharts BarChart
- X axis: last 30 days
- Y axis: messages sent per day
- Emerald bars

**Chart 3: Feature Usage Breakdown (half width)**
- Recharts PieChart or horizontal BarChart
- Segments: Chat Messages, Risk Scores, CAM Audits, Lease Summaries, Lease Comparisons
- Shows which features are most used

**Chart 4: User Retention (half width)**
- Simple metrics display:
  - "Day 1 retention: X%" (users who came back day after signup)
  - "Week 1 retention: X%" (users active in first week)
  - "Month 1 retention: X%" (users active in first month)
- Calculate from conversations.created_at vs tenant_profiles.created_at

**Table: Top Users (full width)**
- Columns: Email, Messages Sent, Locations, Documents, Last Active, Joined
- Sortable by any column
- Top 20 users by activity
- Clean table with hover rows

**Table: Recent Activity Feed (full width)**
- Last 50 actions across the platform
- Each row: timestamp, user email, action (sent message, uploaded document, ran risk score, etc.)
- Query from messages, documents, lease_risk_scores, cam_audits tables
- Ordered by most recent first

### NAVIGATION

- Add "Admin" link at the very bottom of the sidebar, only visible when user role is super_admin
- Style: text-gray-500, small, with a Shield icon
- Active: emerald highlight like other nav items

### STYLING

- Same dark theme as rest of app
- Charts use emerald color palette
- Responsive: charts stack on mobile
- All data refreshes on page load (no caching — admin wants real-time data)

Run npx next build — fix any errors.
Then: git add . && git commit -m "Admin analytics dashboard for business owner" && git push

TASKEOF
log "  Created 02-admin-dashboard.md"

cat > "$PROMPTS_DIR/03-pricing-page.md" << 'TASKEOF'
Read the entire src/ directory before making any changes.

## TASK: Build Premium Pricing Page — 14-Day Trial, Tiered Plans

Provelo is a premium product. No free tier. 14-day free trial with credit card required upfront. The pricing page must communicate high-end value, not bargain software.

### CREATE: src/app/pricing/page.tsx

This is a PUBLIC page (no auth required), using the same navbar as the landing page.

### PAGE STRUCTURE

**Header:**
- Title: "Simple, transparent pricing" — text-4xl font-bold text-white text-center
- Subtitle: "Start your 14-day free trial. No commitment, cancel anytime." — text-lg text-gray-400 text-center
- Below subtitle: "Credit card required to start trial" — text-sm text-gray-500

**Billing toggle:**
- Monthly / Annual toggle switch (centered)
- Annual shows discount: "Save 20%" badge next to Annual option
- Toggle: pill-shaped, bg-white/[0.06], active side bg-emerald-600
- Default: Annual selected

**Three pricing tiers in a row:**

TIER 1 — STARTER
- For: "For individual tenants"
- Locations: "1-3 locations"
- Price: show as placeholder — "$___/mo" with note "Pricing coming soon"
- Or if you want placeholder numbers: "$79/mo billed annually" (this positions it as premium)
- Features list:
  - AI lease chat with article citations
  - Lease summary extraction
  - Risk score with 20-clause analysis
  - Obligation matrix
  - Critical date alerts
  - CAM charge analysis
  - Document storage (up to 50 documents)
  - Email support
- CTA button: "Start 14-Day Trial" (secondary style)

TIER 2 — GROWTH (MOST POPULAR — highlighted)
- Badge: "Most Popular" emerald badge at top
- For: "For growing businesses"
- Locations: "4-15 locations"
- Price: "$___/mo" or placeholder "$149/mo billed annually"
- Everything in Starter, PLUS:
  - Portfolio analytics dashboard
  - Cross-location AI chat
  - CAM forensic audit (14 detection rules)
  - Lease comparison (amendment analysis)
  - Negotiation recommendations with suggested language
  - CAM dispute letter generation
  - Team collaboration (up to 5 members)
  - Priority support
  - Export to PDF/CSV
- CTA button: "Start 14-Day Trial" (PRIMARY style — emerald, larger)
- This card is slightly larger, has an emerald border, and is visually prominent

TIER 3 — SCALE
- For: "For multi-location operators"
- Locations: "16+ locations"
- Price: "Custom" or "Contact Us"
- Everything in Growth, PLUS:
  - Unlimited locations
  - Unlimited team members
  - Dedicated onboarding
  - Custom integrations
  - SLA guarantee
  - Dedicated account manager
  - API access (coming soon)
- CTA button: "Contact Sales" (secondary style, links to mailto or contact form)

**Card styling:**
- Each card: bg-white/[0.03] border border-white/[0.06] rounded-2xl p-8
- Growth card (highlighted): border-emerald-500/40 bg-emerald-500/[0.03] relative overflow-hidden, with a subtle emerald glow
- Feature list: checkmark icons (emerald) next to each feature, text-sm text-gray-300
- Price: text-5xl font-bold text-white for the number, text-lg text-gray-400 for "/mo"
- Annual price shows monthly equivalent, with strikethrough on monthly price

**Below the tiers:**

FAQ Section:
- "Frequently asked questions" heading
- Expandable accordion items:
  1. "What happens after my 14-day trial?" — "Your subscription begins automatically. You can cancel anytime during the trial and won't be charged."
  2. "Can I switch plans later?" — "Yes, you can upgrade or downgrade at any time. Changes take effect on your next billing cycle."
  3. "What payment methods do you accept?" — "We accept all major credit cards. Enterprise plans can pay by invoice."
  4. "Is my data secure?" — "Yes. All documents are encrypted at rest and in transit. We never share your data with third parties."
  5. "Do you offer refunds?" — "If you're not satisfied within the first 30 days of your paid subscription, we'll issue a full refund."
  6. "Can I import my existing leases?" — "Absolutely. Upload any PDF lease document and our AI will extract and analyze it in under 2 minutes."

Each FAQ item: click to expand/collapse, smooth animation, plus/minus icon.

**Final CTA:**
- "Ready to understand your lease?"
- "Start your 14-day trial today"
- Button: "Start 14-Day Trial" (large, emerald)
- Below: "No commitment. Cancel anytime."

### NAVIGATION

- Add "Pricing" link to the landing page navbar (between "For Tenants" and "Sign In")
- Add "Pricing" link to the About page navbar
- Link from the landing page "Start 14-Day Trial" buttons to /pricing or directly to /login?signup=true

### IMPORTANT NOTES

- Do NOT hardcode final prices if you use placeholder amounts — add a comment: // TODO: Update pricing before launch
- The page must feel PREMIUM — not cheap, not bargain. Think Stripe's pricing page aesthetic.
- Lots of whitespace, clean typography, high contrast
- Mobile responsive: cards stack vertically, Growth card stays highlighted

Run npx next build — fix any errors.
Then: git add . && git commit -m "Premium pricing page with 14-day trial tiers" && git push

TASKEOF
log "  Created 03-pricing-page.md"

cat > "$PROMPTS_DIR/04-final-integration.md" << 'TASKEOF'
Read the entire src/ directory.

## TASK: Final Integration Pass — Fix Conflicts, Verify All Features, Clean Build

This is the LAST task. Fix everything the previous tasks may have broken.

### STEP 1: BUILD CHECK
Run: npx next build
Fix ALL errors. Common issues: duplicate imports, conflicting props, missing files, type mismatches.

### STEP 2: VERIFY NAVIGATION
Ensure all these routes exist and render without errors:
- / (landing page)
- /login
- /about
- /pricing
- /dashboard
- /portfolio
- /location/[id] (with all tabs: Overview, Risk, Financial, Documents, Chat)
- /chat
- /settings
- /admin (super_admin only)
- /forgot-password
- /reset-password

Verify all links between pages work:
- Landing page navbar: Features, How It Works, For Tenants, Pricing, About, Sign In, Start 14-Day Trial
- Sidebar: Dashboard, Portfolio, each location, Settings, Admin (if super_admin)
- Sidebar logo: clicks to landing page
- All "Start 14-Day Trial" buttons link to /login or signup flow

### STEP 3: VERIFY KEY FEATURES
Trace code paths for:
1. FloatingLeaseViewer renders on location page, persists across tabs, slides left on Chat tab
2. Document upload validation calls /api/documents/classify
3. Admin dashboard only accessible to super_admin
4. Pricing page renders with three tiers
5. All "Start Free" text has been replaced with "Start 14-Day Trial"
6. Signup form has confirm password field and duplicate email error handling
7. Command palette opens with Ctrl+K
8. Notification bell exists in header
9. ScrollToTop button appears on scroll

### STEP 4: CONSISTENCY CHECK
- All cards use bg-white/[0.03] border border-white/[0.06] rounded-xl
- All primary buttons use bg-emerald-600 hover:bg-emerald-500 (no gradients)
- No remaining gradient buttons anywhere
- Tab bar uses underline style (no dark band background)
- All text is readable (minimum 14px for body content)
- Sidebar has expand/collapse toggle

### STEP 5: DEAD CODE REMOVAL
- Remove any unused imports
- Remove commented-out code blocks
- Remove the pm-dashboard directory if it still exists
- Remove any files that are not imported anywhere

### STEP 6: TYPE SAFETY
Run: npx tsc --noEmit
Fix ALL TypeScript errors.

### STEP 7: FINAL BUILD
Run: npx next build — MUST pass with ZERO errors.
Then: git add . && git commit -m "Phase 5 complete: all features verified, production ready" && git push

TASKEOF
log "  Created 04-final-integration.md"

log ""
log "All 5 prompt files created"
log ""
log "================================================================"
log "EXECUTING TASKS..."
log "================================================================"

echo "Phase 5 started at $(timestamp)" > "$STATUS_FILE"
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
  log "TASK $TOTAL/5: $task_name"

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
log "PHASE 5 COMPLETE"
log "================================================================"
log "Total: $TOTAL | Pass: $PASSED | Fail: $FAILED | Skip: $SKIPPED"
log "Status: $STATUS_FILE"
log "================================================================"

echo "========================================" >> "$STATUS_FILE"
echo "Completed at $(timestamp)" >> "$STATUS_FILE"
echo "TOTAL=$TOTAL PASS=$PASSED FAIL=$FAILED SKIP=$SKIPPED" >> "$STATUS_FILE"
