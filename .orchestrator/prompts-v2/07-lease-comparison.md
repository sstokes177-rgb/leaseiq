Read the entire src/ directory before making any changes.

## TASK: Build AI Lease Comparison (Side-by-Side Amendment Analysis)

### API ROUTE: /api/lease-compare/route.ts
Accept store_id, document_id_1, document_id_2. Retrieve chunks for both. Send to Claude for comparison.

Claude identifies per clause: clause_name, change_type (modified/added/deleted/unchanged), original_text summary, amended_text summary, impact (favorable/unfavorable/neutral), explanation.

### DATABASE: lease_comparisons
id, store_id, tenant_id, doc_id_1, doc_id_2, comparison_results (jsonb), created_at. RLS.

### UI: "Compare Documents" button on location detail page
- Two document dropdowns + "Compare" button
- Side-by-side results: Document A left, Document B right
- Green=favorable, Red=unfavorable, Yellow=neutral, Grey=unchanged (collapsed)
- Summary at top: "X modified, Y added, Z deleted. Overall: [impact]"
- Mobile: stacked view instead of side-by-side

Run npx next build to verify. Fix any errors.
