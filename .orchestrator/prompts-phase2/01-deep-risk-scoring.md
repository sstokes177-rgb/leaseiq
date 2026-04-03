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

