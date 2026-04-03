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

