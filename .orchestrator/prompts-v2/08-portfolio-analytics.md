Read the entire src/ directory before making any changes.

## TASK: Build Portfolio Analytics Dashboard

### PAGE: /dashboard/portfolio
Only show if tenant has 2+ locations. Add "Portfolio" to sidebar nav.

### SUMMARY CARDS (top row):
Total Monthly Rent, Total Annual Occupancy Cost, Average Risk Score, Upcoming Critical Dates (next 90 days), Total Locations

### CHARTS (use Recharts — install if needed: npm install recharts):
1. Rent by Location (horizontal bar, sorted highest to lowest)
2. Lease Expiration Timeline (gantt showing when each expires, color by urgency)
3. Occupancy Cost Breakdown (stacked bar: rent vs CAM vs insurance vs taxes per location)
4. Risk Score Distribution (bar chart per location, red/yellow/green zones)

### PORTFOLIO AI Q&A
Chat input at top: "Ask about your portfolio..."
Searches ALL locations' chunks. Include store name in context so Claude references specific locations.
Example: "What's my total exposure in Georgia?", "Which locations have highest CAM?"

### API: /api/portfolio/route.ts
Queries lease_summaries, cam_analysis, lease_risk_scores, critical_dates across all tenant's stores. Returns aggregated data.

Run npx next build to verify. Fix any errors.
