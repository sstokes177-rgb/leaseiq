Read the entire src/ directory before making any changes.

## TASK: Improve exports and document management

### PDF EXPORTS (use jspdf or @react-pdf/renderer):
1. Lease Summary PDF — all extracted terms, Provelo branding header
2. Chat History PDF — messages formatted, citations included
3. Obligation Matrix PDF — two-column tenant/landlord with article refs
4. Risk Score Report PDF — score, all clause scores with colors, recommendations
5. CAM Audit Report PDF — findings, overcharges, actions (shareable with attorney)

### DOCUMENT MANAGEMENT on location detail:
- List: name, type, upload date, file size
- Preview button (PDF viewer)
- Download button (original file)
- Delete button with confirmation ("Are you sure? This removes document and all analysis.")
- Delete cascades: document -> chunks -> re-generate summary if needed

### CSV EXPORT on portfolio page:
"Export Data (CSV)" — all locations: name, address, lease dates, rent, CAM, risk score, critical dates. One row per location.

Run npx next build to verify. Fix any errors.
