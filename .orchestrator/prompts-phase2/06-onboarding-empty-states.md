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

