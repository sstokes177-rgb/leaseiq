#!/bin/bash
set -euo pipefail

PROJECT_DIR="/c/Users/sydne/Desktop/Coding APP/leaseiq"
PROMPTS_DIR="$PROJECT_DIR/.orchestrator/prompts-phase6"
LOGS_DIR="$PROJECT_DIR/.orchestrator/logs-phase6"
STATUS_FILE="$PROJECT_DIR/.orchestrator/status-phase6.log"
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
log "PROVELO PHASE 6 — SECURITY + UX + LANDING PAGE"
log "3 Tasks | 50 min timeout each"
log "================================================================"
log ""
log "Writing prompt files..."


cat > "$PROMPTS_DIR/00-security-ux-fixes.md" << 'TASKEOF'
Read the entire src/ directory before making any changes.

## TASK: Security + UX Fixes — Password Email-Only, Dashboard List View, About Page, Dispute Letter

---

### FIX 1: PASSWORD CHANGES VIA EMAIL ONLY

Security concern: if someone hacks an account, they should NOT be able to change the password from within the app settings. Password changes must only happen via email verification.

In the settings page (src/app/settings/page.tsx or wherever password change is):
1. REMOVE the "Change Password" form entirely (current password field, new password field, confirm field)
2. Replace it with a single button: "Reset Password via Email"
3. When clicked, call supabase.auth.resetPasswordForEmail(user.email) — this sends a password reset link to the user's email
4. Show a success message: "A password reset link has been sent to your email address. Check your inbox to set a new password."
5. The user must click the link in their email to change their password — no in-app password changing at all
6. Style the button as secondary (not primary) since it's not a frequent action

Also check the forgot-password and reset-password pages still work correctly for the email-based flow.

---

### FIX 2: DASHBOARD LOCATION VIEW TOGGLE (LIST VIEW + GRID VIEW)

On the dashboard where locations are shown as grid cards, add a toggle to switch between Grid View and List View.

**Toggle UI:**
- Two small icon buttons in the top-right of the locations section
- Grid icon (LayoutGrid from lucide-react) — active when grid view is selected
- List icon (List from lucide-react) — active when list view is selected
- Active state: bg-white/[0.1] text-emerald-400
- Inactive: text-gray-500 hover:text-gray-300
- Store preference in localStorage: provelo_location_view

**Grid View (current):**
- Keep as-is — the current block/card layout

**List View (NEW):**
- Clean table/list layout
- Each location is a row with columns:
  - Status dot (red/yellow/green)
  - Location name (font-medium text-white, clickable)
  - Shopping center / address (text-sm text-gray-400)
  - Risk score (colored badge: green/yellow/red with number)
  - Lease expiry date (with "X years remaining" or "Expired" badge)
  - Document count
  - Right arrow icon (clickable, navigates to location detail)
- Row hover: bg-white/[0.03] transition
- Click anywhere on row: navigates to /location/[id]
- Clean borders between rows: border-b border-white/[0.06]
- Mobile: hide some columns (risk score, document count), show essential info only

---

### FIX 3: ABOUT PAGE — REMOVE GRADIENT BAR ABOVE UPLOAD & UNDERSTAND SECTION

Open src/app/about/page.tsx. Find section 2 ("Upload & Understand") and the area above it.

Remove ANY of these that create a visible dark bar/band:
- Gradient backgrounds (bg-gradient-to-b, bg-gradient-to-t)
- Semi-transparent dark overlays
- Borders or dividers between sections that create a harsh line
- Any element with a noticeably different background color that creates a "bar" effect

Each section should flow smoothly into the next. Use either:
- Completely transparent backgrounds on all sections
- OR very subtle alternating backgrounds: bg-transparent and bg-white/[0.01] — so subtle they're barely noticeable
- NO visible edges, bars, or gradient strips between sections

Test by looking at the page — there should be no visible horizontal bars or color strips anywhere.

---

### FIX 4: CAM AUDIT DISPUTE LETTER BUTTON

The "Generate Dispute Letter" button is missing from the CAM audit results.

Open src/components/CamAuditCard.tsx (or wherever CAM audit results are displayed).

