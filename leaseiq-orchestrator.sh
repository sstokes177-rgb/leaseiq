#!/bin/bash
# ============================================================================
# LeaseIQ Autonomous Build Orchestrator
# ============================================================================
# Two-phase system:
#   Phase 1 (PLAN)  — Reads codebase, generates detailed task prompts
#   Phase 2 (BUILD) — Executes each prompt in a fresh Claude Code session
#
# Usage:
#   chmod +x leaseiq-orchestrator.sh
#   ./leaseiq-orchestrator.sh plan    # Generate task prompts
#   ./leaseiq-orchestrator.sh build   # Execute all task prompts
#   ./leaseiq-orchestrator.sh all     # Plan then build (overnight mode)
# ============================================================================

set -euo pipefail

PROJECT_DIR="/c/Users/sydne/Desktop/Coding APP/leaseiq"
PROMPTS_DIR="$PROJECT_DIR/.orchestrator/prompts"
LOGS_DIR="$PROJECT_DIR/.orchestrator/logs"
STATUS_FILE="$PROJECT_DIR/.orchestrator/status.log"
TIMEOUT_SECONDS=2700  # 45 minutes per task
MAX_TURNS=75

# Colors for terminal output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

timestamp() { date "+%Y-%m-%d %H:%M:%S"; }

log() { echo -e "${CYAN}[$(timestamp)]${NC} $1"; }
log_pass() { echo -e "${GREEN}[$(timestamp)] ✅ PASS${NC} — $1"; }
log_fail() { echo -e "${RED}[$(timestamp)] ❌ FAIL${NC} — $1"; }
log_skip() { echo -e "${YELLOW}[$(timestamp)] ⏭️  SKIP${NC} — $1"; }

