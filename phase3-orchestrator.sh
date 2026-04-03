#!/bin/bash
set -euo pipefail

PROJECT_DIR="/c/Users/sydne/Desktop/Coding APP/leaseiq"
PROMPTS_DIR="$PROJECT_DIR/.orchestrator/prompts-phase3"
LOGS_DIR="$PROJECT_DIR/.orchestrator/logs-phase3"
STATUS_FILE="$PROJECT_DIR/.orchestrator/status-phase3.log"
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
log "PROVELO PHASE 3 — COMPETITIVE OVERHAUL"
log "12 Tasks | 50 min timeout each | 80 max turns"
log "================================================================"
log ""
log "Writing prompt files..."


cat > "$PROMPTS_DIR/00-portfolio-analytics.md" << 'TASKEOF'
Read the entire src/ directory before making any changes. This is a BRAND NEW page that does not exist yet.

## TASK: Build Portfolio Analytics Dashboard — Cross-Location Intelligence

Occupier has a "Horizon Planning" analytics dashboard. LeaseCake has portfolio rollups with heatmaps. Provelo currently has NOTHING for portfolio-level views. This is the single biggest missing feature.

---

### CREATE: src/app/portfolio/page.tsx

This is a new page. Create the entire thing from scratch.

**Data source — create API route: GET /api/portfolio/route.ts**

1. Get the authenticated tenant's ID from session
2. Query ALL stores for this tenant from the stores table
3. For each store, fetch:
   - lease_summaries (summary_data JSONB)
   - lease_risk_scores (overall_score, clause_scores)
   - critical_dates (all upcoming dates)
   - cam_analysis (analysis_data)
   - documents count
4. Return aggregated data:

```typescript
interface PortfolioData {
  total_locations: number
  locations: Array<{
    id: string
    store_name: string
    shopping_center_name: string | null
    address: string | null
    risk_score: number | null
    lease_expiry: string | null
    years_remaining: number | null
    monthly_rent: number | null
    annual_rent: number | null
    square_footage: number | null
    rent_per_sf: number | null
    document_count: number
    top_risk: string | null
  }>
  upcoming_critical_dates: Array<{
    date_type: string
    date_value: string
    description: string
    store_name: string
    store_id: string
  }>
  average_risk_score: number | null
  total_annual_rent: number | null
  total_square_footage: number | null
}
```

5. Cache results for 5 minutes using a simple timestamp check

---

### PAGE LAYOUT

**Header section:**
- Title: "Portfolio Overview" with subtitle showing total locations count
- "Add Location" button (top right)
- Date range filter (optional — for critical dates)

**Stats bar (4 cards in a row):**
- Total Locations (number + building icon)
- Average Risk Score (circular mini-gauge, colored green/yellow/red)
- Total Annual Rent (formatted as currency)
- Upcoming Critical Dates count (with urgency coloring)

**Chart 1: Lease Expiration Timeline (full width)**
- Use Recharts BarChart
- X axis: each location name
- Y axis: years remaining on lease
- Bar color: green if >5 years, yellow if 2-5, red if <2
- Hover tooltip: store name, exact expiry date, years remaining
- If a lease is expired: red bar extending below zero line, or a "EXPIRED" label

**Chart 2: Risk Score Comparison (full width)**
- Use Recharts BarChart
- One bar per location, height = risk score (0-100)
- Bar fill color: green (80-100), yellow (50-79), red (0-49)
- Horizontal reference lines at score 50 and 80
- Hover tooltip: store name, score, top risk clause

**Chart 3: Rent Comparison (half width, left)**
- Use Recharts BarChart (horizontal)
- Bars showing annual rent per location
- Sorted highest to lowest
- Emerald gradient bars

**Chart 4: Risk Heatmap Table (half width, right)**
- HTML table, not a chart
- Rows: each location
- Columns: key clause categories (Exclusivity, Assignment, Rent Escalation, CAM Cap, Renewal, Termination)
- Cells: colored circles — red/yellow/green/gray based on clause severity
- Pull from lease_risk_scores.clause_scores JSONB
- Hover on a cell: show the clause summary
- Click on a cell: navigate to that location's risk score detail
- Sortable by clicking column headers

**Critical Dates Section (full width, below charts):**
- Title: "Upcoming Critical Dates"
- List of dates sorted by nearest first
- Each row: colored urgency badge (red <30 days, yellow 30-90, green >90), date, description, location name
- Past dates at the bottom in gray with "Passed" label
- Click on a date row: navigate to that location page

**Portfolio AI Chat (bottom section):**
- Chat input: "Ask about your entire portfolio..."
- This should query across ALL locations' document chunks
- Create API enhancement: when store_id is null in the chat API, search across all stores for the tenant
- System prompt addition: "You are analyzing a portfolio of commercial leases. Always specify which location information comes from."
- Example questions shown as chips:
  - "Which locations have the highest risk?"
  - "How many leases expire in the next 3 years?"
  - "Compare my rent per square foot across locations"
  - "What are my total CAM obligations?"

---

### NAVIGATION

