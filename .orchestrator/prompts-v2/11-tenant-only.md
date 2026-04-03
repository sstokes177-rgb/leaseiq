Read the entire src/ directory before making any changes.

## TASK: Remove PM features — Provelo is TENANT-ONLY

### REMOVE:
- PM Admin Dashboard (any /pm-dashboard pages, nav links, API routes)
- PM role in onboarding (remove "property manager" option)
- Bulk lease upload for PMs
- Tenant invitation by PM
- Multi-tenant management from PM perspective
- PM-specific analytics (tenant adoption rates, etc.)

### KEEP:
- Team management (tenant's own team — coworkers, managers, lawyers)
- Multi-location support (tenant's portfolio)
- Role-based access within team (Admin/Member/Viewer)

### LANGUAGE AUDIT:
Replace "Property Manager" with "Team Admin" where it refers to internal roles.
Remove all language implying Provelo serves landlords.
Tone: "Provelo helps YOU understand YOUR lease."

### AI PROMPT AUDIT:
Check src/lib/prompts.ts. Ensure AI helps TENANTS, stays neutral, never takes landlord's side, suggests consulting attorney when ambiguous.

Run npx next build to verify. Fix any errors.