# ============================================================================
# PHASE 1: PLANNER — Generate task prompt files
# ============================================================================
run_plan() {
  log "═══════════════════════════════════════════════════"
  log "PHASE 1: PLANNING — Generating task prompts"
  log "═══════════════════════════════════════════════════"

  mkdir -p "$PROMPTS_DIR"
  mkdir -p "$LOGS_DIR"

  # Clear old prompts
  rm -f "$PROMPTS_DIR"/*.md

  cd "$PROJECT_DIR"

  # Unset API key so Claude Code uses subscription
  unset ANTHROPIC_API_KEY 2>/dev/null || true

  log "Generating task prompts via Claude Code planner..."

  cat <<'PLANNER_PROMPT' | timeout $TIMEOUT_SECONDS claude -p --dangerously-skip-permissions --max-turns 30 2>&1 | tee "$LOGS_DIR/planner.log"
You are a PLANNER agent for the LeaseIQ project. Your ONLY job is to generate detailed task prompt files. Do NOT implement anything yourself.

RULES FOR PROMPT GENERATION:
- Each prompt must be 300-600 lines of detailed instructions
- Each prompt must be a standalone .md file that a fresh Claude Code agent can execute without any other context
- Each prompt MUST start with: "Read the entire src/ directory before making any changes."
- Each prompt MUST end with: "Run npx next build to verify. Fix any errors."
- NEVER include instructions to use Playwright, Puppeteer, Cypress, or any browser automation
- NEVER include instructions to run npm run dev (it blocks forever)
- Each prompt should create any needed database tables using the Supabase admin client in code (not manual SQL)
- Each prompt must be self-contained — assume the agent knows NOTHING about previous tasks
- Include exact file paths, function signatures, component structures, and API route patterns
- Include the exact styling rules: dark theme (#1a1d23 to #12141a gradient), emerald accents (#10b981), Plus Jakarta Sans font, frosted glass cards (backdrop-blur, bg-white/5)

FIRST: Read the entire src/ directory, package.json, CLAUDE.md, and understand what exists. Then look at what's already built vs what's missing.

EXISTING (already built — do NOT rebuild):
- Next.js 15 app with TypeScript, Tailwind, Supabase
- Landing page, auth (sign up/sign in), onboarding
- Multi-location support (stores table)
- PDF upload, text extraction, chunking, embedding (pgvector)
- RAG chat with hybrid search (vector + keyword) and citations
- Lease summary auto-generation (may have persistence bugs)
- Obligation matrix (may have generation bugs)
- Critical dates (basic, needs color coding fixes)
- Document mismatch detection
- Dark theme UI with emerald accents
- Neutral AI tone (no strategic advice)

GENERATE THESE TASK PROMPTS (one .md file per task, saved to .orchestrator/prompts/):

Write each file using: cat > .orchestrator/prompts/XX-task-name.md << 'EOF' ... EOF

00-fix-bugs.md — Fix all existing bugs:
  - Chat history not saving/loading properly
  - Lease summary disappearing on navigation (must persist in DB)
  - Obligation matrix "upload documents first" error when docs exist
  - Cross-location data leak (chat returning wrong location's data — store_id filter must be strict, NEVER fall back to tenant-wide search when store_id is provided)
  - Citation excerpts starting/ending mid-word (clean trim to word boundaries)
  - Chat text streaming appearing glitchy (smooth rendering)
  - Dashboard search bar and filters not working
  - Document preview not functioning
  - Asset class not being auto-detected from lease

01-cam-analyzer.md — CAM Charge Analyzer:
  - API route, chunk search for CAM keywords, Claude extraction
  - Store in cam_analysis table (create via admin client)
  - Display as info card on location detail page
  - CAM objection window countdown

02-cam-reconciliation.md — CAM Reconciliation Assistant:
  - Upload CAM statement PDF, extract text
  - Compare against lease CAM provisions
  - Flag overcharges with amounts and reasons
  - Display results table with potential savings

03-percentage-rent.md — Percentage Rent Tracker:
  - Extract breakpoint from lease
  - Monthly sales input form
  - Progress bar: sales vs breakpoint
  - percentage_rent_entries table

04-occupancy-cost.md — Total Occupancy Cost Calculator:
  - Pull from lease summary + CAM analysis
  - Breakdown card: base rent + CAM + insurance + taxes
  - Per-sqft calculation
  - Manual override inputs

05-rent-escalation.md — Rent Escalation Timeline:
  - Extract schedule from lease
  - Visual timeline component
  - Highlight current period

06-monitors.md — Co-tenancy + Exclusive Use Monitors:
  - Search lease for relevant clauses
  - Display as info cards with article citations
  - "Not found" state if no clause exists

07-critical-dates-enhanced.md — Enhanced Critical Dates:
  - Consolidate all dates
  - Red/yellow/green/grey color coding
  - Countdown displays
  - Actionable guidance per date

08-profile-settings.md — Profile Settings Page:
  - /settings route
  - Edit name, email, company, language, notifications
  - Dark theme styling

09-team-workspace.md — Team/Workspace Management:
  - Invite members by email
  - Roles: Admin, Member, Viewer
  - team_invitations table
  - "$15/month per additional member" note

10-pm-dashboard.md — Property Manager Admin:
  - PM role in onboarding
  - PM dashboard: properties, tenant adoption
  - Tenant invitation system
  - PM cannot see chat history

11-spanish-support.md — Spanish Language:
  - Language toggle in settings + onboarding
  - Translate all UI labels
  - AI responds in Spanish when selected

12-exports.md — Export Features:
  - Download lease summary as PDF
  - Download chat history as PDF
  - Download obligation matrix as PDF
  - Use jspdf or html2canvas

13-mobile-responsive.md — Mobile Responsive:
  - Test every page at 375px
  - Fix landing, dashboard, location detail, chat, upload, settings
  - Hamburger nav menu
  - Chat input fixed at bottom

14-frontend-audit.md — Frontend Audit:
  - Every page loads without errors
  - All buttons/links/forms work
  - Visual consistency check
  - Text readability check
  - Fix everything found

15-backend-audit.md — Backend + Security Audit:
  - All API routes have auth checks
  - All queries filter by tenant_id
  - RLS policies on all tables
  - No API keys in frontend code
  - File upload validation
  - Remove console.log statements
  - Run npx tsc --noEmit
  - Fix everything found

16-rebrand.md — Rebrand from LeaseIQ to new name:
  - Replace all instances of "LeaseIQ" with the new brand name throughout the codebase
  - Update: landing page, navbar, CLAUDE.md, package.json name field, page titles, meta tags, footer, legal disclaimer, onboarding text, chat placeholder text, error messages
  - Update the logo/icon initials in the header
  - Keep the same color scheme and design
  - The new name is: CLAUSEIQ (if domain is taken, use TENORA)
  - Do NOT change any functionality — purely cosmetic rebrand

GENERATE ALL 17 PROMPT FILES NOW. Each one must be detailed enough that a fresh agent with zero context can execute it perfectly.
PLANNER_PROMPT

  # Count generated prompts
  PROMPT_COUNT=$(ls "$PROMPTS_DIR"/*.md 2>/dev/null | wc -l)
  log "Generated $PROMPT_COUNT task prompts in $PROMPTS_DIR"

  if [ "$PROMPT_COUNT" -eq 0 ]; then
    log_fail "No prompts were generated. Check $LOGS_DIR/planner.log"
    exit 1
  fi

  log "Planning complete. Run './leaseiq-orchestrator.sh build' to execute."
}

# ============================================================================
# PHASE 2: BUILDER — Execute each task prompt in a fresh session
# ============================================================================
run_build() {
  log "═══════════════════════════════════════════════════"
  log "PHASE 2: BUILDING — Executing task prompts"
  log "═══════════════════════════════════════════════════"

  cd "$PROJECT_DIR"
  unset ANTHROPIC_API_KEY 2>/dev/null || true

  # Initialize status file
  echo "Build started at $(timestamp)" > "$STATUS_FILE"
  echo "========================================" >> "$STATUS_FILE"

  TOTAL=0
  PASSED=0
  FAILED=0
  SKIPPED=0

  # Loop through prompts in alphabetical order
  for prompt_file in "$PROMPTS_DIR"/*.md; do
    [ -f "$prompt_file" ] || continue

    TOTAL=$((TOTAL + 1))
    task_name=$(basename "$prompt_file" .md)
    log_file="$LOGS_DIR/${task_name}.log"

    log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    log "TASK $TOTAL: $task_name"
    log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    # Run the prompt in a fresh Claude Code session with timeout
    set +e
    timeout $TIMEOUT_SECONDS bash -c "cat '$prompt_file' | claude -p --dangerously-skip-permissions --max-turns $MAX_TURNS" \
      > "$log_file" 2>&1
    exit_code=$?
    set -e

    if [ $exit_code -eq 124 ]; then
      log_skip "$task_name — TIMED OUT after $((TIMEOUT_SECONDS / 60)) minutes"
      echo "[$task_name] TIMEOUT" >> "$STATUS_FILE"
      SKIPPED=$((SKIPPED + 1))
      # Commit whatever was done before timeout
      git add -A 2>/dev/null || true
      git commit -m "TIMEOUT: $task_name (partial)" --allow-empty 2>/dev/null || true
      git push 2>/dev/null || true
      continue
    fi

    # Run build check
    log "Running build check for $task_name..."
    set +e
    npx next build > "$LOGS_DIR/${task_name}-build.log" 2>&1
    build_exit=$?
    set -e

    if [ $build_exit -eq 0 ]; then
      log_pass "$task_name"
      echo "[$task_name] PASS" >> "$STATUS_FILE"
      PASSED=$((PASSED + 1))

      # Commit and push
      git add -A
      git commit -m "PASS: $task_name" 2>/dev/null || true
      git push 2>/dev/null || true
    else
      log_fail "$task_name — Build failed (see $LOGS_DIR/${task_name}-build.log)"
      echo "[$task_name] FAIL — build errors" >> "$STATUS_FILE"
      FAILED=$((FAILED + 1))

      # Try to fix build errors in a quick session
      log "Attempting auto-fix for $task_name..."
      set +e
      echo "The last task caused build errors. Read the build output below and fix all TypeScript and compilation errors. Do NOT add new features — just fix the errors so npx next build passes.

Build errors:
$(cat "$LOGS_DIR/${task_name}-build.log" | tail -100)" | \
        timeout 600 claude -p --dangerously-skip-permissions --max-turns 20 \
        > "$LOGS_DIR/${task_name}-fix.log" 2>&1

      # Re-check build
      npx next build > "$LOGS_DIR/${task_name}-rebuild.log" 2>&1
      rebuild_exit=$?
      set -e

      if [ $rebuild_exit -eq 0 ]; then
        log_pass "$task_name (fixed on retry)"
        echo "[$task_name] PASS (after fix)" >> "$STATUS_FILE"
        FAILED=$((FAILED - 1))
        PASSED=$((PASSED + 1))
      fi

      git add -A
      git commit -m "FAIL-FIX: $task_name" 2>/dev/null || true
      git push 2>/dev/null || true
    fi

    log ""
  done

  # Final summary
  log "═══════════════════════════════════════════════════"
  log "BUILD COMPLETE"
  log "═══════════════════════════════════════════════════"
  log "Total tasks:  $TOTAL"
  log_pass "Passed: $PASSED"
  log_fail "Failed: $FAILED"
  log_skip "Skipped/Timeout: $SKIPPED"
  log "Status file: $STATUS_FILE"
  log "Logs: $LOGS_DIR/"

  echo "========================================" >> "$STATUS_FILE"
  echo "Build completed at $(timestamp)" >> "$STATUS_FILE"
  echo "TOTAL=$TOTAL PASS=$PASSED FAIL=$FAILED SKIP=$SKIPPED" >> "$STATUS_FILE"
}

# ============================================================================
# MAIN — Parse command
# ============================================================================
case "${1:-help}" in
  plan)
    run_plan
    ;;
  build)
    run_build
    ;;
  all)
    run_plan
    run_build
    ;;
  *)
    echo "Usage: ./leaseiq-orchestrator.sh [plan|build|all]"
    echo ""
    echo "  plan  — Read codebase and generate task prompt files"
    echo "  build — Execute all generated task prompts"
    echo "  all   — Plan then build (overnight mode)"
    exit 1
    ;;
esac
