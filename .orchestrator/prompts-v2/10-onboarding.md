Read the entire src/ directory before making any changes.

## TASK: Progressive Onboarding Flow

### ONBOARDING CHECKLIST
After first signup, show checklist card on dashboard:
1. "Add your first location"
2. "Upload your lease"
3. "Ask your first question"
4. "Review your lease summary"
5. "Check your risk score"

Progress bar: "3 of 5 complete". Auto-checks when completed. Celebration on completion. Dismissible.
Store in tenant_profiles (add onboarding_completed boolean, onboarding_progress jsonb).

### EMPTY STATES
- Dashboard no locations: "Welcome! Add your first location." + button
- Location no documents: "Upload your lease to unlock AI intelligence." + button
- Chat no conversations: suggested questions
- Portfolio < 2 locations: "Add more locations for portfolio insights."

### WELCOME TOUR (3-4 tooltips on first login)
Point to: sidebar nav, chat button, upload area, notification bell.
"Next" button + step counter. Store in localStorage.

Run npx next build to verify. Fix any errors.
