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

