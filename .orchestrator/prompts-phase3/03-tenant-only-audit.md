Read the entire src/ directory before making any changes.

## TASK: Remove PM Dashboard + Complete Tenant-Only Language Audit

Provelo is EXCLUSIVELY for commercial tenants. The PM dashboard (src/app/pm-dashboard/) still exists. Remove it and audit all language.

---

### PART 1: DELETE PM-FACING CODE

1. Delete the entire directory: src/app/pm-dashboard/
2. Search the entire codebase for any references to pm-dashboard, pm_dashboard, or property_manager:
   - Remove any navigation links to /pm-dashboard
   - Remove any sidebar items referencing PM dashboard
   - Remove any API routes that are PM-specific (if any)
   - Remove any role checks for 'property_manager' in page guards

3. In tenant_profiles, the role column has 'property_manager' as an option. Change the check constraint:
   - Remove 'property_manager' from the allowed roles
   - But do NOT run ALTER TABLE — just update the TypeScript types and UI
   - If there's a role selector in onboarding or settings, remove "Property Manager" option

4. Search for any component that renders differently based on role === 'property_manager' and remove that code path.

---

### PART 2: LANGUAGE AUDIT

Search every .tsx and .ts file for these terms and update:

| Find | Replace with |
|------|-------------|
| "Property Manager" (when referring to a user role) | "Team Admin" |
| "property manager" (lowercase, same context) | "team admin" |
| Any text suggesting Provelo serves landlords | Tenant-focused language |
| "landlord portal" or "manager view" | Remove entirely |

**Keep** references to "property manager" or "landlord" when they refer to the OTHER party in a lease (e.g., "Your landlord is responsible for..." is correct tenant-facing language).

---

### PART 3: AI SYSTEM PROMPT AUDIT

Open src/lib/prompts.ts (or wherever the chat system prompt is defined) and src/lib/ragChain.ts.

Verify the system prompt:
1. Always advocates for the TENANT's interests
2. References specific articles: "Per Article X.X" or "Under Section X.X"
3. Notes which document references come from (base lease, amendment, exhibit)
4. Is direct and confident when the lease is clear
5. Acknowledges ambiguity honestly: "Your lease language on this point is not entirely clear..."
6. Suggests consulting a commercial real estate attorney for complex questions
7. Keeps responses to 2-4 paragraphs
8. Ends with a brief bold summary when helpful
9. Does NOT use markdown headers (##), horizontal rules (---), or block quotes
10. Does NOT write numbered recommendation lists
11. Writes in flowing paragraphs, not bullet-heavy formats

If the system prompt doesn't match all of these, update it to include them.

---

### PART 4: PRICING PLACEHOLDERS

Search for any hardcoded pricing in the app (like "$15/team member" or specific dollar amounts for plans). Remove them or replace with:
- "Team collaboration" section (no price)
- "Contact us for pricing" or simply remove the pricing section
- No upgrade CTAs with specific prices

---

Run npx next build to verify. Fix ALL errors.
Then: git add . && git commit -m "Phase 3: Remove PM dashboard, tenant-only language audit" && git push