Add "Portfolio" to the sidebar navigation:
- Position: between Dashboard and the locations list
- Icon: BarChart3 or PieChart from lucide-react
- Active state: emerald left border + bg-white/5
- Show for all tenants (even with 1 location — they'll add more)

---

### STYLING

- Match the existing dark theme throughout
- Cards: bg-white/[0.03] backdrop-blur border border-white/[0.06] rounded-xl
- Charts: use emerald/green for positive, amber for warning, red for danger
- Responsive: on mobile, charts stack vertically and the heatmap becomes a scrollable card list
- All text: minimum 14px, headings 20px+
- Chart labels: 12px, readable

---

### RECHARTS SETUP

Recharts should already be installed. If not:
```bash
npm install recharts
```

Import pattern:
```typescript
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts'
```

---

Run npx next build to verify. Fix ALL errors.
Then: git add . && git commit -m "Phase 3: Portfolio analytics dashboard with charts, heatmap, cross-location AI" && git push

TASKEOF
log "  Created 00-portfolio-analytics.md"

cat > "$PROMPTS_DIR/01-command-palette-notifications.md" << 'TASKEOF'
Read the entire src/ directory before making any changes. These components DO NOT exist yet — create them from scratch.

## TASK: Command Palette (Cmd+K), Notification Center, Keyboard Shortcuts

Linear has Cmd+K. Notion has Cmd+K. Vercel has Cmd+K. In 2026 SaaS, if you can't Cmd+K to it, it doesn't exist. Provelo currently has NONE of these. Build all three.

---

### PART 1: COMMAND PALETTE — src/components/CommandPalette.tsx

**Trigger:** Cmd+K (Mac) or Ctrl+K (Windows/Linux)

**Implementation:**

1. Create a global keyboard listener. Add it to the root layout (src/app/layout.tsx):
```typescript
'use client'
import { useState, useEffect } from 'react'
import { CommandPalette } from '@/components/CommandPalette'

function CommandPaletteProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(prev => !prev)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])
  return <>
    {children}
    <CommandPalette open={open} onClose={() => setOpen(false)} />
  </>
}
```

2. Wrap the app body with this provider (inside ClientProviders or directly in layout.tsx body).

3. The CommandPalette component:

```typescript
interface CommandItem {
  id: string
  label: string
  icon: React.ReactNode
  shortcut?: string
  action: () => void
  section: 'navigation' | 'actions' | 'search'
}
```

**Visual design:**
- Overlay: fixed inset-0 bg-black/60 backdrop-blur-sm z-50
- Card: centered, max-w-[600px] w-full mx-4, bg-gray-900/95 border border-white/10, rounded-xl, shadow-2xl
- Search input: w-full bg-transparent text-white text-lg px-5 py-4, border-b border-white/10, placeholder "Type a command or search...", autofocus
- Results list: max-h-[400px] overflow-y-auto py-2
- Each result: px-4 py-3 flex items-center gap-3 cursor-pointer rounded-lg mx-2
- Selected/hover: bg-white/[0.06]
- Section headers: px-5 py-2 text-xs uppercase tracking-wider text-gray-500
- Keyboard navigation: Arrow Up/Down to select, Enter to execute, Escape to close

**Commands to register (dynamically built on open):**

Navigation section:
- "Go to Dashboard" → router.push('/dashboard')
- "Go to Portfolio" → router.push('/portfolio')
- "Go to Settings" → router.push('/settings')
- For each store the tenant has: "Go to [Store Name]" → router.push('/location/[id]')

Actions section:
- "New Chat" → navigate to chat for current location
- "Upload Document" → trigger upload modal
- "Analyze Risk Score" → trigger risk analysis
- "Run CAM Audit" → navigate to CAM section

Search section:
- "Search documents..." → placeholder, navigates to search
- "Search conversations..." → placeholder

4. **Fuzzy matching:** As user types, filter commands case-insensitively. Use substring match. If user types "who" and there's "Go to Whole Foods", it should match. Show top 8 results.

5. **Animation:** Fade in overlay 150ms, scale card from 95% to 100% with opacity 0 to 1. Same reverse on close.

6. **Close on:** Escape, clicking overlay, or executing a command.

---

### PART 2: NOTIFICATION CENTER — src/components/NotificationCenter.tsx

**Bell icon in the header/navbar, top-right area.**

1. Find the existing layout or navbar component. Add a bell icon button next to any existing header elements (like the user avatar or settings link).

2. Bell icon:
   - Use Bell from lucide-react
   - Size: 20px inside a 40px button
   - If unread count > 0: small red circle badge with count (top-right of bell)
   - Badge: min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full, absolute -top-1 -right-1

3. Click opens a dropdown panel:
   - Position: absolute right-0 top-full mt-2
   - Width: 380px, max-h-[500px] overflow-y-auto
   - Background: bg-gray-900/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl
   - Header: "Notifications" title + "Mark all as read" link
   - Each notification:
     - Left: icon based on type (Calendar for critical dates, Shield for risk, FileText for documents)
     - Middle: title (font-medium text-white), message (text-sm text-gray-400), relative timestamp (text-xs text-gray-500)
     - Unread indicator: 3px emerald left border
     - Click: navigates to relevant page, marks as read
   - Empty state: "No notifications yet" with bell icon

4. **Generate notifications automatically:**
   - On dashboard load, check critical_dates for dates within 30 and 90 days. Create notifications if they don't exist.
   - After risk score completes, create a notification.
   - After CAM audit completes, create a notification.
   - Use the notifications table (already created in the SQL migration).

5. **API routes:**
   - GET /api/notifications/route.ts — fetch notifications for current user, ordered by created_at DESC, limit 20
   - PATCH /api/notifications/route.ts — mark one or all as read (accept { id?: string, mark_all?: boolean })

---

### PART 3: KEYBOARD SHORTCUTS

Register these in the root layout alongside the Cmd+K handler:
- Cmd+K / Ctrl+K → Open command palette
- Cmd+N / Ctrl+N → New chat (if on a location page, navigate to chat)
- Cmd+U / Ctrl+U → Upload document (if applicable)
- Escape → Close any open modal, panel, or palette

Prevent default browser behavior for these shortcuts.

Show shortcuts in the command palette results as small badges on the right side (e.g., "⌘K" or "Ctrl+K").

---

Run npx next build to verify. Fix ALL errors.
Then: git add . && git commit -m "Phase 3: Command palette, notification center, keyboard shortcuts" && git push

TASKEOF
log "  Created 01-command-palette-notifications.md"

cat > "$PROMPTS_DIR/02-onboarding-empty-states.md" << 'TASKEOF'
Read the entire src/ directory before making any changes.

## TASK: Progressive Onboarding + Empty States + Welcome Tour

75% of new users churn in the first week due to poor onboarding (industry stat). Provelo has NO onboarding flow. Build one that matches the best SaaS products (Notion's inviting empty states, Linear's progressive disclosure).

---

### PART 1: ONBOARDING CHECKLIST — src/components/OnboardingChecklist.tsx

Show this card at the top of the dashboard for new users who haven't completed onboarding.

**5 checklist items:**
1. "Add your first location" — check: query stores table, count > 0
2. "Upload a lease document" — check: query documents table, count > 0
3. "Ask your lease a question" — check: query conversations table, has messages
4. "Review your lease summary" — check: lease_summaries table has entry (or use onboarding_progress JSONB)
5. "Check your risk score" — check: lease_risk_scores table has entry

**Display:**
- Card at top of dashboard, bg-gradient-to-r from-emerald-900/20 to-gray-900/20, border border-emerald-500/20, rounded-xl
- Progress bar: filled emerald, shows "3 of 5 complete"
- Each item: circle icon (empty for incomplete, emerald check for done), label, brief description
- Incomplete items are buttons that navigate to the relevant action:
  - "Add your first location" → opens AddStoreModal
  - "Upload a lease document" → navigates to upload page
  - "Ask your lease a question" → navigates to chat
  - "Review your lease summary" → navigates to first location
  - "Check your risk score" → navigates to first location, scrolls to risk section
- When all 5 complete: brief celebration (confetti emoji + "You're all set!" message), then "Dismiss" button
- Dismissing sets onboarding_completed = true in tenant_profiles (via PATCH /api/settings)
- Don't show the checklist if onboarding_completed is true

**API: GET /api/onboarding/route.ts**
Returns the completion status of each step by querying the relevant tables.

---

### PART 2: EMPTY STATES FOR EVERY PAGE/SECTION

Search every component that can have an empty/no-data state and add helpful empty states:

**Dashboard — no locations:**
- Large illustration area (use a simple SVG building icon or emoji)
- "Welcome to Provelo!"
- "Add your first commercial location to get started with AI-powered lease intelligence."
- Large "Add Location" button (emerald)
- Below: "Provelo helps you understand your lease, catch billing errors, and never miss a critical date."

**Location page — no documents:**
- Upload icon (large, centered)
- "Upload your lease to unlock AI intelligence"
- "Supported: PDF files. Upload your base lease, amendments, exhibits, and any other lease documents."
- Drag-and-drop zone
- "Your documents are processed securely and encrypted at rest."

**Chat — no conversations yet:**
- Instead of empty white space, show 6 suggested question chips:
  - "What are my renewal options?"
  - "Who is responsible for HVAC maintenance?"
  - "What are my CAM obligations?"
  - "When does my lease expire?"
  - "Can I sublease my space?"
  - "What happens if I'm late on rent?"
- Each chip: bg-white/[0.04] border border-white/10 rounded-full px-4 py-2 text-sm text-gray-300 hover:bg-emerald-500/10 hover:border-emerald-500/30 cursor-pointer
- Clicking a chip starts a chat with that question

**Risk Score — not yet analyzed:**
- Shield icon with question mark
- "Your lease hasn't been analyzed yet"
- "Click Analyze to generate a risk score across 20 clause categories. Takes about 30 seconds."
- "Analyze Now" button

**CAM Audit — no statements uploaded:**
- File search icon
- "Upload your CAM reconciliation statement to run a forensic audit"
- "We check against 14 detection rules to find potential overcharges."
- Upload zone
- Expandable: "What is a CAM reconciliation?" with brief explanation

**Portfolio — less than 2 locations (or no data yet):**
- Chart icon
- "Add more locations to unlock portfolio analytics"
- "Compare risk scores, track expirations, and spot trends across your entire portfolio."
- "Add Location" button

---

### PART 3: WELCOME TOUR (first login only)

A 4-step tooltip tour using a simple custom component (no heavy library needed):

**src/components/WelcomeTour.tsx**

Step 1: Points to sidebar → "Navigate your locations and portfolio from here"
Step 2: Points to chat/ask button → "Ask your lease anything in plain English — like talking to a real estate advisor"
Step 3: Points to upload area or button → "Upload your lease PDF to unlock all AI features"
Step 4: Points to notification bell → "We'll alert you about critical dates and completed analyses"

**Implementation:**
- Each step: a tooltip with an arrow pointing to the target element (use a data-tour-step="1" attribute on target elements)
- Background dims (bg-black/40) except the highlighted element
- Tooltip: bg-gray-900 border border-emerald-500/30 rounded-lg p-4 shadow-xl max-w-[280px]
- Message, "Next" button (emerald), step counter "2 of 4", "Skip tour" link (text-gray-500)
- Store completion: localStorage key 'provelo_tour_completed'
- Only show on first ever visit (check localStorage on mount)
- Tour auto-starts 1 second after dashboard first renders for a new user

---

Run npx next build to verify. Fix ALL errors.
Then: git add . && git commit -m "Phase 3: Progressive onboarding, empty states, welcome tour" && git push

TASKEOF
log "  Created 02-onboarding-empty-states.md"

cat > "$PROMPTS_DIR/03-tenant-only-audit.md" << 'TASKEOF'
Read the entire src/ directory before making any changes.

## TASK: Remove PM Dashboard + Complete Tenant-Only Language Audit

Provelo is EXCLUSIVELY for commercial tenants. The PM dashboard (src/app/pm-dashboard/) still exists. Remove it and audit all language.

---

### PART 1: DELETE PM-FACING CODE

1. Delete the entire directory: src/app/pm-dashboard/
2. Search the entire codebase for any references to pm-dashboard, pm_dashboard, or property_manager:
   - Remove any navigation links to /pm-dashboard
   - Remove any sidebar items referencing PM dashboard
   - Remove any API routes that are PM-specific (if any)
   - Remove any role checks for 'property_manager' in page guards

3. In tenant_profiles, the role column has 'property_manager' as an option. Change the check constraint:
   - Remove 'property_manager' from the allowed roles
   - But do NOT run ALTER TABLE — just update the TypeScript types and UI
   - If there's a role selector in onboarding or settings, remove "Property Manager" option

4. Search for any component that renders differently based on role === 'property_manager' and remove that code path.

---

### PART 2: LANGUAGE AUDIT

Search every .tsx and .ts file for these terms and update:

| Find | Replace with |
|------|-------------|
| "Property Manager" (when referring to a user role) | "Team Admin" |
| "property manager" (lowercase, same context) | "team admin" |
| Any text suggesting Provelo serves landlords | Tenant-focused language |
| "landlord portal" or "manager view" | Remove entirely |

**Keep** references to "property manager" or "landlord" when they refer to the OTHER party in a lease (e.g., "Your landlord is responsible for..." is correct tenant-facing language).

---

### PART 3: AI SYSTEM PROMPT AUDIT

Open src/lib/prompts.ts (or wherever the chat system prompt is defined) and src/lib/ragChain.ts.

Verify the system prompt:
1. Always advocates for the TENANT's interests
2. References specific articles: "Per Article X.X" or "Under Section X.X"
3. Notes which document references come from (base lease, amendment, exhibit)
4. Is direct and confident when the lease is clear
5. Acknowledges ambiguity honestly: "Your lease language on this point is not entirely clear..."
6. Suggests consulting a commercial real estate attorney for complex questions
7. Keeps responses to 2-4 paragraphs
8. Ends with a brief bold summary when helpful
9. Does NOT use markdown headers (##), horizontal rules (---), or block quotes
10. Does NOT write numbered recommendation lists
11. Writes in flowing paragraphs, not bullet-heavy formats

If the system prompt doesn't match all of these, update it to include them.

---

### PART 4: PRICING PLACEHOLDERS

Search for any hardcoded pricing in the app (like "$15/team member" or specific dollar amounts for plans). Remove them or replace with:
- "Team collaboration" section (no price)
- "Contact us for pricing" or simply remove the pricing section
- No upgrade CTAs with specific prices

---

Run npx next build to verify. Fix ALL errors.
Then: git add . && git commit -m "Phase 3: Remove PM dashboard, tenant-only language audit" && git push

TASKEOF
log "  Created 03-tenant-only-audit.md"

cat > "$PROMPTS_DIR/04-lease-comparison.md" << 'TASKEOF'
Read the entire src/ directory before making any changes.

## TASK: Lease Comparison — Side-by-Side Amendment Analysis

From the competitive research: "The platform that connects deal pipeline → lease abstraction → ongoing monitoring → automated CAM audit → dispute management in one workflow will capture the full tenant value chain." NO competitor offers side-by-side amendment comparison. This is a unique differentiator for Provelo.

---

### WHAT IT DOES

When a tenant has a base lease AND one or more amendments, Provelo should show a side-by-side comparison highlighting what changed between versions.

### API ROUTE: POST /api/lease-compare/route.ts

1. Accept: store_id
2. Get all documents for this store, sorted by document_type (base_lease first, then amendments by uploaded_at)
3. Get chunks for each document separately
4. Send to Claude with a comparison prompt:

```
You are a commercial lease comparison analyst. Compare the following lease documents and identify ALL differences.

BASE LEASE:
{base_lease_chunks}

AMENDMENT(S):
{amendment_chunks}

For each change, provide:
- clause_affected: which article/section was modified
- original_text: brief summary of what the base lease said
- amended_text: brief summary of what the amendment changed it to
- impact: "favorable" | "unfavorable" | "neutral" from the tenant's perspective
- significance: "high" | "medium" | "low"
- explanation: 1-2 sentences explaining the practical impact on the tenant

Return ONLY valid JSON:
{
  "comparisons": [
    {
      "clause_affected": "Article 5 - Rent",
      "original_text": "Base rent of $5,000/month with 3% annual increases",
      "amended_text": "Base rent increased to $5,500/month with CPI-linked increases",
      "impact": "unfavorable",
      "significance": "high",
      "explanation": "The amendment increases both the base rent and changes the escalation method from fixed to CPI-linked, which could result in higher increases in inflationary periods."
    }
  ],
  "summary": "Brief overall summary of changes",
  "net_impact": "favorable" | "unfavorable" | "mixed"
}
```

### UI: LEASE COMPARISON SECTION

Add a "Compare Versions" button on the location detail page (only visible if the location has 2+ documents).

Display as a two-column layout:

**Left column: "Base Lease"**
**Right column: "Amendment(s)"**

For each comparison item:
- Row spanning both columns
- Left side: original text with article reference
- Right side: amended text with article reference
- Color coding: green highlight for favorable, red for unfavorable, gray for neutral
- Impact badge: "Favorable" (green), "Unfavorable" (red), "Neutral" (gray)
- Significance badge: "High" (bold), "Medium" (normal), "Low" (muted)
- Expandable explanation below each row

**Summary section at top:**
- "X changes found between base lease and amendment(s)"
- Net impact badge
- Overall summary paragraph

**Action buttons:**
- "Export Comparison" → PDF download
- "Discuss Changes with AI" → opens chat pre-filled with "What are the key changes in my lease amendment?"

**On mobile:** Stack vertically (original on top, amended below for each item).

---

### STYLING

- Container: bg-white/[0.02] rounded-xl border border-white/[0.06]
- Favorable changes: left border-emerald-500, bg-emerald-500/5
- Unfavorable changes: left border-red-500, bg-red-500/5
- Neutral changes: left border-gray-500, bg-gray-500/5
- Column headers: sticky, bg-gray-900 border-b border-white/10

---

Run npx next build to verify. Fix ALL errors.
Then: git add . && git commit -m "Phase 3: Lease comparison - side-by-side amendment analysis" && git push

TASKEOF
log "  Created 04-lease-comparison.md"

cat > "$PROMPTS_DIR/05-negotiation-recommendations.md" << 'TASKEOF'
Read the entire src/ directory before making any changes.

## TASK: Enhance Risk Score with AI Negotiation Recommendations + Suggested Lease Language

LeaseCake LIFT includes "AI-driven negotiation recommendations with suggested language for strengthening lease terms." Provelo's risk score shows clauses but does NOT provide actionable negotiation language. Fix this.

---

### ENHANCE: /api/risk-score/route.ts

Update the Claude prompt to also return negotiation recommendations:

Add to the JSON response schema for each clause:
```json
{
  "clause": "...",
  "severity": "...",
  "summary": "...",
  "citation": "...",
  "recommendation": "...",
  "negotiation_language": "Suggested lease language: 'Tenant shall have the right to assign or sublet the Premises, or any part thereof, upon thirty (30) days prior written notice to Landlord, without requiring Landlord's consent, provided that the assignee or subtenant assumes all obligations under this Lease.'"
}
```

Add a new top-level field:
```json
{
  "top_3_priorities": [
    {
      "clause": "Assignment/subletting",
      "current_risk": "red",
      "why_it_matters": "Your lease heavily restricts your ability to transfer or sublease, which limits your exit options and reduces the value of your leasehold interest.",
      "what_to_negotiate": "Request that assignment and subletting be permitted with reasonable consent, not to be unreasonably withheld or delayed.",
      "suggested_language": "Tenant may assign this Lease or sublet the Premises with Landlord's prior written consent, which shall not be unreasonably withheld, conditioned, or delayed. Any request for consent shall be responded to within fifteen (15) business days."
    }
  ]
}
```

---

### ENHANCE: RiskScoreCard.tsx

Add a "Negotiation Playbook" section below the clause list:

1. Section header: "Top Negotiation Priorities" with a Lightbulb icon
2. Show the top 3 red/yellow clauses with the highest negotiation impact
3. Each priority card:
   - Clause name + current severity badge
   - "Why it matters" — 1-2 sentence explanation
   - "What to negotiate" — actionable instruction
   - "Suggested language" — collapsible section showing actual lease language they could propose
   - Copy button on the suggested language (copies to clipboard)
4. Below the top 3: "View all recommendations" expandable showing the rest

**Styling:**
- Priority cards: bg-white/[0.03] rounded-lg p-5 border-l-4 (red/yellow based on severity)
- Suggested language: bg-gray-800/50 rounded-md p-4 font-mono text-sm text-gray-300, with a "Copy" button top-right
- Copy button: on click, show a brief "Copied!" toast

---

### MAKE CITATIONS CLICKABLE

Every article citation in the risk score card should be clickable and open the citation side panel:

1. RiskScoreCard must accept an `onArticleClick` callback prop
2. In the location page (src/app/location/[id]/page.tsx), pass the citation panel handler to RiskScoreCard
3. Citation text styling: text-emerald-400 underline decoration-emerald-500/30 hover:decoration-emerald-500 cursor-pointer transition-all
4. On click: create a Citation object with the article number and trigger the panel open

---

Run npx next build to verify. Fix ALL errors.
Then: git add . && git commit -m "Phase 3: Risk score negotiation recommendations with suggested language" && git push

TASKEOF
log "  Created 05-negotiation-recommendations.md"

cat > "$PROMPTS_DIR/06-cam-dispute-letters.md" << 'TASKEOF'
Read the entire src/ directory before making any changes.

## TASK: CAM Audit Dispute Letter Generation + Cross-Portfolio Pattern Detection

CAMAudit.io is a standalone $199/audit tool. Provelo should surpass it by generating dispute letters and detecting patterns across multiple locations.

---

### PART 1: DISPUTE LETTER GENERATION

After a CAM audit finds violations, add a "Generate Dispute Letter" button in the CamAuditCard.

**API ROUTE: POST /api/cam-audit/dispute-letter/route.ts**

Accept: audit_id (UUID)

1. Fetch the cam_audit record and its findings
2. Fetch the store details (name, address)
3. Fetch the lease provisions related to CAM (from document_chunks)
4. Send to Claude with a dispute letter prompt:

```
Generate a professional dispute letter for a commercial tenant challenging CAM (Common Area Maintenance) overcharges. The letter should be sent from the tenant to the landlord/property manager.

TENANT LOCATION: {store_name} at {address}
AUDIT FINDINGS: {JSON.stringify(findings)}
TOTAL POTENTIAL OVERCHARGE: ${total}

The letter should:
1. Be addressed to "Property Manager / Landlord" (tenant will fill in the actual name)
2. Reference the specific lease provisions that were violated
3. Cite each violation with the rule name, estimated overcharge amount, and lease article reference
4. Request a meeting to discuss the findings within 15 business days
5. Reference the tenant's audit rights under the lease
6. Maintain a professional, firm but not adversarial tone
7. Include a deadline for response
8. Note that the tenant reserves all rights under the lease

Return the letter as plain text, properly formatted with:
- Date placeholder: [DATE]
- Sender/recipient placeholders
- Proper business letter formatting
- Re: line with the property address
```

**UI additions to CamAuditCard:**
- "Generate Dispute Letter" button (appears only when violations are found)
- Opens a modal showing the generated letter
- "Copy to Clipboard" button
- "Download as PDF" button (use the existing PDF export utility)
- "Edit" mode: user can modify the letter before copying/downloading
- The letter should be editable in a textarea with monospace font

---

### PART 2: CROSS-PORTFOLIO CAM PATTERN DETECTION

If a tenant has CAM audits across multiple locations, look for patterns:

Add to the portfolio page or as a separate section:

1. Query all cam_audits for the tenant
2. Aggregate findings across locations:
   - Which rules are violated most frequently?
   - Which landlord/property (by store address) has the most violations?
   - Total potential overcharges across all locations
   - Are the same rule violations appearing at multiple locations? (This suggests systematic landlord behavior)

3. Display as a card:
   - "CAM Audit Insights Across Your Portfolio"
   - "Rule X violated at Y of Z locations — this may indicate a systematic billing practice"
   - Total portfolio-wide potential overcharges
   - Table: location | violations found | estimated overcharge | last audit date

---

Run npx next build to verify. Fix ALL errors.
Then: git add . && git commit -m "Phase 3: CAM dispute letter generation + portfolio pattern detection" && git push

TASKEOF
log "  Created 06-cam-dispute-letters.md"

cat > "$PROMPTS_DIR/07-critical-dates-calendar.md" << 'TASKEOF'
Read the entire src/ directory before making any changes.

## TASK: Interactive Critical Dates Calendar + Configurable Email Reminders

LeaseCake's Critical Date Alarms rate 9.0/10 on G2. Their system has configurable lead times (e.g., "remind me 210 days before lease expiration if notice is due at 180 days"), multiple reminders per event, and an interactive calendar. Build Provelo's version.

---

### PART 1: INTERACTIVE CALENDAR VIEW

Enhance the CriticalDatesCard (src/components/CriticalDatesCard.tsx) or create a new CriticalDatesCalendar component.

**Add a calendar view toggle:** The existing list view stays, but add a "Calendar" tab that shows a month-view grid.

**Calendar implementation (no heavy library — build a simple grid):**

```typescript
function MonthCalendar({ dates, month, year }: { dates: CriticalDate[], month: number, year: number }) {
  // Calculate days in month, first day of week, etc.
  // Render a 7-column grid (Sun-Sat)
  // Each day cell: number + colored dots for events on that day
  // Dot colors: red (<30 days), yellow (30-90), green (>90), gray (past)
  // Click a day with events: show a popover/tooltip listing the events
  // Navigation: prev/next month arrows
}
```

**Calendar cells:**
- Width: equal columns (14.28% each)
- Height: at least 80px to fit dots
- Today: subtle emerald ring
- Days with events: colored dot(s) below the number
- Click on a day: show popover with event list (each event shows: type, description, location)
- Hover on a dot: tooltip with event name

**Month navigation:**
- Left arrow: previous month
- Right arrow: next month
- Month/Year display in center: "April 2026"
- "Today" button to jump back

---

### PART 2: CONFIGURABLE REMINDERS

For each critical date, allow the user to set custom reminder lead times:

1. Add a "Set Reminder" button/icon next to each date in the list view
2. Clicking opens a small popover:
   - "Remind me X days before" — dropdown with options: 7, 14, 30, 60, 90, 120, 180, 210, 365 days
   - "Add another reminder" — allow multiple reminders per event (e.g., 180 days AND 30 days)
   - Save button

3. Update the critical_dates table:
```sql
ALTER TABLE critical_dates ADD COLUMN IF NOT EXISTS reminder_days INTEGER[] DEFAULT '{30}';
```

4. Display active reminders as small badges on the date item: "30d, 180d"

5. On dashboard/location load, check for dates within any active reminder window and generate notifications.

---

### PART 3: CROSS-LOCATION CRITICAL DATES

On the portfolio page and dashboard, show critical dates from ALL locations:

- Merge dates from all stores
- Include the store name on each date
- Sort by nearest upcoming first
- Color-code by urgency
- Group by: "This Month", "Next 3 Months", "Next 6 Months", "Beyond 6 Months"

---

Run npx next build to verify. Fix ALL errors.
Then: git add . && git commit -m "Phase 3: Interactive critical dates calendar + configurable reminders" && git push

TASKEOF
log "  Created 07-critical-dates-calendar.md"

cat > "$PROMPTS_DIR/08-landing-page.md" << 'TASKEOF'
Read the entire src/ directory before making any changes. Focus on src/components/LandingPage.tsx and src/app/page.tsx.

## TASK: Landing Page Overhaul — Match Stripe/Linear/Vercel Quality

The landing page must convert visitors into signups. Current one exists but needs to match the best SaaS products. Stripe's clean data presentation, Linear's calm design, Vercel's speed-first aesthetic.

---

### COMPLETE REDESIGN OF src/components/LandingPage.tsx

**Navigation bar (sticky):**
- Left: Provelo logo ("PV" icon + "Provelo" text), tagline "Commercial Lease Intelligence" in text-xs text-gray-500
- Center: Features, How It Works, For Tenants (anchor links)
- Right: "Sign In" (ghost button, text-gray-300 hover:text-white) + "Start Free" (bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg px-5 py-2.5)
- On scroll: bg-gray-950/80 backdrop-blur-xl border-b border-white/5 transition-all
- Mobile: hamburger menu

**Hero Section:**
- Full viewport height minus navbar
- Background: subtle radial gradient from emerald-950/20 at center to transparent
- Optional: very subtle animated grid dots or mesh gradient (CSS only, no heavy library)
- Headline: "Know Your Lease. Protect Your Business." — text-5xl md:text-7xl font-bold tracking-tight text-white, max-w-4xl mx-auto text-center
- Subheadline: "AI-powered lease intelligence for commercial tenants. Understand your rights, catch billing errors, and never miss a critical date." — text-lg md:text-xl text-gray-400 max-w-2xl mx-auto text-center mt-6
- Two CTAs side by side (centered):
  - "Start Free" — large emerald button, px-8 py-4 text-lg rounded-xl
  - "See How It Works" — outlined button, scrolls to features section
- Below CTAs: "No credit card required. First lease analysis in under 2 minutes." — text-sm text-gray-500

**Problem Section (pain points):**
- Background: slightly darker section
- Heading: "Commercial leases are designed to protect landlords." — text-3xl font-bold text-white text-center
- Subheading: "Provelo levels the playing field." — text-emerald-400
- Three pain point cards in a row:
  1. Magnifying glass icon — "40% of CAM reconciliations contain billing errors" — "Most tenants never know they're overpaying."
  2. Calendar icon — "Critical dates buried in 100-page documents" — "Miss a renewal deadline and lose your lease."
  3. Scale/gavel icon — "Legal language designed to confuse" — "You signed it, but do you understand it?"
- Cards: bg-white/[0.03] border border-white/[0.06] rounded-xl p-8, hover:border-emerald-500/20 transition-all

**Feature Cards (4 key features):**
- Two rows of two cards, or staggered layout
- Each card: icon (emerald-400), title (text-xl font-semibold text-white), description (text-gray-400), subtle animated illustration or screenshot area

1. MessageSquare icon — "Ask Your Lease Anything" — "Get plain-English answers about your rights, obligations, and what you can and can't do. With article-level citations you can verify."
2. ShieldCheck icon — "Catch CAM Overcharges" — "14-rule forensic audit finds billing errors that cost tenants thousands. What took CPAs $15,000 takes Provelo 30 seconds."
3. BarChart3 icon — "Score Your Lease Risk" — "20-clause analysis scores your lease from 0-100 with AI-powered negotiation recommendations and suggested lease language."
4. Bell icon — "Never Miss a Deadline" — "Automated alerts for renewals, rent escalations, option windows, and every critical date in your lease."

**How It Works (3 steps):**
- Horizontal flow with connecting lines/arrows between steps
- Step 1: Upload icon — "Upload your lease PDF" — "Drag and drop any commercial lease. We process base leases, amendments, exhibits, and more."
- Step 2: Brain/AI icon — "AI analyzes every clause" — "Our AI reads your entire lease, extracts key terms, identifies risks, and builds your intelligence dashboard."
- Step 3: Sparkles icon — "Get instant intelligence" — "Ask questions, run audits, compare amendments, and get negotiation recommendations — all in plain English."
- Each step: number circle (1, 2, 3) with emerald background, description below

**Social proof / trust section:**
- "Built for commercial tenants managing 1 to 1,000+ locations"
- Three trust badges in a row:
  - Lock icon — "End-to-end encryption"
  - Shield icon — "Enterprise-grade security"
  - Eye-off icon — "Your data stays yours"
- Below: "Provelo never shares your lease data. Documents are encrypted at rest and in transit."

**Final CTA Section:**
- Dark section with emerald gradient overlay
- "Ready to understand your lease?"
- "Start Free" large button
- "Join tenants who've uncovered thousands in billing errors and lease risks."

**Footer:**
- Four columns: Product (Features, Pricing — coming soon, Security), Company (About, Contact, Careers), Legal (Privacy, Terms), Connect (Twitter/X, LinkedIn)
- Bottom: "© 2026 Provelo. Commercial Lease Intelligence." + Provelo logo small
- Dark background, subtle top border

---

### RESPONSIVE

- Mobile: single column everything, hero text scales down to text-3xl, nav becomes hamburger
- Tablet: two-column grids become single or two as appropriate
- All touch targets: 44px minimum

---

### PERFORMANCE

- No heavy images or videos on initial load
- All animations: CSS only (no JS animation libraries)
- Lazy load any below-fold content
- Page should feel instant

---

Run npx next build to verify. Fix ALL errors.
Then: git add . && git commit -m "Phase 3: Landing page overhaul - Stripe/Linear quality" && git push

TASKEOF
log "  Created 08-landing-page.md"

cat > "$PROMPTS_DIR/09-ux-polish.md" << 'TASKEOF'
Read the entire src/ directory before making any changes.

## TASK: Global UX Polish — Linear/Notion/Stripe Design System

Apply consistent design patterns across EVERY page and component. The goal: every interaction feels snappy, every element intentional, the app feels like it was designed by a top-tier SaaS team.

---

### DESIGN TOKENS (apply globally)

**Typography:**
- Font: use whatever is already imported (Inter or Plus Jakarta Sans). Do NOT add new fonts.
- Headings: font-semibold text-white tracking-tight
- Body: text-gray-300 font-normal
- Captions: text-gray-500 text-sm
- Letter-spacing on large headings: -0.025em (tighter, like Linear)
- NEVER mix fonts on the same page

**Spacing (8px scale):**
- Card padding: 24px (p-6)
- Gap between cards: 16px (gap-4)
- Section spacing: 48px (py-12)
- Page margins: 24px mobile, 32-48px desktop

**Colors (enforce everywhere):**
- Primary action: emerald-500 (#10B981)
- Card backgrounds: bg-white/[0.03] with backdrop-blur-sm (NOT solid gray backgrounds)
- Card borders: border border-white/[0.06]
- Active/selected: emerald left border, bg-white/[0.05]
- Text links: text-emerald-400 hover:text-emerald-300
- Danger: red-500
- Warning: amber-500
- Success: emerald-500
- DO NOT USE random colors — everything is emerald, neutral grays, or semantic

**Buttons (standardize):**
- Primary: bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg px-4 py-2.5 font-medium transition-all
- Secondary: bg-white/[0.05] hover:bg-white/[0.08] text-white border border-white/[0.1] rounded-lg px-4 py-2.5
- Ghost: bg-transparent hover:bg-white/[0.05] text-gray-400 hover:text-white rounded-lg px-3 py-2
- Destructive: bg-red-600/10 hover:bg-red-600/20 text-red-400 border border-red-500/20 rounded-lg
- ALL buttons: min-h-[40px] transition-all duration-150
- Loading state: spinner icon + disabled, opacity-70

**Cards (standardize):**
- ALL cards: rounded-xl (12px radius)
- Border: border border-white/[0.06]
- Background: bg-white/[0.03] backdrop-blur-sm
- Hover: border-white/[0.1] transition-colors
- No heavy drop shadows — minimal or none

---

### ANIMATIONS

**Page content:** Fade in on mount (opacity 0→1, 200ms)
**Cards:** Stagger in on page load (each card 50ms delay, translateY 8→0, opacity 0→1)
**Modals/panels:** Slide in from right for panels, fade+scale for modals (200ms)
**Buttons:** Active state scale(0.98) for 100ms
**Toasts:** Slide in from top-right, auto-dismiss 5 seconds
**Skeleton loaders:** For every component that fetches data, show pulsing skeleton shapes matching the content layout (NOT just a spinner)

---

### SIDEBAR REFINEMENT

Fix the sidebar to match the Linear pattern:

1. Structure (top to bottom):
   - Logo: "PV" icon + "Provelo" text
   - Main nav: Dashboard, Portfolio, Settings
   - Divider (thin line, border-white/[0.06])
   - "Locations" section label (text-xs uppercase text-gray-500 tracking-wider px-4)
   - Location list (each with colored status dot + name)
   - "Add Location" button at bottom (ghost style)

2. Active state: 3px emerald left border + bg-white/[0.05] on active nav item

3. Location status dots:
   - Green: active lease, >2 years remaining
   - Yellow: lease expiring within 2 years
   - Red: lease expired or <6 months remaining
   - Gray: no lease data uploaded

4. Collapsible: button at top to collapse to icons only (48px width). Store state in localStorage.

---

### RENT ESCALATION TIMELINE BRIGHTNESS

In RentEscalationTimeline.tsx:
- Populated/active text: text-white or text-gray-100 (bright, high contrast)
- Placeholder text: text-gray-500
- Ensure WCAG AA contrast ratio (4.5:1 minimum)

### CRITICAL DATES COLORS

In CriticalDatesCard.tsx:
- Past dates: text-gray-500, "Passed" badge
- Future <30 days: text-red-400, "Urgent" badge (bg-red-500/10 border-red-500/20)
- Future 30-90 days: text-amber-400, "Approaching" badge
- Future >90 days: text-emerald-400, "On Track" badge
- Lease with 19.5 years remaining: MUST be green
- Sort: nearest upcoming first, past at bottom

---

### GLOBAL CONSISTENCY PASS

Go through EVERY component file and ensure:
1. All cards use the same border radius, background, and border styles
2. All buttons use the standardized styles above
3. All loading states use skeleton loaders (not just spinners)
4. All error states have user-friendly messages (not raw error strings)
5. No component uses hardcoded colors that don't match the palette
6. All interactive elements have hover transitions

---

Run npx next build to verify. Fix ALL errors.
Then: git add . && git commit -m "Phase 3: Global UX polish - Linear/Notion/Stripe design system" && git push

TASKEOF
log "  Created 09-ux-polish.md"

cat > "$PROMPTS_DIR/10-mobile-exports.md" << 'TASKEOF'
Read the entire src/ directory before making any changes.

## TASK: Mobile Responsive Overhaul + Export Improvements

Stripe's mobile companion app focuses on exactly two use cases: morning review of yesterday's numbers and quick lookups. Provelo's mobile experience should prioritize: checking critical dates, asking quick lease questions, and viewing risk scores.

---

### PART 1: MOBILE RESPONSIVE (every page)

**Breakpoints:**
- Mobile: 0-639px (sm)
- Tablet: 640-1023px (md)
- Desktop: 1024px+ (lg)

**Global mobile rules:**
- Sidebar: hidden by default, hamburger icon (top-left, 44px) opens as drawer overlay
- All body text: minimum 16px (prevents iOS zoom on inputs too)
- All touch targets: minimum 44x44px
- No horizontal scrolling on any page
- Cards: full width, stack vertically
- Multi-column grids → single column on mobile
- Input fields: min-h-[48px], font-size 16px

**Dashboard mobile:**
- Stats cards: 2 per row (2 columns), or stack if text overflows
- Any charts: full width, taller aspect ratio for portrait
- Critical dates: list view only (no table)

**Location detail page mobile:**
- Action buttons (Ask Your Lease, Upload): stack vertically, full width
- All cards: single column, full width
- Obligation matrix: transform to a list of cards (not a table), or horizontal scroll with sticky first column
- Risk score: full width card, clause list stacks normally

**Chat mobile:**
- Full screen experience
- Chat bubbles: max-width 92%
- Input bar: fixed bottom, with safe-area-inset-bottom padding for notch phones
- Citation panel: FULL SCREEN modal (not side panel), close button top-right 44px
- Chat sidebar: drawer from left (same as nav)

**Portfolio mobile:**
- Charts: full width, scrollable container
- Heatmap table: horizontal scroll with sticky first column, or transform to cards
- Stats: 2 per row

**Tables anywhere:**
- Tables with 4+ columns: horizontal scroll on mobile with sticky first column
- OR transform to card/list view (each row becomes a card)

**Modals on mobile:**
- All modals: full screen with top bar (close X + title)
- No small centered modals on mobile — they're hard to interact with

---

### PART 2: EXPORT IMPROVEMENTS

Add comprehensive export options across the app:

**Lease Summary Export (PDF):**
- On location page, add "Export Summary" button
- Generates a professional PDF containing:
  - Location name, address, lease dates
  - Key lease terms (rent, escalations, CAM, renewal options)
  - Critical dates list
  - Risk score summary with clause ratings
  - Obligation matrix
- Use the existing PDF export utility (src/lib/pdfExport.ts)
- Style: clean, professional, branded with Provelo logo

**Risk Score Export (PDF):**
- "Export Risk Report" button on RiskScoreCard
- PDF containing: overall score, all clause ratings with summaries, top 3 negotiation priorities with suggested language

**CAM Audit Export (PDF):**
- Already partially implemented — enhance to include:
  - Summary header with total potential overcharge
  - Each finding with rule name, status, estimated overcharge, explanation
  - Dispute letter (if generated)

**Portfolio Export (CSV/Excel):**
- "Export Portfolio Data" button on portfolio page
- CSV with columns: Location, Address, Risk Score, Lease Expiry, Annual Rent, Rent/SF, Top Risk, CAM Total
- Use a simple CSV generation (no heavy library needed):
```typescript
function generateCSV(data: any[], headers: string[]): string {
  const rows = [headers.join(',')]
  for (const item of data) {
    rows.push(headers.map(h => `"${item[h] ?? ''}"`).join(','))
  }
  return rows.join('\n')
}
```

---

Run npx next build to verify. Fix ALL errors.
Then: git add . && git commit -m "Phase 3: Mobile responsive overhaul + export improvements" && git push

TASKEOF
log "  Created 10-mobile-exports.md"

cat > "$PROMPTS_DIR/11-final-audit.md" << 'TASKEOF'
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

TASKEOF
log "  Created 11-final-audit.md"

log ""
log "All 12 prompt files created"
log ""
log "================================================================"
log "EXECUTING TASKS..."
log "================================================================"

echo "Phase 3 started at $(timestamp)" > "$STATUS_FILE"
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
  log "TASK $TOTAL/12: $task_name"

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
log "PHASE 3 COMPLETE"
log "================================================================"
log "Total: $TOTAL | Pass: $PASSED | Fail: $FAILED | Skip: $SKIPPED"
log "Status: $STATUS_FILE"
log "================================================================"

echo "========================================" >> "$STATUS_FILE"
echo "Completed at $(timestamp)" >> "$STATUS_FILE"
echo "TOTAL=$TOTAL PASS=$PASSED FAIL=$FAILED SKIP=$SKIPPED" >> "$STATUS_FILE"
