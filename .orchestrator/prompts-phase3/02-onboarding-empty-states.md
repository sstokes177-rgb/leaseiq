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

