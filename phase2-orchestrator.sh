#!/bin/bash
# ============================================================================
# Provelo Phase 2 Orchestrator — 12 Tasks
# ============================================================================
# Fixes 5 critical bugs + deepens competitive features from research docs
# Each task runs in a fresh Claude Code session (headless pipe mode)
#
# Usage:
#   chmod +x phase2-orchestrator.sh
#   ./phase2-orchestrator.sh
# ============================================================================

set -euo pipefail

PROJECT_DIR="/c/Users/sydne/Desktop/Coding APP/leaseiq"
PROMPTS_DIR="$PROJECT_DIR/.orchestrator/prompts-phase2"
LOGS_DIR="$PROJECT_DIR/.orchestrator/logs-phase2"
STATUS_FILE="$PROJECT_DIR/.orchestrator/status-phase2.log"
TIMEOUT_SECONDS=2700   # 45 minutes per task
MAX_TURNS=75

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

timestamp() { date "+%Y-%m-%d %H:%M:%S"; }
log() { echo -e "${CYAN}[$(timestamp)]${NC} $1"; }
log_pass() { echo -e "${GREEN}[$(timestamp)] ✓ PASS${NC} — $1"; }
log_fail() { echo -e "${RED}[$(timestamp)] ✗ FAIL${NC} — $1"; }
log_skip() { echo -e "${YELLOW}[$(timestamp)] ⏭ SKIP${NC} — $1"; }

cd "$PROJECT_DIR"
unset ANTHROPIC_API_KEY 2>/dev/null || true
mkdir -p "$PROMPTS_DIR" "$LOGS_DIR"

log "================================================================"
log "PROVELO PHASE 2 ORCHESTRATOR — 12 TASKS"
log "================================================================"
log "Project:  $PROJECT_DIR"
log "Prompts:  $PROMPTS_DIR"
log "Logs:     $LOGS_DIR"
log "Timeout:  $((TIMEOUT_SECONDS / 60)) minutes per task"
log "================================================================"
log ""
log "PHASE 1: Writing prompt files..."


cat > "$PROMPTS_DIR/00-critical-bug-fixes.md" << 'TASKEOF'
Read the entire src/ directory before making any changes. Pay special attention to:
- All components related to the chat interface, article references, citation panels
- All components related to risk scoring
- All components related to obligation matrix
- The Supabase schema for conversations, messages, and any chat-related tables
- All API routes

## TASK: Fix 5 critical bugs reported during testing

---

### BUG 1: CITATION PANEL TEXT IS LEFT-ALIGNED — MUST BE CENTERED/JUSTIFIED

When clicking an article reference in chat and viewing the extracted text in the right panel, the text is left-aligned (ragged right edge) like raw code output. This looks unprofessional.

**What to fix:**
Find every component that renders extracted lease text in the side panel (CitationPanel, LeasePanel, ArticlePanel, or whatever it is named). Update the CSS:

```css
text-align: justify;
line-height: 1.7;
font-size: 16px;
padding: 24px 28px;
max-width: 72ch;
margin: 0 auto;
font-family: 'Inter', 'Plus Jakarta Sans', -apple-system, sans-serif;
```

Also ensure:
- Paragraph breaks from the original document are preserved — do NOT collapse into one block
- If the text contains article/section headers (like "Article 10 - Assignment"), make them bold, slightly larger (18px), with margin-top: 24px
- Add a subtle top border or divider between sections
- Check EVERY location (Whole Foods, ABC Logistics, Gate, and any others) to confirm the fix applies universally — the bug may exist in a shared component or may be location-specific due to different rendering paths

**Check all locations systematically.** Search the codebase for any component that renders extracted text. There may be multiple code paths — a panel for chat citations, a panel for document viewer, etc. Fix ALL of them.

---

### BUG 2: IN-APP CHAT SAVING — THIS IS THE 3RD TIME THIS HAS BEEN REQUESTED

The chat conversations are NOT being saved inside the app. When the user navigates away and comes back, the chat is gone. There is only a "Save chat as PDF" button in the top right. The user needs persistent in-app chat history that shows up in the left sidebar under "New Chat".

**This is the #1 priority fix. It has been requested 3 times and must work.**

**Database requirements:**
First, check if the conversations and messages tables already exist in Supabase. If they do, verify the schema matches what's needed below. If they don't exist, create them.

```sql
-- Check and create if not exists
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  title TEXT DEFAULT 'New conversation',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  citations JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_conversations_tenant_store ON conversations(tenant_id, store_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);

-- RLS
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Tenant sees own conversations" ON conversations
  FOR ALL USING (tenant_id = auth.uid());
CREATE POLICY IF NOT EXISTS "Tenant sees own messages" ON messages
  FOR ALL USING (conversation_id IN (
    SELECT id FROM conversations WHERE tenant_id = auth.uid()
  ));
```

**Frontend implementation — step by step:**

1. Find the chat component (likely in the location detail page or a dedicated chat page).

2. When the user sends their FIRST message in a new chat:
   a. Immediately create a new conversation record in Supabase: `{ tenant_id, store_id, title: 'New conversation' }`
   b. Save the user message to the messages table with the new conversation_id
   c. Store the conversation_id in React state so subsequent messages use it
   d. After the AI responds, save the AI response to the messages table
   e. Auto-generate a title: call the Claude API with "Generate a 4-6 word title for this conversation. The user asked: [first message]. Return ONLY the title, nothing else."
   f. Update the conversation record with the generated title

3. For subsequent messages in the SAME conversation:
   a. Save each user message to the messages table with the existing conversation_id
   b. After AI responds, save the AI response to the messages table
   c. Update the conversation's updated_at timestamp

4. Chat history sidebar (LEFT side of chat interface):
   a. Shows all conversations for the CURRENT store/location only
   b. Ordered by most recent (updated_at DESC)
   c. Each entry shows: title, relative date ("2h ago", "Yesterday", "Mar 28")
   d. Clicking an entry loads that conversation's messages into the chat area
   e. Currently active conversation is highlighted with an emerald left border
   f. "New Chat" button at the top starts a fresh conversation (clears chat, resets conversation_id to null)
   g. The sidebar should auto-refresh when a new conversation is created

5. When user navigates away and comes back:
   a. Load all past conversations from the database for this location
   b. If there was an active conversation, it should still be loaded
   c. NO data should EVER be lost

