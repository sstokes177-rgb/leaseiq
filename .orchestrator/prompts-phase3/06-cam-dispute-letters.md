Read the entire src/ directory before making any changes.

## TASK: CAM Audit Dispute Letter Generation + Cross-Portfolio Pattern Detection

CAMAudit.io is a standalone $199/audit tool. Provelo should surpass it by generating dispute letters and detecting patterns across multiple locations.

---

### PART 1: DISPUTE LETTER GENERATION

After a CAM audit finds violations, add a "Generate Dispute Letter" button in the CamAuditCard.

**API ROUTE: POST /api/cam-audit/dispute-letter/route.ts**

Accept: audit_id (UUID)

1. Fetch the cam_audit record and its findings
2. Fetch the store details (name, address)
3. Fetch the lease provisions related to CAM (from document_chunks)
4. Send to Claude with a dispute letter prompt:

```
Generate a professional dispute letter for a commercial tenant challenging CAM (Common Area Maintenance) overcharges. The letter should be sent from the tenant to the landlord/property manager.

TENANT LOCATION: {store_name} at {address}
AUDIT FINDINGS: {JSON.stringify(findings)}
TOTAL POTENTIAL OVERCHARGE: ${total}

The letter should:
1. Be addressed to "Property Manager / Landlord" (tenant will fill in the actual name)
2. Reference the specific lease provisions that were violated
3. Cite each violation with the rule name, estimated overcharge amount, and lease article reference
4. Request a meeting to discuss the findings within 15 business days
5. Reference the tenant's audit rights under the lease
6. Maintain a professional, firm but not adversarial tone
7. Include a deadline for response
8. Note that the tenant reserves all rights under the lease

Return the letter as plain text, properly formatted with:
- Date placeholder: [DATE]
- Sender/recipient placeholders
- Proper business letter formatting
- Re: line with the property address
```

**UI additions to CamAuditCard:**
- "Generate Dispute Letter" button (appears only when violations are found)
- Opens a modal showing the generated letter
- "Copy to Clipboard" button
- "Download as PDF" button (use the existing PDF export utility)
- "Edit" mode: user can modify the letter before copying/downloading
- The letter should be editable in a textarea with monospace font

---

### PART 2: CROSS-PORTFOLIO CAM PATTERN DETECTION

If a tenant has CAM audits across multiple locations, look for patterns:

Add to the portfolio page or as a separate section:

1. Query all cam_audits for the tenant
2. Aggregate findings across locations:
   - Which rules are violated most frequently?
   - Which landlord/property (by store address) has the most violations?
   - Total potential overcharges across all locations
   - Are the same rule violations appearing at multiple locations? (This suggests systematic landlord behavior)

3. Display as a card:
   - "CAM Audit Insights Across Your Portfolio"
   - "Rule X violated at Y of Z locations — this may indicate a systematic billing practice"
   - Total portfolio-wide potential overcharges
   - Table: location | violations found | estimated overcharge | last audit date

---

Run npx next build to verify. Fix ALL errors.
Then: git add . && git commit -m "Phase 3: CAM dispute letter generation + portfolio pattern detection" && git push

