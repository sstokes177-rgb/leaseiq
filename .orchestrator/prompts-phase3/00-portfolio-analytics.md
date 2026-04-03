Read the entire src/ directory before making any changes. This is a BRAND NEW page that does not exist yet.

## TASK: Build Portfolio Analytics Dashboard — Cross-Location Intelligence

Occupier has a "Horizon Planning" analytics dashboard. LeaseCake has portfolio rollups with heatmaps. Provelo currently has NOTHING for portfolio-level views. This is the single biggest missing feature.

---

### CREATE: src/app/portfolio/page.tsx

This is a new page. Create the entire thing from scratch.

**Data source — create API route: GET /api/portfolio/route.ts**

1. Get the authenticated tenant's ID from session
2. Query ALL stores for this tenant from the stores table
3. For each store, fetch:
   - lease_summaries (summary_data JSONB)
   - lease_risk_scores (overall_score, clause_scores)
   - critical_dates (all upcoming dates)
   - cam_analysis (analysis_data)
   - documents count
4. Return aggregated data:

```typescript
interface PortfolioData {
  total_locations: number
  locations: Array<{
    id: string
    store_name: string
    shopping_center_name: string | null
    address: string | null
    risk_score: number | null
    lease_expiry: string | null
    years_remaining: number | null
    monthly_rent: number | null
    annual_rent: number | null
    square_footage: number | null
    rent_per_sf: number | null
    document_count: number
    top_risk: string | null
  }>
  upcoming_critical_dates: Array<{
    date_type: string
    date_value: string
    description: string
    store_name: string
    store_id: string
  }>
  average_risk_score: number | null
  total_annual_rent: number | null
  total_square_footage: number | null
}
```

5. Cache results for 5 minutes using a simple timestamp check

---

### PAGE LAYOUT

**Header section:**
- Title: "Portfolio Overview" with subtitle showing total locations count
- "Add Location" button (top right)
- Date range filter (optional — for critical dates)

**Stats bar (4 cards in a row):**
- Total Locations (number + building icon)
- Average Risk Score (circular mini-gauge, colored green/yellow/red)
- Total Annual Rent (formatted as currency)
- Upcoming Critical Dates count (with urgency coloring)

**Chart 1: Lease Expiration Timeline (full width)**
- Use Recharts BarChart
- X axis: each location name
- Y axis: years remaining on lease
- Bar color: green if >5 years, yellow if 2-5, red if <2
- Hover tooltip: store name, exact expiry date, years remaining
- If a lease is expired: red bar extending below zero line, or a "EXPIRED" label

**Chart 2: Risk Score Comparison (full width)**
- Use Recharts BarChart
- One bar per location, height = risk score (0-100)
- Bar fill color: green (80-100), yellow (50-79), red (0-49)
- Horizontal reference lines at score 50 and 80
- Hover tooltip: store name, score, top risk clause

**Chart 3: Rent Comparison (half width, left)**
- Use Recharts BarChart (horizontal)
- Bars showing annual rent per location
- Sorted highest to lowest
- Emerald gradient bars

**Chart 4: Risk Heatmap Table (half width, right)**
- HTML table, not a chart
- Rows: each location
- Columns: key clause categories (Exclusivity, Assignment, Rent Escalation, CAM Cap, Renewal, Termination)
- Cells: colored circles — red/yellow/green/gray based on clause severity
- Pull from lease_risk_scores.clause_scores JSONB
- Hover on a cell: show the clause summary
- Click on a cell: navigate to that location's risk score detail
- Sortable by clicking column headers

**Critical Dates Section (full width, below charts):**
- Title: "Upcoming Critical Dates"
- List of dates sorted by nearest first
- Each row: colored urgency badge (red <30 days, yellow 30-90, green >90), date, description, location name
- Past dates at the bottom in gray with "Passed" label
- Click on a date row: navigate to that location page

**Portfolio AI Chat (bottom section):**
- Chat input: "Ask about your entire portfolio..."
- This should query across ALL locations' document chunks
- Create API enhancement: when store_id is null in the chat API, search across all stores for the tenant
- System prompt addition: "You are analyzing a portfolio of commercial leases. Always specify which location information comes from."
- Example questions shown as chips:
  - "Which locations have the highest risk?"
  - "How many leases expire in the next 3 years?"
  - "Compare my rent per square foot across locations"
  - "What are my total CAM obligations?"

---

### NAVIGATION

Add "Portfolio" to the sidebar navigation:
- Position: between Dashboard and the locations list
- Icon: BarChart3 or PieChart from lucide-react
- Active state: emerald left border + bg-white/5
- Show for all tenants (even with 1 location — they'll add more)

---

### STYLING

- Match the existing dark theme throughout
- Cards: bg-white/[0.03] backdrop-blur border border-white/[0.06] rounded-xl
- Charts: use emerald/green for positive, amber for warning, red for danger
- Responsive: on mobile, charts stack vertically and the heatmap becomes a scrollable card list
- All text: minimum 14px, headings 20px+
- Chart labels: 12px, readable

---

### RECHARTS SETUP

Recharts should already be installed. If not:
```bash
npm install recharts
```

Import pattern:
```typescript
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts'
```

---

Run npx next build to verify. Fix ALL errors.
Then: git add . && git commit -m "Phase 3: Portfolio analytics dashboard with charts, heatmap, cross-location AI" && git push