6. API routes needed (create if they don't exist):
   - POST /api/conversations — create a new conversation
   - GET /api/conversations?store_id=X — list conversations for a store
   - PUT /api/conversations/[id] — update title
   - POST /api/messages — save a message
   - GET /api/messages?conversation_id=X — load messages for a conversation

**Test this thoroughly.** After implementing:
- Send a message → navigate away → come back → conversation should be in the sidebar
- Click the conversation → messages should load
- Start a new chat → send a message → it should appear as a second conversation in the sidebar
- The title should auto-generate after the first exchange

---

### BUG 3: LEASE RISK SCORE FAILS FOR ALL LOCATIONS

Every location shows "Risk analysis failed. Please try again." when trying to view the risk score.

**Debugging steps:**
1. Find the risk score API route (likely /api/risk-score/route.ts or similar)
2. Check for these common failure causes:
   a. The API route might be calling Claude/OpenAI with chunks that are too large — token limit exceeded
   b. The Supabase query might be failing silently (no chunks found for the store)
   c. The API key might not be configured in .env.local
   d. The response parsing might fail if Claude returns unexpected format
   e. The store_id might not be passed correctly from the frontend

3. Add proper error handling and logging:
   ```typescript
   try {
     // ... existing logic
   } catch (error) {
     console.error('Risk score analysis failed:', error);
     return NextResponse.json(
       { error: 'Risk analysis failed', details: error instanceof Error ? error.message : 'Unknown error' },
       { status: 500 }
     );
   }
   ```

4. Fix the root cause. The most likely issue is:
   - Chunks are too large: limit to the most relevant 20-30 chunks, or summarize them before sending
   - API timeout: increase the timeout or use streaming
   - Missing env variable: check that ANTHROPIC_API_KEY or OPENAI_API_KEY exists in .env.local

5. Make the risk score more resilient:
   - If analysis partially fails, show what succeeded
   - Add a loading state with progress indication
   - Cache results so re-analyzing doesn't always hit the API
   - If no chunks are found, show a helpful message: "Upload your lease documents to enable risk analysis"

---

### BUG 4: OBLIGATION MATRIX ONLY WORKS FOR SOME LOCATIONS

The Obligation Matrix works for Whole Foods and ABC Logistics but NOT for Gate. 

**Debugging steps:**
1. Find the obligation matrix component and its data source
2. Check what's different about the Gate location:
   a. Does Gate have uploaded documents? Check the documents table for Gate's store_id
   b. Are there document_chunks for Gate? Maybe the PDF extraction failed
   c. Is the obligation matrix generation API returning an error for Gate specifically?

3. If Gate legitimately lacks lease data (no documents uploaded, or the lease doesn't contain obligation-type clauses):
   - Show a clear, helpful message: "No obligation data could be extracted from the uploaded documents for this location. This may be because: (1) No lease documents have been uploaded yet, (2) The uploaded documents don't contain standard lease obligation clauses. Upload your complete lease to enable this feature."
   - Do NOT show a generic error or a blank space — explain WHY

4. If Gate DOES have documents but the matrix fails to generate:
   - Fix the extraction/generation logic
   - The issue might be that Gate's lease uses different terminology or structure
   - Make the obligation extraction prompt more flexible to handle different lease formats

---

### BUG 5: SOME ARTICLE REFERENCES IN CHAT ARE NOT CLICKABLE

When the AI responds with article references (like "Per Article 10.1(b)" or "Section 5.2"), some are clickable and some are not. ALL article references must be clickable.

**Root cause:** The regex that detects and wraps article references in the chat response is not catching all patterns.

**Fix the regex to match ALL of these patterns:**
```javascript
const articleRegex = /(?:Per |Under |See |In |Pursuant to )?(?:Article|Section|Clause|Paragraph|Exhibit|Schedule|Appendix|Addendum|Amendment)\s+(\d+(?:\.\d+)*(?:\([a-zA-Z0-9]+\))*)/gi;
```

This should match:
- "Article 10"
- "Article 10.1"
- "Article 10.1(b)"
- "Section 5.2"
- "Per Article 10.1(b)"
- "Under Section 3"
- "Clause 7.4"
- "Exhibit A"
- "Exhibit B-1"
- "Amendment 1"
- "Schedule 1"
- "Appendix C"

**Also handle these edge cases:**
- References at the start of a sentence vs middle
- References followed by punctuation (comma, period, semicolon)
- References in parentheses
- Multiple references in one sentence: "Articles 5 and 10" or "Sections 3.1, 3.2, and 3.3"

**For each matched reference:**
1. Wrap it in a clickable component (ArticleRef or similar)
2. On click, open the citation panel with the correct article content
3. Parse the article/section number from the reference text
4. Query document_chunks for content matching that article/section
5. Display the matching content in the panel

**Test across all locations** to make sure every article reference in every chat response is clickable.

---

## FINAL STEPS

After all 5 fixes:
1. Run: npx next build — fix ALL errors
2. Run: git add . && git commit -m "Phase 2 Task 00: Fix 5 critical bugs - chat saving, risk score, obligation matrix, article refs, text alignment" && git push

TASKEOF
log "  ✓ Created 00-critical-bug-fixes.md"

cat > "$PROMPTS_DIR/01-deep-risk-scoring.md" << 'TASKEOF'
Read the entire src/ directory before making any changes. Focus on:
- The risk score API route and component
- The lease_risk_scores database table
- How document chunks are retrieved and sent to the AI

## TASK: Deep Enhancement of Lease Risk Scoring System (LIFT-style)

The risk scoring system from Phase 1 is failing ("Risk analysis failed"). This task fixes it AND makes it production-grade with full competitive parity to LeaseCake's LIFT (Lease Intelligence and Favorability Tracker).

---

### PART 1: FIX THE EXISTING RISK SCORE API

The risk score fails for all locations. Debug and fix:

1. Open the risk score API route. Add console.error logging at every step.
2. Common failure causes to check:
   - Token limit: if sending too many chunks, the API call exceeds the token limit. FIX: select only the 25 most relevant chunks. Use a pre-filter: query chunks WHERE content ILIKE ANY of these keywords: '%assign%', '%sublet%', '%restrict%', '%exclusiv%', '%radius%', '%cam%', '%maintenance%', '%repair%', '%escal%', '%renew%', '%terminat%', '%default%', '%insurance%', '%audit%', '%force majeure%', '%co-tenancy%', '%relocat%', '%percent%rent%'
   - API key missing: verify process.env.ANTHROPIC_API_KEY exists
   - Response parsing: the AI might return markdown or extra text. Use a strict JSON extraction: find the first '{' and last '}' in the response, parse that substring
   - Timeout: set a 120-second timeout on the fetch call

3. Make the prompt more robust. The system prompt should be:

```
You are a commercial lease risk analyst. Analyze the following lease text and score each clause category.

RESPOND WITH ONLY A JSON OBJECT. No markdown, no backticks, no explanation outside the JSON.

JSON format:
{
  "overall_score": <number 0-100, where 100 is best for tenant>,
  "clauses": [
    {
      "category": "<category name>",
      "clause_name": "<specific clause>",
      "severity": "red" | "yellow" | "green" | "not_found",
      "summary": "<1-2 sentence explanation>",
      "citation": "<Article/Section reference>",
      "recommendation": "<what tenant should negotiate or do>",
      "score": <number 0-5, where 5 is best for tenant>
    }
  ]
}
```

4. Score these exact categories (20 clauses total):

**EXPANSION BLOCKERS (6 clauses):**
- Exclusivity clause: GREEN if tenant has strong exclusive use rights, YELLOW if limited, RED if none
- Radius restriction: GREEN if no restriction or >10 miles, YELLOW if 3-10 miles, RED if <3 miles
- Use restriction: GREEN if broad permitted use, YELLOW if moderate, RED if narrowly defined
- Co-tenancy provision: GREEN if tenant protected by co-tenancy, YELLOW if weak, RED if none
- Relocation clause: GREEN if landlord cannot relocate, YELLOW if with conditions, RED if unrestricted
- Assignment/subletting: GREEN if freely assignable, YELLOW if with consent, RED if heavily restricted

**FINANCIAL EXPOSURE (7 clauses):**
- Rent escalation: GREEN if fixed <3%/year, YELLOW if CPI-linked, RED if market rate reset
- CAM pass-through scope: GREEN if gross lease, YELLOW if modified gross with caps, RED if NNN unlimited
- Percentage rent: GREEN if none or high breakpoint, YELLOW if moderate, RED if low breakpoint
- CAM cap: GREEN if annual cap exists <5%, YELLOW if cap 5-8%, RED if no cap
- Operating hours: GREEN if flexible, YELLOW if reasonable requirements, RED if rigid
- Insurance requirements: GREEN if standard, YELLOW if above-average, RED if excessive
- Late fee/default: GREEN if standard grace period, YELLOW if short grace, RED if harsh/immediate

**TENANT PROTECTIONS (7 clauses — scored by ABSENCE = RED):**
- Renewal option: GREEN if multiple options at favorable terms, YELLOW if one option, RED if none
- Early termination right: GREEN if exists with reasonable conditions, YELLOW if limited, RED if none
- SNDA protection: GREEN if provided, YELLOW if negotiable, RED if not addressed
- CAM audit right: GREEN if unrestricted audit right, YELLOW if limited window, RED if no right
- Exclusive use: GREEN if strong exclusive, YELLOW if limited, RED if none
- Go-dark right: GREEN if can cease operations, YELLOW if with conditions, RED if must stay open
- Force majeure: GREEN if broad pandemic/disaster protection, YELLOW if limited, RED if none

5. Calculate overall score:
   - Each clause scores 0-5 (0=red/not found, 2=yellow, 5=green)
   - Overall = (sum of all clause scores / max possible score) * 100
   - Round to nearest integer

---

### PART 2: ENHANCED UI — RISK SCORE CARD

Replace the existing risk score display with a production-grade card:

1. **Large circular score indicator** at the top:
   - SVG circle with animated fill based on score
   - 80-100: Emerald green with pulse animation
   - 50-79: Amber/yellow
   - 0-49: Red
   - Score number in the center, large (48px font)
   - Label below: "Tenant Favorability Score" 

2. **Three category sections** below the score, each collapsible:
   - "Expansion Blockers" with count of red/yellow/green
   - "Financial Exposure" with count
   - "Tenant Protections" with count

3. **Each clause within a category:**
   - Left: colored dot (red/yellow/green/gray for not_found)
   - Middle: clause name + 1-line summary
   - Right: article citation (clickable — opens citation panel)
   - Expandable: click to see full recommendation

4. **"Top 3 Negotiation Priorities" section** at the bottom:
   - Auto-generated from the 3 highest-impact red/yellow clauses
   - Each shows: what to negotiate, suggested language, priority level

5. **Action buttons:**
   - "Re-analyze" — regenerate the score
   - "Export Risk Report" — download as PDF
   - "Discuss with AI" — opens chat pre-filled with "What are my biggest lease risks?"

6. **Caching:** Store results in lease_risk_scores table. Show cached results immediately, with "Last analyzed: [date]" and option to re-analyze. Don't hit the API every time the page loads.

---

### PART 3: PORTFOLIO RISK HEATMAP (if portfolio page exists)

On the portfolio/dashboard page, show a risk heatmap:
- Row per location
- Column per clause category
- Cell color = severity (red/yellow/green)
- Hovering a cell shows the summary
- Average LIFT score per location in a final column
- Sort by overall score (lowest first = most attention needed)

---

Run npx next build to verify. Fix ALL errors.
Then: git add . && git commit -m "Phase 2 Task 01: Deep LIFT-style risk scoring with 20 clauses, heatmap, negotiation recs" && git push

TASKEOF
log "  ✓ Created 01-deep-risk-scoring.md"

cat > "$PROMPTS_DIR/02-deep-cam-audit.md" << 'TASKEOF'
Read the entire src/ directory before making any changes.

## TASK: Deep CAM Forensic Audit System — All 14 Detection Rules with Formulas

CAMAudit.io charges $199 per audit. Provelo includes this as a built-in feature — massive competitive advantage. This task ensures the CAM audit is production-grade with all 14 detection rules, exact math formulas, and a professional results display.

---

### PART 1: VERIFY/CREATE THE CAM AUDIT API ROUTE

Location: /api/cam-audit/route.ts (or create it)

**Flow:**
1. Accept: store_id + optional uploaded CAM reconciliation statement (PDF file)
2. Extract text from the CAM statement PDF (use existing PDF extraction)
3. Retrieve the lease's CAM-related provisions from document_chunks (search for chunks containing: CAM, common area, maintenance, operating expenses, pro rata, management fee, insurance, tax, utility, cap, controllable, base year, gross-up)
4. Send BOTH the lease provisions AND the CAM statement text to Claude with the forensic audit prompt
5. Parse results and store in database

**The AI prompt must instruct Claude to check ALL 14 rules:**

```
You are a forensic CAM (Common Area Maintenance) auditor for commercial leases. You have two documents:

LEASE PROVISIONS (what the tenant agreed to):
{lease_cam_chunks}

CAM RECONCILIATION STATEMENT (what the landlord is charging):
{cam_statement_text}

Analyze the statement against the lease using these 14 detection rules. For each rule, determine if there is a violation.

RESPOND WITH ONLY A JSON OBJECT:
{
  "total_potential_overcharge": <number in dollars>,
  "findings": [
    {
      "rule_number": <1-14>,
      "rule_name": "<name>",
      "rule_type": "math" | "classification",
      "status": "violation_found" | "within_limits" | "insufficient_data",
      "estimated_overcharge": <number in dollars, 0 if none>,
      "explanation": "<2-3 sentence explanation with specific numbers>",
      "lease_reference": "<article/section from lease>",
      "statement_reference": "<line item from CAM statement>",
      "formula_used": "<show the math if applicable>",
      "severity": "high" | "medium" | "low"
    }
  ],
  "dispute_recommended": <boolean>,
  "dispute_deadline_note": "<note about audit window from lease>"
}

THE 14 DETECTION RULES:

MATH-BASED RULES (use exact arithmetic):

Rule 1 — Management Fee Overcharge:
- Extract the management fee percentage from the lease (typically 10-15% of CAM)
- Extract the management fee amount from the reconciliation statement
- Calculate: allowed_fee = total_qualifying_expenses * lease_percentage
- If charged_fee > allowed_fee, flag violation
- Estimated overcharge = charged_fee - allowed_fee

Rule 2 — Pro-Rata Share Error:
- Extract tenant's square footage and total building/center square footage from lease
- Calculate: correct_share = tenant_sf / total_sf
- Compare against the pro-rata share used in the reconciliation
- Common trick: excluding anchor tenants from denominator inflates smaller tenants' share
- If reconciliation uses a different share percentage, flag violation
- Estimated overcharge = total_cam * (used_share - correct_share)

Rule 3 — Gross-Up Violation:
- If the building has vacancy, operating expenses should be "grossed up" to what they would be at full occupancy
- Check if the lease requires gross-up adjustment
- If yes, verify the reconciliation properly adjusts for vacancy
- If no gross-up applied when required, or if it was applied incorrectly, flag violation

Rule 4 — CAM Cap Violation:
- Extract the annual CAM increase cap from the lease (e.g., "CAM shall not increase more than 5% per year")
- Extract prior year CAM and current year CAM from the statement
- Calculate: max_allowed = prior_year_cam * (1 + cap_percentage)
- If current_year_cam > max_allowed, flag violation
- Estimated overcharge = current_year_cam - max_allowed

Rule 5 — Base Year Error:
- Extract the base year from the lease
- Verify the reconciliation uses the correct base year for escalation calculations
- If the wrong base year is used, flag violation

Rule 6 — Controllable Expense Cap Overcharge:
- Some leases separate "controllable" from "uncontrollable" expenses with different caps
- Extract controllable expense cap from lease
- Verify controllable expenses in the statement don't exceed the cap
- Flag if they do

Rule 7 — Estimated Payment True-Up Error:
- Verify the math in the reconciliation: actual_cam - estimated_payments_received = amount_due (or credit)
- If the arithmetic doesn't add up, flag violation

CLASSIFICATION RULES (AI-powered analysis):

Rule 8 — Gross Lease Charges:
- If the lease is a gross lease (landlord pays all operating expenses), there should be NO CAM charges
- If the tenant on a gross lease is receiving CAM reconciliation charges, flag as violation

Rule 9 — Excluded Service Charges:
- Extract the list of excluded expenses from the lease (e.g., "Landlord shall not pass through costs of: capital improvements, leasing commissions, landlord's income taxes...")
- Check each line item in the reconciliation against the exclusion list
- If any excluded items appear in the charges, flag violation

Rule 10 — Insurance Overcharge:
- Compare insurance costs in the reconciliation against typical market rates
- Check if the lease specifies insurance requirements or caps
- If charges are significantly above market or above lease terms, flag

Rule 11 — Tax Overallocation:
- Verify property tax allocation method matches the lease
- Check for correct tax year, correct parcel, correct pro-rata share
- Flag if allocation method doesn't match lease terms

Rule 12 — Utility Overcharge:
- Check if utilities are separately metered or allocated
- If allocated, verify the method matches the lease (by square footage, by usage, etc.)
- Flag if allocation method is inconsistent with lease

Rule 13 — Common Area Misclassification:
- Identify any expenses that are NOT truly "common area" costs
- Examples: landlord's office renovation, tenant-specific repairs, non-common areas
- Flag any items that shouldn't be in the CAM pool

Rule 14 — Landlord Overhead Pass-Through:
- Identify any landlord corporate overhead costs that have been passed through
- Examples: landlord's legal fees (not related to the property), corporate salaries, marketing for the landlord's business
- Flag any improper overhead charges
```

---

### PART 2: DATABASE

```sql
CREATE TABLE IF NOT EXISTS cam_audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  statement_file_name TEXT,
  statement_file_url TEXT,
  total_potential_overcharge NUMERIC DEFAULT 0,
  findings JSONB DEFAULT '[]',
  dispute_recommended BOOLEAN DEFAULT false,
  dispute_deadline TIMESTAMPTZ,
  audit_date TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE cam_audits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant sees own audits" ON cam_audits
  FOR ALL USING (tenant_id = auth.uid());
```

---

### PART 3: UI — CAM AUDIT SECTION ON LOCATION PAGE

Add a "CAM Audit" tab or section on the location detail page:

1. **Upload area:** "Upload your annual CAM reconciliation statement"
   - Drag-and-drop zone for PDF
   - Accepts PDF, can also accept Excel/CSV
   - Shows file name after upload

2. **"Run Forensic Audit" button** — emerald gradient, prominent

3. **Loading state:** "Analyzing your CAM charges against 14 detection rules..." with a progress animation

4. **Results display:**
   - **Summary card at top:**
     - Total potential overcharge amount (large, red if > $0)
     - Number of violations found out of 14 rules checked
     - Dispute recommended: Yes/No badge
     - Dispute deadline (if extractable from lease)
   
   - **Findings list:**
     - Grouped by: Violations Found (red), Within Limits (green), Insufficient Data (gray)
     - Each finding card shows:
       - Rule number and name
       - Status badge (red violation / green OK / gray insufficient)
       - Estimated overcharge amount (if violation)
       - Explanation (2-3 sentences)
       - Lease reference (clickable → opens citation panel)
       - "Show Formula" toggle (for math-based rules)
     - Sort violations by estimated overcharge amount (highest first)
   
   - **Action section at bottom:**
     - "Generate Dispute Letter" button — creates a formal letter citing specific violations
     - "Export Audit Report" button — PDF download
     - "Discuss Findings with AI" — opens chat pre-filled with "What should I do about my CAM overcharges?"

5. **Previous audits:** Show a list of past audits with dates and results, so tenants can track over time

---

### PART 4: IF NO CAM STATEMENT IS UPLOADED

If the user hasn't uploaded a CAM statement, still provide value:
1. Show a "CAM Provisions Analysis" based on the lease alone
2. Extract and display: what the lease says about CAM, any caps, excluded items, audit rights, dispute window
3. Show a checklist: "Things to verify when you receive your CAM reconciliation"
4. Prompt: "Upload your annual reconciliation statement to run a full forensic audit"

---

Run npx next build to verify. Fix ALL errors.
Then: git add . && git commit -m "Phase 2 Task 02: Deep CAM forensic audit with 14 detection rules and formulas" && git push

TASKEOF
log "  ✓ Created 02-deep-cam-audit.md"

cat > "$PROMPTS_DIR/03-article-panel-overhaul.md" << 'TASKEOF'
Read the entire src/ directory before making any changes. Focus on:
- ArticleRef component (or whatever renders clickable article references in chat)
- CitationPanel / LeasePanel / side panel component
- The API or Supabase query that fetches chunk text for a given article
- Document chunks table structure

## TASK: Complete Overhaul of Article Citation Panel

The citation panel has multiple issues: articles show the same text, text starts with cut-off words, some articles aren't clickable, and the panel doesn't navigate to the correct PDF page. Fix ALL of these.

---

### PART 1: EACH ARTICLE MUST SHOW ITS OWN CORRECT TEXT

**Current bug:** Clicking "Article 5" and "Article 10" both show the same extracted text. The panel is not filtering by article number.

**Fix strategy:**

1. Find the click handler for article references. It must extract the article/section number:
```typescript
function extractArticleNumber(referenceText: string): string {
  // Match patterns like "Article 10", "Section 5.2", "Article 10.1(b)"
  const match = referenceText.match(/(?:Article|Section|Clause|Exhibit|Amendment|Schedule|Appendix)\s+([\w\d]+(?:\.[\w\d]+)*(?:\([a-zA-Z0-9]+\))*)/i);
  return match ? match[1] : '';
}
```

2. The panel open function must receive this article identifier and query for matching chunks:
```typescript
// Query document_chunks for this specific article
const { data: chunks } = await supabase
  .from('document_chunks')
  .select('content, chunk_index, page_number, document_id')
  .eq('document_id', currentDocumentId)
  .or(`content.ilike.%Article ${articleNum}%,content.ilike.%ARTICLE ${articleNum}%,content.ilike.%Section ${articleNum}%,content.ilike.%SECTION ${articleNum}%`)
  .order('chunk_index', { ascending: true });
```

3. If multiple chunks match (article spans multiple chunks), concatenate them in order.

4. If NO chunks match the exact article number, try a broader search:
   - Search for just the number (e.g., "10.1")
   - Search for variations (e.g., "ARTICLE TEN", "Article X")
   - If still no match, show: "Could not locate Article [X] in the extracted text. Try viewing the original PDF."

---

### PART 2: CLEAN TEXT BOUNDARIES — NO CUT-OFF WORDS

**Current bug:** Text starts with "nee or subtenant if Landlord's consent is required." — a fragment of a word cut during extraction.

**Fix with a text cleaning function:**

```typescript
function cleanExtractedText(text: string): string {
  if (!text) return '';
  
  let cleaned = text.trim();
  
  // Remove leading partial word (text that doesn't start with a capital letter, 
  // article header, or number after whitespace trimming)
  // A partial word looks like: "nee or subtenant..." or "tion of the premises..."
  const leadingFragmentRegex = /^[a-z][a-zA-Z]*\s+/;
  if (leadingFragmentRegex.test(cleaned)) {
    // Find the first sentence boundary (period + space + capital letter)
    const firstSentence = cleaned.match(/\.\s+[A-Z]/);
    if (firstSentence && firstSentence.index !== undefined) {
      cleaned = cleaned.substring(firstSentence.index + 2);
    }
  }
  
  // Remove trailing partial sentence (text that doesn't end with punctuation)
  if (!/[.!?;:]$/.test(cleaned.trim())) {
    const lastSentence = cleaned.match(/.*[.!?;:]/s);
    if (lastSentence) {
      cleaned = lastSentence[0];
    }
  }
  
  // Clean up extra whitespace
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  
  // Restore paragraph breaks (double newlines in original)
  cleaned = cleaned.replace(/\.\s+(?=[A-Z])/g, '.\n\n');
  
  return cleaned;
}
```

Apply this function to ALL text before displaying it in the panel.

---

### PART 3: PANEL DISPLAY — TOGGLE BETWEEN TEXT AND PDF

The panel should have two view modes:

1. **"Extracted Text" tab** (default):
   - Clean, justified text with proper formatting
   - Article/section headers bold and larger
   - Paragraph breaks preserved
   - CSS: text-align: justify, line-height: 1.7, font-size: 16px, padding: 24px

2. **"Original PDF" tab**:
   - Embed the actual PDF using an iframe or PDF.js viewer
   - If the page number is known, navigate to that page: `${pdfUrl}#page=${pageNumber}`
   - To get the PDF URL: create or use an API route that generates a signed Supabase storage URL

3. **Tab buttons at top of panel:**
   - Two large tabs: "Extracted Text" | "Original PDF"
   - Active tab has emerald underline
   - Min 44px height for touch accessibility (45+ users)

4. **Panel header:**
   - Document name
   - Article/Section reference
   - Page number (if known)
   - Close (X) button — min 44px touch target

5. **Panel behavior:**
   - Default width: 40% viewport
   - Resizable with drag handle on left edge
   - When closed and reopened: resets to default width
   - On mobile (<768px): full-screen modal with close button

---

### PART 4: IMPROVE CHUNK-TO-ARTICLE MAPPING

For better article matching long-term, improve how chunks map to articles:

1. Add an article_reference column to document_chunks (if it doesn't exist):
```sql
ALTER TABLE document_chunks ADD COLUMN IF NOT EXISTS article_reference TEXT;
```

2. After PDF extraction, run a post-processing step that scans each chunk's content and identifies which article it belongs to:
```typescript
function identifyArticle(chunkContent: string): string | null {
  const match = chunkContent.match(/(?:ARTICLE|Article)\s+(\d+(?:\.\d+)*)/);
  return match ? match[1] : null;
}
```

3. Update each chunk with its article_reference. This makes future lookups fast:
```sql
SELECT * FROM document_chunks 
WHERE document_id = $1 AND article_reference = $2
ORDER BY chunk_index;
```

---

Run npx next build to verify. Fix ALL errors.
Then: git add . && git commit -m "Phase 2 Task 03: Article citation panel overhaul - correct filtering, clean text, PDF toggle" && git push

TASKEOF
log "  ✓ Created 03-article-panel-overhaul.md"

cat > "$PROMPTS_DIR/04-portfolio-analytics.md" << 'TASKEOF'
Read the entire src/ directory before making any changes.

## TASK: Production-Grade Portfolio Analytics Dashboard

Build a portfolio-level analytics page that aggregates data across ALL locations. This is what separates Provelo from single-lease tools — multi-location intelligence.

---

### PART 1: PORTFOLIO PAGE — /dashboard/portfolio or /portfolio

Create a new page (or enhance existing) that shows portfolio-wide insights.

**Data Aggregation API: GET /api/portfolio/route.ts**
1. Get the authenticated tenant's ID from the session
2. Query ALL stores for this tenant
3. For each store, fetch: lease_summaries, lease_risk_scores, cam_audits, critical dates
4. Aggregate and return:
```typescript
{
  total_locations: number,
  total_annual_rent: number,
  total_square_footage: number,
  average_rent_per_sf: number,
  average_risk_score: number,
  upcoming_critical_dates: CriticalDate[],
  lease_expirations: { store_name: string, expiry: string, years_remaining: number }[],
  risk_scores: { store_name: string, score: number, top_risk: string }[],
  cam_total: number,
  locations: StoreWithSummary[]
}
```
5. Cache results for 5 minutes (use a simple in-memory cache or check updated_at timestamps)

---

### PART 2: DASHBOARD CHARTS (use Recharts library — already available in Next.js)

**Chart 1: Lease Expiration Timeline**
- Horizontal timeline or bar chart
- X axis: years (current year to furthest expiration)
- Each location is a bar showing its lease term
- Color: green if >5 years remaining, yellow if 2-5 years, red if <2 years
- Hover shows: store name, expiry date, years remaining

**Chart 2: Rent Comparison Across Locations**
- Bar chart or horizontal bar
- One bar per location showing annual rent (or rent per SF)
- Sorted highest to lowest
- Color: emerald gradient

**Chart 3: Occupancy Cost Breakdown**
- Stacked bar chart per location
- Segments: Base Rent, CAM, Insurance, Taxes (if data available)
- If only base rent is known, show that alone
- Legend at bottom

**Chart 4: Risk Score Distribution**
- Bar chart with one bar per location
- Bar height = risk score (0-100)
- Bar color: green (80-100), yellow (50-79), red (0-49)
- Horizontal reference lines at 50 and 80

**Chart 5: Critical Dates Calendar**
- A month-view calendar (use a simple grid, not a heavy library)
- Show colored dots on dates that have upcoming events
- Red dot = within 30 days, Yellow = 30-90 days, Green = 90+ days
- Clicking a date shows the event details in a tooltip

---

### PART 3: RISK HEATMAP TABLE

A data table showing all locations with clause-level risk:
- Rows: one per location
- Columns: Exclusivity, Radius, Use, Co-tenancy, Relocation, Assignment, Rent Escalation, CAM Scope, % Rent, CAM Cap, Renewal, Termination, SNDA, Audit Right, Overall Score
- Cells: colored circles (red/yellow/green/gray)
- Hovering shows the summary for that clause at that location
- Sortable by any column
- Overall score column is sortable (show riskiest locations first)

---

### PART 4: PORTFOLIO-LEVEL AI CHAT

Add a chat input at the top of the portfolio page: "Ask about your entire portfolio..."

This chat searches across ALL locations' document chunks:
1. Get all store IDs for the tenant
2. Query document_chunks across all stores
3. Include the store name in the context so Claude can reference specific locations
4. The system prompt should include: "You are analyzing a portfolio of commercial leases. When referencing information, always specify which location/store it comes from."

Example questions this should handle:
- "What's my total rent exposure across all locations?"
- "Which locations have the highest CAM charges?"
- "How many leases expire in the next 2 years?"
- "What's my average rent per square foot?"
- "Which location has the worst risk score and why?"

---

### PART 5: NAVIGATION

- Add "Portfolio" link in the sidebar, between Dashboard and the first location
- Show it for ALL tenants (even with 1 location — they'll add more)
- Active state: emerald highlight
- Icon: grid or chart icon

---

Run npx next build to verify. Fix ALL errors.
Then: git add . && git commit -m "Phase 2 Task 04: Portfolio analytics with charts, heatmap, cross-location AI" && git push

TASKEOF
log "  ✓ Created 04-portfolio-analytics.md"

cat > "$PROMPTS_DIR/05-command-palette-notifications.md" << 'TASKEOF'
Read the entire src/ directory before making any changes.

## TASK: Command Palette (Cmd+K), Notification Center, Keyboard Shortcuts

These are baseline expectations for modern SaaS products. Linear, Notion, Vercel all have them. If you can't Cmd+K to it, it doesn't exist.

---

### PART 1: COMMAND PALETTE (Cmd+K / Ctrl+K)

**Component: src/components/CommandPalette.tsx**

1. Global keyboard listener in root layout:
```typescript
useEffect(() => {
  const handler = (e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      setCommandPaletteOpen(true);
    }
  };
  document.addEventListener('keydown', handler);
  return () => document.removeEventListener('keydown', handler);
}, []);
```

2. The palette is a centered modal overlay:
   - Dark overlay: bg-black/50
   - Centered card: max-width 600px, bg-gray-900/95, backdrop-blur-xl, rounded-xl
   - Search input at top: no border, large text (18px), placeholder "Type a command or search..."
   - Results list below with keyboard navigation (arrow keys, Enter, Escape)

3. Available commands (populate dynamically):

**Navigation commands:**
- "Go to Dashboard" → navigate to /dashboard
- "Go to Portfolio" → navigate to /portfolio
- "Go to Settings" → navigate to /settings
- "Go to [Store Name]" → for each store, add a "Go to [name]" command
- "Go to [Store Name] Chat" → open chat for that store

**Action commands:**
- "Upload Document" → open upload modal for current location
- "New Chat" → start new chat at current location
- "Run Risk Analysis" → trigger risk score for current location
- "Run CAM Audit" → open CAM audit for current location
- "Export Lease Summary" → download summary PDF

**Search commands:**
- "Search documents for [query]" → search across all document chunks
- "Search conversations for [query]" → search past chats

4. Fuzzy matching: as user types, filter commands using substring match (case-insensitive). Show top 8 results.

5. Each result shows:
   - Icon (navigation icon, action icon, search icon)
   - Command name
   - Optional keyboard shortcut on the right
   - Hover/selected state: bg-white/5

6. Styling:
   - Results max-height: 400px with scroll
   - Smooth fade-in animation (150ms)
   - Full width on mobile
   - Close on Escape or clicking outside

---

### PART 2: NOTIFICATION CENTER

**Bell icon in the top-right of the navbar/header.**

1. Bell icon with unread count badge:
   - Red dot with number if unread > 0
   - Animate (subtle pulse) when new notifications arrive
   - 44px touch target minimum

2. Clicking opens a dropdown panel (not a page):
   - Width: 380px, max-height: 500px
   - Shows notifications newest first
   - Each notification: icon, title, message preview, relative timestamp, read/unread indicator
   - Unread items have a subtle emerald left border
   - "Mark all as read" link at top
   - "View all" link at bottom (optional — can show all inline)

3. Notification types and when they're generated:
   - **Critical date approaching** — auto-generate when dates are within 30 or 90 days (check on dashboard load)
   - **Lease summary generated** — when a new summary completes
   - **Risk analysis complete** — when risk score finishes
   - **CAM audit complete** — when a CAM audit finishes
   - **Document uploaded** — confirmation after upload

4. Database:
```sql
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  store_id UUID REFERENCES stores(id),
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  link TEXT,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_notifications_tenant ON notifications(tenant_id, read, created_at DESC);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant sees own notifications" ON notifications
  FOR ALL USING (tenant_id = auth.uid());
```

5. API routes:
   - GET /api/notifications — fetch notifications for current user
   - PUT /api/notifications/read — mark one or all as read
   - Notifications should be created server-side when events happen

6. Clicking a notification navigates to the relevant page and marks it as read.

---

### PART 3: GLOBAL KEYBOARD SHORTCUTS

Register these in the root layout:
- Cmd+K / Ctrl+K → Command palette
- Cmd+N / Ctrl+N → New chat (if on a location page)
- Cmd+U / Ctrl+U → Upload document (if on a location page)
- Escape → Close any modal, panel, or palette

Show these shortcuts in the command palette results and in a "Keyboard Shortcuts" section in Settings.

---

Run npx next build to verify. Fix ALL errors.
Then: git add . && git commit -m "Phase 2 Task 05: Command palette, notification center, keyboard shortcuts" && git push

TASKEOF
log "  ✓ Created 05-command-palette-notifications.md"

cat > "$PROMPTS_DIR/06-onboarding-empty-states.md" << 'TASKEOF'
Read the entire src/ directory before making any changes.

## TASK: Progressive Onboarding Flow + Empty States + Welcome Tour

75% of new users churn in the first week due to poor onboarding. This task ensures Provelo guides new users through their first experience.

---

### PART 1: ONBOARDING CHECKLIST

After first signup, show a checklist card on the dashboard (top of page, before other content):

**Checklist items:**
1. "Add your first location" — checked when stores table has at least 1 entry for this tenant
2. "Upload your lease" — checked when documents table has at least 1 entry
3. "Ask your first question" — checked when conversations table has at least 1 entry
4. "Review your lease summary" — checked when user has viewed a lease summary (track with a boolean)
5. "Check your risk score" — checked when lease_risk_scores has at least 1 entry

**Display:**
- Card with progress bar: "3 of 5 complete"
- Each item: checkbox icon (emerald check when done, empty circle when not), label, brief description
- Incomplete items are clickable — navigate to the relevant action
- When all 5 are complete: show a celebration animation (confetti or sparkle), then allow dismissal
- "Dismiss" button to hide the checklist (store in tenant profile or localStorage)

**Database addition:**
```sql
ALTER TABLE tenant_profiles ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;
ALTER TABLE tenant_profiles ADD COLUMN IF NOT EXISTS onboarding_progress JSONB DEFAULT '{}';
```

If tenant_profiles doesn't exist, create it:
```sql
CREATE TABLE IF NOT EXISTS tenant_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  company_name TEXT,
  onboarding_completed BOOLEAN DEFAULT false,
  onboarding_progress JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE tenant_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own profile" ON tenant_profiles FOR ALL USING (id = auth.uid());
```

---

### PART 2: EMPTY STATES

Every page/section must have a helpful, inviting empty state — not a blank space or error.

**Dashboard — no locations:**
"Welcome to Provelo! Add your first location to get started."
+ Large "Add Location" button (emerald)
+ Illustration or icon (building/storefront)

**Location page — no documents:**
"Upload your lease to unlock AI intelligence."
+ Drag-and-drop upload zone
+ "Supported: PDF files up to 50MB"

**Chat — no conversations:**
Instead of empty white space, show 4-6 suggested questions:
- "What are my renewal options?"
- "Who is responsible for HVAC maintenance?"
- "What are my CAM obligations?"
- "When does my lease expire?"
- "Can I sublease my space?"
- "What happens if I default on rent?"
Each is a clickable chip/button that starts a chat with that question.

**Portfolio — less than 2 locations:**
"Add more locations to unlock portfolio analytics and cross-location insights."
+ "Add Location" button

**Risk Score — not yet analyzed:**
"Click 'Analyze' to generate your lease risk score. This takes about 30 seconds."
+ "Analyze Now" button

**CAM Audit — no statements uploaded:**
"Upload your annual CAM reconciliation statement to run a forensic audit."
+ Upload zone
+ "What is a CAM reconciliation?" expandable help text

---

### PART 3: WELCOME TOUR (first login only)

A 4-step tooltip tour on first login:

Step 1: Points to sidebar navigation → "Navigate your locations and portfolio from here"
Step 2: Points to chat button → "Ask your lease anything in plain English"
Step 3: Points to upload area → "Upload your lease PDF to get started"
Step 4: Points to notification bell → "We'll alert you about critical dates and analysis results"

Implementation:
- Each step: tooltip with arrow pointing to the element, message, "Next" button, step counter "2 of 4"
- Background dims except for the highlighted element
- Store completion in localStorage: provelo_tour_completed = true
- "Skip tour" link on each step
- Only show on first visit (check localStorage)

---

Run npx next build to verify. Fix ALL errors.
Then: git add . && git commit -m "Phase 2 Task 06: Progressive onboarding, empty states, welcome tour" && git push

TASKEOF
log "  ✓ Created 06-onboarding-empty-states.md"

cat > "$PROMPTS_DIR/07-ux-polish.md" << 'TASKEOF'
Read the entire src/ directory before making any changes.

## TASK: Modern SaaS UX Polish — Linear/Notion/Stripe Design Patterns

Apply the design vocabulary that defines best-in-class SaaS in 2026. Every interaction should feel snappy, every element intentional.

---

### PART 1: DESIGN SYSTEM CONSISTENCY

Apply these rules GLOBALLY across every page and component:

**Typography:**
- Primary font: 'Inter' or 'Plus Jakarta Sans' (check which is already imported, use that)
- Headings: font-semibold, text-white (on dark) or text-gray-900 (on light)
- Body: text-gray-300 (on dark) or text-gray-600 (on light), font-normal
- Captions: text-gray-500, text-sm
- NO mixing of font families within the same page
- Letter-spacing: -0.025em on headings (tighter, like Linear)

**Spacing:**
- Use an 8px spacing scale: 8, 16, 24, 32, 40, 48, 64
- Consistent padding on cards: 24px
- Consistent gap between cards: 16px
- Page margins: 24px on mobile, 32-48px on desktop

**Colors:**
- Primary: emerald-500 (#10B981) for actions, active states, success
- Backgrounds: gray-950 or gray-900 (dark mode), white (light mode)
- Cards: bg-white/5 with backdrop-blur on dark, bg-white with shadow-sm on light
- Borders: border-white/10 on dark, border-gray-200 on light
- Text accents: emerald-400 for links, highlights
- Danger: red-500 for errors, violations
- Warning: amber-500 for caution
- DO NOT use random colors — everything should be emerald, neutral grays, or semantic (red/amber/green)

**Cards:**
- All cards: rounded-xl (12px border radius)
- Subtle border: 1px solid rgba(255,255,255,0.06)
- Hover state: slight brightness increase or border color change
- No heavy shadows — use subtle ones only

**Buttons:**
- Primary: bg-emerald-600 hover:bg-emerald-500, text-white, rounded-lg, px-4 py-2.5
- Secondary: bg-white/5 hover:bg-white/10, text-white, border border-white/10
- Ghost: bg-transparent hover:bg-white/5, text-gray-400
- All buttons: min-height 40px, transition-all duration-150
- Disabled state: opacity-50, cursor-not-allowed

---

### PART 2: ANIMATIONS AND TRANSITIONS

**Page transitions:**
- Fade in content on route change (opacity 0→1, 200ms)
- Cards stagger in on page load (each card 50ms delay)

**Micro-interactions:**
- Buttons: scale(0.98) on click (active state), 100ms
- Cards: subtle translateY(-1px) on hover
- Modals/panels: slide in from right (panel) or fade+scale (modal), 200ms
- Toasts: slide in from top-right, auto-dismiss after 5 seconds

**Loading states:**
- Skeleton loaders for content (pulsing gray rectangles matching content shape)
- NOT just a spinner — show the layout shape while loading
- For AI operations (risk score, CAM audit): show a progress message that updates

---

### PART 3: SIDEBAR REFINEMENT

The left sidebar should follow the Linear pattern:

1. **Structure:**
   - Logo/brand at top (Provelo + "PV" icon)
   - Main nav: Dashboard, Portfolio, Settings
   - Divider
   - "Your Locations" section header
   - List of locations (each with icon + name)
   - "Add Location" button at bottom

2. **Collapsible:** 
   - Toggle button at top to collapse sidebar to just icons (48px width)
   - Remember collapsed state in localStorage
   - On mobile: sidebar is a drawer that slides in from left, overlay behind it

3. **Active state:** emerald left border (3px) + bg-white/5 on the active nav item

4. **Location list:**
   - Each location shows: small colored dot (green if active lease, yellow if expiring soon, red if expired) + location name
   - Truncate long names with ellipsis
   - Hover shows full name in tooltip

---

### PART 4: DATA TABLES (Stripe-style)

Any table in the app (obligation matrix, portfolio data, notifications list) should follow Stripe's data table pattern:

- Clean, sortable columns with subtle header styling
- Hover state on rows (bg-white/3)
- Clickable rows that navigate to detail
- Compact but readable (14px body text, 12px headers)
- Sticky header on scroll
- No heavy borders — use alternating subtle backgrounds or thin bottom borders only

---

### PART 5: RENT ESCALATION TIMELINE TEXT BRIGHTNESS

The rent escalation timeline text, once populated, is too grey/dim and hard to read. Fix:
- Active/populated text: text-white or text-gray-100 (bright, high contrast)
- Placeholder/empty text: text-gray-500 (dim, clearly a placeholder)
- Ensure sufficient contrast ratio (minimum 4.5:1 per WCAG AA)

---

### PART 6: CRITICAL DATES COLORS ON DASHBOARD

Fix the critical dates display:
- Past dates (already happened): text-gray-500, subtle "Passed" badge
- Future within 30 days: text-red-400, red badge — URGENT
- Future 31-90 days: text-amber-400, amber badge — APPROACHING
- Future 90+ days: text-emerald-400, green badge — HEALTHY
- Lease expiration with 19.5 years remaining: MUST be green, not grey
- Sort: upcoming dates first (nearest at top), past dates at bottom

---

### PART 7: REMOVE PRICING PLACEHOLDERS

Remove any hardcoded pricing (like "$15/team member") from the settings or team page. Replace with:
- "Team collaboration" section
- "Invite team members" functionality
- No price shown — pricing will be determined later
- If there's a pricing page or upgrade CTA, show "Contact us for pricing" or remove it entirely

---

Run npx next build to verify. Fix ALL errors.
Then: git add . && git commit -m "Phase 2 Task 07: Modern SaaS UX polish - Linear/Notion/Stripe patterns" && git push

TASKEOF
log "  ✓ Created 07-ux-polish.md"

cat > "$PROMPTS_DIR/08-tenant-only.md" << 'TASKEOF'
Read the entire src/ directory before making any changes.

## TASK: Provelo is TENANT-ONLY — Remove PM Features + Language Audit

Provelo serves commercial TENANTS exclusively. Remove anything that serves property managers/landlords.

---

### PART 1: REMOVE PM-FACING FEATURES

Search the entire codebase and remove:
- Any /pm-dashboard pages, components, or routes
- Any "property manager" role in signup/onboarding flows
- Any PM-specific admin panels or views
- Any bulk lease upload features designed for PMs
- Any tenant invitation by PM flows
- Any multi-tenant management from PM perspective
- Any PM-specific analytics (tenant adoption rates, etc.)
- Any PM-specific API routes

**KEEP:**
- Team management (tenant's own team — coworkers, lawyers, accountants)
- Multi-location support (tenant's portfolio of locations)
- Role-based access within the tenant's team (Admin / Member / Viewer)

---

### PART 2: LANGUAGE AUDIT

Search every file for language that implies Provelo serves landlords:

1. Replace "Property Manager" with "Team Admin" when referring to internal team roles
2. Remove all language implying Provelo serves landlords
3. Tone should always be: "Provelo helps YOU understand YOUR lease"
4. In settings, if there's a role selector, options should be: "Owner/Operator", "Real Estate Manager", "Finance/Accounting", "Legal", "Team Member"

---

### PART 3: AI PROMPT AUDIT

Check the system prompts used for chat (src/lib/prompts.ts or wherever prompts are defined):

1. The AI should always advocate for the TENANT's interests
2. Stay neutral and factual when explaining lease terms
3. Never take the landlord's side
4. When a clause is ambiguous, suggest the tenant "consult with a commercial real estate attorney"
5. When a clause is clearly unfavorable to the tenant, proactively point this out
6. The tone should be: knowledgeable commercial real estate advisor explaining things to a business owner

Verify the system prompt includes:
```
You are a commercial lease advisor for tenants. Your role is to help tenants understand their lease terms, rights, and obligations. Always:
- Reference specific articles: "Per Article X.X" or "Under Section X.X"
- Note which document the reference comes from (base lease, amendment, exhibit)
- Be direct when the lease is clear
- Acknowledge ambiguity when it exists
- Suggest consulting an attorney for complex legal questions
- Keep responses to 2-4 paragraphs
- End with a brief bolded summary when helpful
```

---

Run npx next build to verify. Fix ALL errors.
Then: git add . && git commit -m "Phase 2 Task 08: Tenant-only focus, remove PM features, language audit" && git push

TASKEOF
log "  ✓ Created 08-tenant-only.md"

cat > "$PROMPTS_DIR/09-mobile-responsive.md" << 'TASKEOF'
Read the entire src/ directory before making any changes.

## TASK: Mobile Responsive Overhaul

Every page must work perfectly on mobile (320px-768px). Provelo users are commercial tenants — they check their lease info on phones during property visits, meetings, and calls.

---

### RESPONSIVE RULES (apply to ALL pages):

**Breakpoints:**
- Mobile: 0-639px
- Tablet: 640-1023px
- Desktop: 1024px+

**Navigation:**
- Mobile: sidebar becomes a hamburger menu drawer (slide in from left with overlay)
- Hamburger icon: top-left, 44px touch target
- When drawer opens: overlay behind it, close on tap outside or swipe left
- Bottom nav bar (optional): Dashboard, Chat, Upload, Settings — 4 icons max

**Cards and grids:**
- Desktop 2-3 column grids → mobile single column, full width
- Card padding: 16px on mobile (24px on desktop)
- No horizontal scrolling — everything stacks vertically

**Typography:**
- Body text: 16px minimum on mobile (never smaller)
- Headings: scale down proportionally but never below 20px for h1
- Line height: 1.5-1.6 on mobile

**Touch targets:**
- All interactive elements: minimum 44px × 44px
- Buttons: full width on mobile, padding: 14px 16px
- Links in lists: full-row tap target
- Form inputs: min-height 48px, font-size 16px (prevents iOS zoom)

**Specific pages:**

**Dashboard:**
- Stats cards: 2 per row on mobile (or stack to 1 if text overflows)
- Charts: full width, adjust aspect ratio for portrait orientation
- Critical dates: list view, no table

**Location detail page:**
- Action buttons (Ask Your Lease, Upload): stack vertically, full width
- Lease summary: single column
- Obligation matrix: horizontal scroll with sticky first column, or transform to a list view
- Risk score: full width card

**Chat interface:**
- Chat bubbles: max-width 90% (not 88%)
- Input bar: fixed to bottom, safe area padding for notch phones
- Citation panel: opens as FULL SCREEN modal (not side panel), close button top-right (44px)
- Chat history sidebar: opens as a drawer from left (same as nav)

**Tables:**
- Any table wider than viewport: either horizontal scroll with sticky first column, or transform to a card/list view on mobile
- Do NOT show tables with 5+ columns on mobile — transform to cards

**Modals:**
- On mobile: all modals become full-screen with a top bar (close X, title)
- Bottom sheets for short actions (confirmation dialogs)

---

### TESTING CHECKLIST

After making changes, verify with browser dev tools at these widths:
- 375px (iPhone SE/13 Mini)
- 390px (iPhone 14/15)
- 768px (iPad mini/tablet)

Check:
- No horizontal scrolling on any page
- All text is readable without zooming
- All buttons are tappable
- Chat input doesn't get hidden behind the keyboard
- Forms are usable

---

Run npx next build to verify. Fix ALL errors.
Then: git add . && git commit -m "Phase 2 Task 09: Mobile responsive overhaul" && git push

TASKEOF
log "  ✓ Created 09-mobile-responsive.md"

cat > "$PROMPTS_DIR/10-landing-page.md" << 'TASKEOF'
Read the entire src/ directory before making any changes.

## TASK: Landing Page Overhaul for Conversion

The landing page must convert visitors into signups. Modern, clean, trust-building.

---

### PAGE STRUCTURE (top to bottom):

**1. Hero Section:**
- Headline: "Know Your Lease. Protect Your Business." (or similar — confident, tenant-focused)
- Subheadline: "AI-powered lease intelligence for commercial tenants. Understand your rights, catch overcharges, and never miss a critical date."
- Two CTAs: "Start Free" (primary, emerald) + "See How It Works" (secondary, scrolls to demo section)
- Background: subtle gradient or abstract geometric pattern (emerald-to-dark)
- Optional: animated mockup of the dashboard

**2. Problem Section:**
- "Commercial leases are designed to protect landlords. Provelo levels the playing field."
- Three pain points with icons:
  1. "40% of CAM reconciliations contain billing errors" — magnifying glass icon
  2. "Critical dates buried in 100-page documents" — calendar icon
  3. "Legal language designed to confuse" — document icon

**3. Feature Cards (3-4 key features):**
- "Ask Your Lease Anything" — chat icon — "Get plain-English answers about your rights, obligations, and what you can and can't do."
- "Catch CAM Overcharges" — shield icon — "14-rule forensic audit finds billing errors that cost tenants thousands."
- "Risk Score Your Lease" — chart icon — "20-clause analysis scores your lease from 0-100 with negotiation recommendations."
- "Never Miss a Deadline" — bell icon — "Automated alerts for renewals, escalations, and critical dates."

**4. How It Works (3 steps):**
1. "Upload your lease PDF"
2. "AI extracts and analyzes every clause"
3. "Get instant intelligence and ongoing monitoring"
Each step with a number, icon, and brief description. Connect with a subtle line/arrow.

**5. Trust Section:**
- "Built for commercial tenants managing 1 to 1,000+ locations"
- Security badges: "256-bit encryption", "SOC 2 compliant" (or "Security-first architecture"), "Your data stays yours"
- Note: Only include badges for claims that are true. If SOC 2 isn't done yet, say "Enterprise-grade security"

**6. CTA Section:**
- "Ready to understand your lease?"
- "Start Free" button
- "No credit card required. Upload your first lease in under 2 minutes."

**7. Footer:**
- Provelo logo
- Links: Product, Pricing (coming soon), Security, Contact
- Copyright
- Social links (if any)

---

### DESIGN NOTES:

- Dark theme preferred (matches the app)
- Emerald accents for CTAs and highlights
- Clean typography, lots of whitespace
- No stock photos — use icons, illustrations, or abstract graphics
- Page should load fast — no heavy animations or videos on initial load
- Responsive: looks great on mobile

---

### NAVIGATION BAR (landing page only):

- Logo on left
- Links: Features, How It Works, Pricing (coming soon)
- "Sign In" link (ghost button)
- "Start Free" button (primary emerald)
- Sticky on scroll with subtle background blur

---

Run npx next build to verify. Fix ALL errors.
Then: git add . && git commit -m "Phase 2 Task 10: Landing page overhaul for conversion" && git push

TASKEOF
log "  ✓ Created 10-landing-page.md"

cat > "$PROMPTS_DIR/11-full-audit.md" << 'TASKEOF'
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

TASKEOF
log "  ✓ Created 11-full-audit.md"

log ""
log "PHASE 1 COMPLETE — 12 prompt files created"
log ""
log "================================================================"
log "PHASE 2: Executing tasks..."
log "================================================================"

echo "Phase 2 build started at $(timestamp)" > "$STATUS_FILE"
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
  log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  log "TASK $TOTAL/12: $task_name"
  log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  set +e
  timeout $TIMEOUT_SECONDS claude -p --dangerously-skip-permissions --max-turns $MAX_TURNS < "$prompt_file" \
    > "$log_file" 2>&1
  exit_code=$?
  set -e

  if [ $exit_code -eq 124 ]; then
    log_skip "$task_name — TIMED OUT after $((TIMEOUT_SECONDS / 60)) minutes"
    echo "[$task_name] TIMEOUT" >> "$STATUS_FILE"
    SKIPPED=$((SKIPPED + 1))
    git add -A 2>/dev/null || true
    git commit -m "TIMEOUT: $task_name" --allow-empty 2>/dev/null || true
    git push 2>/dev/null || true
    continue
  fi

  # Build test
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
    log_fail "$task_name — attempting auto-fix..."
    FAILED=$((FAILED + 1))

    # Auto-fix attempt
    set +e
    echo "Read the build errors below and fix ALL TypeScript and compilation errors. Do NOT add new features — only fix errors so npx next build passes cleanly.

Build errors:
$(tail -80 "$LOGS_DIR/${task_name}-build.log")" | \
      timeout 600 claude -p --dangerously-skip-permissions --max-turns 20 \
      > "$LOGS_DIR/${task_name}-fix.log" 2>&1

    npx next build > "$LOGS_DIR/${task_name}-rebuild.log" 2>&1
    rebuild_exit=$?
    set -e

    if [ $rebuild_exit -eq 0 ]; then
      log_pass "$task_name (fixed on retry)"
      echo "[$task_name] PASS (after fix)" >> "$STATUS_FILE"
      FAILED=$((FAILED - 1))
      PASSED=$((PASSED + 1))
    else
      log_fail "$task_name — still failing after fix attempt"
      echo "[$task_name] FAIL" >> "$STATUS_FILE"
    fi

    git add -A
    git commit -m "FIX-ATTEMPT: $task_name" 2>/dev/null || true
    git push 2>/dev/null || true
  fi
done

log ""
log "================================================================"
log "PHASE 2 BUILD COMPLETE"
log "================================================================"
log "Total tasks:  $TOTAL"
log_pass "Passed: $PASSED"
[ $FAILED -gt 0 ] && log_fail "Failed: $FAILED"
[ $SKIPPED -gt 0 ] && log_skip "Skipped: $SKIPPED"
log "Status log: $STATUS_FILE"
log "Task logs:  $LOGS_DIR/"
log "================================================================"

echo "========================================" >> "$STATUS_FILE"
echo "Build completed at $(timestamp)" >> "$STATUS_FILE"
echo "TOTAL=$TOTAL PASS=$PASSED FAIL=$FAILED SKIP=$SKIPPED" >> "$STATUS_FILE"
