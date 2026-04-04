Read the entire src/ directory.

## TASK: Final Integration Pass — Fix Conflicts, Verify All Features, Clean Build

This is the LAST task. Fix everything the previous tasks may have broken.

### STEP 1: BUILD CHECK
Run: npx next build
Fix ALL errors. Common issues: duplicate imports, conflicting props, missing files, type mismatches.

### STEP 2: VERIFY NAVIGATION
Ensure all these routes exist and render without errors:
- / (landing page)
- /login
- /about
- /pricing
- /dashboard
- /portfolio
- /location/[id] (with all tabs: Overview, Risk, Financial, Documents, Chat)
- /chat
- /settings
- /admin (super_admin only)
- /forgot-password
- /reset-password

Verify all links between pages work:
- Landing page navbar: Features, How It Works, For Tenants, Pricing, About, Sign In, Start 14-Day Trial
- Sidebar: Dashboard, Portfolio, each location, Settings, Admin (if super_admin)
- Sidebar logo: clicks to landing page
- All "Start 14-Day Trial" buttons link to /login or signup flow

### STEP 3: VERIFY KEY FEATURES
Trace code paths for:
1. FloatingLeaseViewer renders on location page, persists across tabs, slides left on Chat tab
2. Document upload validation calls /api/documents/classify
3. Admin dashboard only accessible to super_admin
4. Pricing page renders with three tiers
5. All "Start Free" text has been replaced with "Start 14-Day Trial"
6. Signup form has confirm password field and duplicate email error handling
7. Command palette opens with Ctrl+K
8. Notification bell exists in header
9. ScrollToTop button appears on scroll

### STEP 4: CONSISTENCY CHECK
- All cards use bg-white/[0.03] border border-white/[0.06] rounded-xl
- All primary buttons use bg-emerald-600 hover:bg-emerald-500 (no gradients)
- No remaining gradient buttons anywhere
- Tab bar uses underline style (no dark band background)
- All text is readable (minimum 14px for body content)
- Sidebar has expand/collapse toggle

### STEP 5: DEAD CODE REMOVAL
- Remove any unused imports
- Remove commented-out code blocks
- Remove the pm-dashboard directory if it still exists
- Remove any files that are not imported anywhere

### STEP 6: TYPE SAFETY
Run: npx tsc --noEmit
Fix ALL TypeScript errors.

### STEP 7: FINAL BUILD
Run: npx next build — MUST pass with ZERO errors.
Then: git add . && git commit -m "Phase 5 complete: all features verified, production ready" && git push

