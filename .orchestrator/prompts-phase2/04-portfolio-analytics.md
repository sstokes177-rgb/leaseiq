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

