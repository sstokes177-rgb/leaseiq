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

