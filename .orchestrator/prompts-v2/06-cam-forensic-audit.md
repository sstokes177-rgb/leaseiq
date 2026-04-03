Read the entire src/ directory before making any changes.

## TASK: Build CAM Forensic Audit System (14 detection rules like CAMAudit.io)

### HOW IT WORKS:
1. Tenant uploads annual CAM reconciliation statement (PDF)
2. Extract text from statement
3. Cross-reference against lease CAM provisions
4. Run 14 detection rules
5. Display findings with severity and estimated overcharge

### API ROUTE: /api/cam-audit/route.ts
Accept store_id + uploaded CAM statement PDF.

14 DETECTION RULES:
Math-Based: (1) Management fee overcharge (2) Pro-rata share error (3) Gross-up violation (4) CAM cap violation (5) Base year error (6) Controllable expense cap overcharge (7) Estimated payment true-up error

Classification (AI): (8) Gross lease charges (9) Excluded service charges (10) Insurance overcharge (11) Tax overallocation (12) Utility overcharge (13) Common area misclassification (14) Landlord overhead pass-through

Claude returns per rule: rule_name, status (violation_found/within_limits/insufficient_data), estimated_overcharge (dollars), explanation, lease_reference, statement_reference.

### DATABASE: cam_audits
id, store_id, tenant_id, statement_file_name, total_potential_overcharge, findings (jsonb), audit_date, dispute_deadline. RLS.

### UI: CAM Audit section on location detail page
- Upload area for CAM statement
- "Run Forensic Audit" button
- Results: total overcharge (large, red if > $0), findings list by severity
- "Generate Dispute Letter" button: Claude drafts professional letter citing lease provisions
- If no audit run: educational content about 40% error rate
- Dispute letter downloadable as PDF

Run npx next build to verify. Fix any errors.
