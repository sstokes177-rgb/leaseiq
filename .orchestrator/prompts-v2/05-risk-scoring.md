Read the entire src/ directory before making any changes.

## TASK: Build Lease Risk Scoring System (like Leasecake LIFT)

### API ROUTE: /api/risk-score/route.ts
Accept store_id. Retrieve chunks. Send to Claude for risk analysis.

Score these clause categories (Red/Yellow/Green each):

EXPANSION BLOCKERS: Exclusivity, Radius restriction, Use restriction, Co-tenancy, Relocation clause, Assignment/subletting

FINANCIAL EXPOSURE: Rent escalation severity, CAM pass-through scope, Percentage rent trigger, CAM cap existence, Operating hours, Insurance requirements, Late fee/default

TENANT PROTECTIONS (score by ABSENCE): Renewal option, Termination right, SNDA, CAM audit right, Exclusive use, Go-dark right, Force majeure

Claude returns per clause: severity, summary, citation, recommendation.
Calculate overall RISK SCORE 0-100 (100=excellent, 0=risky).

### DATABASE: lease_risk_scores
id, store_id, tenant_id, overall_score (int), clause_scores (jsonb), analyzed_at. RLS for tenant isolation.

### UI: Risk Score Card on location detail page
- Large circular score (0-100), color: 80-100 green, 50-79 yellow, 0-49 red
- Clause list grouped by severity (red first)
- Each expandable for details
- "Re-analyze" button
- "How to improve" section with top 3 recommendations
- Style: dark theme, emerald accents, frosted glass cards

Run npx next build to verify. Fix any errors.
