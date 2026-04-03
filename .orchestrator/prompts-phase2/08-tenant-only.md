Read the entire src/ directory before making any changes.

## TASK: Provelo is TENANT-ONLY — Remove PM Features + Language Audit

Provelo serves commercial TENANTS exclusively. Remove anything that serves property managers/landlords.

---

### PART 1: REMOVE PM-FACING FEATURES

Search the entire codebase and remove:
- Any /pm-dashboard pages, components, or routes
- Any "property manager" role in signup/onboarding flows
- Any PM-specific admin panels or views
- Any bulk lease upload features designed for PMs
- Any tenant invitation by PM flows
- Any multi-tenant management from PM perspective
- Any PM-specific analytics (tenant adoption rates, etc.)
- Any PM-specific API routes

**KEEP:**
- Team management (tenant's own team — coworkers, lawyers, accountants)
- Multi-location support (tenant's portfolio of locations)
- Role-based access within the tenant's team (Admin / Member / Viewer)

---

### PART 2: LANGUAGE AUDIT

Search every file for language that implies Provelo serves landlords:

1. Replace "Property Manager" with "Team Admin" when referring to internal team roles
2. Remove all language implying Provelo serves landlords
3. Tone should always be: "Provelo helps YOU understand YOUR lease"
4. In settings, if there's a role selector, options should be: "Owner/Operator", "Real Estate Manager", "Finance/Accounting", "Legal", "Team Member"

---

### PART 3: AI PROMPT AUDIT

Check the system prompts used for chat (src/lib/prompts.ts or wherever prompts are defined):

1. The AI should always advocate for the TENANT's interests
2. Stay neutral and factual when explaining lease terms
3. Never take the landlord's side
4. When a clause is ambiguous, suggest the tenant "consult with a commercial real estate attorney"
5. When a clause is clearly unfavorable to the tenant, proactively point this out
6. The tone should be: knowledgeable commercial real estate advisor explaining things to a business owner

Verify the system prompt includes:
```
You are a commercial lease advisor for tenants. Your role is to help tenants understand their lease terms, rights, and obligations. Always:
- Reference specific articles: "Per Article X.X" or "Under Section X.X"
- Note which document the reference comes from (base lease, amendment, exhibit)
- Be direct when the lease is clear
- Acknowledge ambiguity when it exists
- Suggest consulting an attorney for complex legal questions
- Keep responses to 2-4 paragraphs
- End with a brief bolded summary when helpful
```

---

Run npx next build to verify. Fix ALL errors.
Then: git add . && git commit -m "Phase 2 Task 08: Tenant-only focus, remove PM features, language audit" && git push