1. Check if the dispute letter functionality exists:
   - Search for "dispute" in the component
   - Check if there's a button that's conditionally rendered
   - Check if the condition is wrong (maybe it checks for a field that doesn't exist in the data)

2. If the button exists but isn't showing:
   - The condition is likely checking findings.some(f => f.status === 'violation_found') or similar
   - Log the actual findings data to see what status values are returned
   - Fix the condition to match the actual data

3. If the button doesn't exist at all, add it:
   - Show ONLY when the audit has completed AND at least one finding has a violation
   - Button text: "Generate Dispute Letter"
   - Position: below the findings list, prominent but not overwhelming
   - Style: bg-red-600/10 text-red-400 border border-red-500/20 hover:bg-red-600/20 rounded-lg px-5 py-3
   - Icon: FileText from lucide-react

4. On click, call POST /api/cam-audit/dispute-letter with the audit_id
   - If this API route doesn't exist, create it at src/app/api/cam-audit/dispute-letter/route.ts
   - It should: fetch the audit findings, fetch store details, fetch lease CAM provisions from document_chunks, send to Claude with a dispute letter prompt, return the generated letter text

5. After generation, show the letter in a modal:
   - Full letter text in a scrollable area with monospace font
   - "Copy to Clipboard" button
   - "Download as PDF" button
   - "Edit" mode toggle that makes the text editable before copying/downloading
   - Close button

---

### FIX 5: LEASE SUMMARY DATE EXTRACTION IMPROVEMENT

The Whole Foods lease shows "March 2, 2004 → March 1, 2024" but the actual lease runs through September 30, 2045. The AI is pulling dates from the original base lease and ignoring amendments/renewals.

Open src/app/api/lease-summary/generate/route.ts (or wherever lease summaries are generated).

Update the system prompt to include:

"CRITICAL: When extracting lease dates, you MUST check ALL documents — base lease, amendments, commencement letters, exhibits, and side letters. Amendments frequently modify the lease term, expiration date, and renewal options. The MOST RECENT document's dates take precedence over earlier documents. If an amendment extends the lease term, use the AMENDED expiration date, not the original. If a commencement letter confirms different dates than the base lease, use the commencement letter dates.

Search specifically for these terms across all documents: expiration, termination, term, renewal, extend, extension, amended term, lease year, commencement.

If the base lease says one date but an amendment says a different date, always use the amendment date and note it came from the amendment."

Also: when fetching chunks for the summary, search specifically for date-related chunks:
- Query chunks WHERE content ILIKE ANY of: '%expir%', '%terminat%', '%commence%', '%renewal%', '%extension%', '%amended term%', '%lease year%', '%term of%'
- Include these chunks IN ADDITION to the regular chunks sent to the AI
- This ensures the date information is always in the context even if the vector search didn't surface it

---

Run npx next build — fix any errors.
Then: git add . && git commit -m "Phase 6: Password email-only, dashboard list view, about page fix, dispute letter, date extraction" && git push

TASKEOF
log "  Created 00-security-ux-fixes.md"

cat > "$PROMPTS_DIR/01-landing-page-redesign.md" << 'TASKEOF'
Read src/components/LandingPage.tsx and src/app/page.tsx completely before making any changes.

## TASK: Landing Page Redesign — Institutional-Caliber, Futuristic, Captivating

Research the best SaaS landing pages of 2025-2026 (Stripe, Linear, Vercel, Arc Browser, Raycast, Clerk, Resend) and apply their design principles. The current page looks like generic AI-generated output. It needs to feel like a $10M+ company built it.

KEEP: the smooth scrolling and gliding animations that already exist. ENHANCE everything else.

---

### DESIGN PRINCIPLES TO FOLLOW:

1. **Typography-first design** (like Stripe/Vercel): The headline IS the visual. No need for hero images when the words are powerful enough. Use large, confident typography with tight letter-spacing.

2. **Intentional whitespace** (like Linear): Every pixel of empty space is deliberate. Sections breathe. Nothing feels cramped or cluttered.

3. **Subtle motion** (like Vercel): Elements animate in as the user scrolls — fade up, subtle parallax, staggered reveals. Nothing flashy or bouncy. Refined, smooth, purposeful.

4. **Dark mode sophistication** (like Raycast/Arc): Deep blacks, precise borders, glass effects done sparingly. Emerald accents used surgically, not splashed everywhere.

5. **Trust through simplicity**: The fewer elements on screen, the more premium it feels. Every word earns its place.

---

### COMPLETE REDESIGN OF LandingPage.tsx:

**NAVBAR (sticky, transforms on scroll):**
- Before scroll: transparent background, logo + nav links
- After scroll: bg-gray-950/80 backdrop-blur-xl border-b border-white/[0.04]
- Left: PV logo icon + "Provelo" (font-semibold text-lg tracking-tight)
- Center: Features, About, Pricing (text-sm text-gray-400 hover:text-white transition-colors)
- Right: "Sign in" (text-sm text-gray-400) + "Start 14-Day Trial" (bg-emerald-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-emerald-500)
- Mobile: hamburger menu
- Height: 64px, items-center

**HERO SECTION (100vh minus navbar):**
- Center-aligned content, vertically centered in the viewport
- Small pill badge above headline: "Commercial Lease Intelligence" — bg-white/[0.05] border border-white/[0.08] rounded-full px-4 py-1.5 text-xs text-emerald-400 tracking-wider uppercase
- Headline: "Understand your lease." — ONE powerful line
  - text-6xl md:text-7xl lg:text-8xl font-bold tracking-tighter text-white
  - Second line below in text-gray-400: "Protect your business."
  - The contrast between white and gray creates visual hierarchy
- Subheadline (below, after slight gap): "AI-powered lease intelligence that reads your entire lease, scores your risk across 20 clauses, and catches billing errors — in minutes, not months."
  - text-lg md:text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed
- Two CTAs centered below:
  - "Start 14-Day Trial" — bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-3.5 rounded-xl text-base font-medium
  - "See how it works" — text-gray-400 hover:text-white px-6 py-3.5 text-base, with a ChevronDown icon that gently bounces
- Below CTAs: "No credit card for 14 days. Cancel anytime." — text-sm text-gray-600
- Subtle background: radial gradient from emerald-950/10 at center, fading to transparent. Optional: very subtle grid pattern (like Stripe's dot grid) using CSS background-image with tiny dots at 32px intervals, opacity 0.03

**SOCIAL PROOF BAR (subtle, below hero):**
- A thin section: "Trusted by commercial tenants managing retail, office, and industrial spaces"
- text-sm text-gray-500 text-center
- Below: a row of 3-4 trust indicators (not logos since we don't have client logos yet):
  - "Enterprise-grade security" with Lock icon
  - "SOC 2 architecture" with Shield icon  
  - "256-bit encryption" with Key icon
- Each: text-xs text-gray-500, subtle, understated

**FEATURES SECTION:**
- Section heading: "Everything you need." in text-4xl font-bold text-white, left-aligned
- Subheading: "One platform for lease intelligence, risk analysis, and cost recovery." text-lg text-gray-400
- STAGGERED CARD LAYOUT (not a boring grid):
  - Use a bento-grid style layout — cards of different sizes arranged artfully
  - Large card (spans 2 columns): AI Chat — "Ask your lease anything"
    - Show a mock chat bubble exchange (dark bg, emerald user bubble, gray assistant bubble with a short lease answer including an article citation)
    - Not a screenshot — build it as styled HTML elements
  - Medium card: Risk Scoring — "Score every clause"
    - Show a mini risk gauge (0-100) with 3 colored clause dots
  - Medium card: CAM Audit — "Catch billing errors"  
    - Show a mini finding card: "Pro-rata share error: $4,200 overcharge detected"
  - Small card: Critical Dates — "Never miss a deadline"
    - Show a mini calendar with colored dots
  - Small card: Lease Comparison — "Track every change"
    - Show two columns with a green/red diff indicator
  - Small card: Portfolio Analytics — "See the big picture"
    - Show a mini bar chart

Card styling:
- bg-white/[0.02] border border-white/[0.06] rounded-2xl overflow-hidden
- Each card has: header area (p-6, icon + title + description) and visual area (mock UI element)
- Hover: border-white/[0.1] transition-all duration-300, subtle translateY(-2px)
- Cards fade in and slide up as they scroll into view (Intersection Observer + CSS)

**HOW IT WORKS SECTION:**
- Three steps, horizontal on desktop, vertical on mobile
- Each step connected by a thin line (border-dashed border-white/[0.06])
- Step 1: "Upload" — Upload icon in emerald circle, "Drop your lease PDF" below, brief description
- Step 2: "Analyze" — Brain/Sparkles icon, "AI reads every clause", brief description  
- Step 3: "Act" — Zap icon, "Get intelligence and recommendations", brief description
- Numbers: large "01" "02" "03" in text-6xl font-bold text-white/[0.03] positioned behind the content (watermark style)
- Fade in on scroll

**FINAL CTA SECTION:**
- Full-width section with subtle emerald glow
- "Ready to understand your lease?" — text-4xl font-bold text-white text-center
- "Join commercial tenants who save thousands by knowing their rights." — text-lg text-gray-400
- Large "Start 14-Day Trial" button
- Below: "14-day free trial. No commitment. Cancel anytime."

**FOOTER:**
- Four columns: Product (Features, Pricing, Security), Company (About, Contact), Legal (Privacy, Terms), Connect (Twitter, LinkedIn)
- Bottom row: "2026 Provelo. Commercial Lease Intelligence." + small PV logo
- Muted colors: text-gray-500, links hover to text-gray-300
- border-t border-white/[0.04]

---

### ANIMATIONS (CSS only, no heavy libraries):

All scroll animations use Intersection Observer:
```typescript
useEffect(() => {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animate-in')
        }
      })
    },
    { threshold: 0.1 }
  )
  document.querySelectorAll('.scroll-animate').forEach(el => observer.observe(el))
  return () => observer.disconnect()
}, [])
```

CSS classes:
```css
.scroll-animate {
  opacity: 0;
  transform: translateY(20px);
  transition: opacity 0.6s ease, transform 0.6s ease;
}
.scroll-animate.animate-in {
  opacity: 1;
  transform: translateY(0);
}
```

Stagger: add transition-delay inline (style={{ transitionDelay: '100ms' }}) for sequential elements.

Hero text: fade in from bottom on page load (not scroll-triggered — immediate on mount with 200ms delay).

---

### RESPONSIVE:
- Mobile: text scales down (hero text-4xl), cards stack to single column, nav becomes hamburger
- Tablet: hero text-5xl, cards 2-column
- All touch targets 44px minimum

---

### PERFORMANCE:
- No images to load — everything is CSS/SVG/HTML
- No animation libraries — pure CSS transitions
- Page should feel instant

---

Run npx next build — fix any errors.
Then: git add . && git commit -m "Phase 6: Landing page redesign - institutional caliber" && git push

TASKEOF
log "  Created 01-landing-page-redesign.md"

cat > "$PROMPTS_DIR/02-final-integration.md" << 'TASKEOF'
Read the entire src/ directory.

## TASK: Final Integration Pass — Verify Everything, Fix Conflicts

### STEP 1: BUILD
Run npx next build. Fix ALL errors.

### STEP 2: VERIFY NAVIGATION
Check all routes render:
- / (landing page with new design)
- /about
- /pricing
- /login (with confirm password, duplicate email error)
- /dashboard (with list/grid toggle)
- /portfolio
- /location/[id] (all tabs, floating PDF viewer)
- /chat (floating PDF persists)
- /settings (password change is email-only, no in-app form)
- /admin (super_admin only)

### STEP 3: VERIFY FEATURES
1. Dashboard list view toggle works
2. Settings only shows "Reset Password via Email" button, no change password form
3. About page has no dark gradient bars between sections
4. CAM audit shows "Generate Dispute Letter" when violations found
5. Floating PDF viewer resizes from all edges
6. Floating PDF stays visible on Chat tab
7. Landing page looks professional with scroll animations
8. Pricing page shows 3 tiers with "Start 14-Day Trial"
9. All "Start Free" text is "Start 14-Day Trial"

### STEP 4: CONSISTENCY
- All cards: bg-white/[0.03] border border-white/[0.06] rounded-xl
- All primary buttons: bg-emerald-600 hover:bg-emerald-500 (no gradients)
- Tab bar: underline style, no dark band
- Sidebar: expand/collapse toggle visible

### STEP 5: CLEAN UP
- Remove unused imports
- Remove commented-out code
- Remove any pm-dashboard remnants
- Fix any TypeScript errors: npx tsc --noEmit

### STEP 6: FINAL BUILD
npx next build must pass with ZERO errors.
git add . && git commit -m "Phase 6 complete: all verified" && git push

TASKEOF
log "  Created 02-final-integration.md"

log ""
log "All 3 prompt files created"
log ""
log "================================================================"
log "EXECUTING TASKS..."
log "================================================================"

echo "Phase 6 started at $(timestamp)" > "$STATUS_FILE"
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
  log "TASK $TOTAL/3: $task_name"

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
log "PHASE 6 COMPLETE"
log "================================================================"
log "Total: $TOTAL | Pass: $PASSED | Fail: $FAILED | Skip: $SKIPPED"
log "Status: $STATUS_FILE"
log "================================================================"

echo "========================================" >> "$STATUS_FILE"
echo "Completed at $(timestamp)" >> "$STATUS_FILE"
echo "TOTAL=$TOTAL PASS=$PASSED FAIL=$FAILED SKIP=$SKIPPED" >> "$STATUS_FILE"
