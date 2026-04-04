Read the entire src/ directory.

## TASK: Final Integration Pass — Verify Everything, Fix Conflicts

### STEP 1: BUILD
Run npx next build. Fix ALL errors.

### STEP 2: VERIFY NAVIGATION
Check all routes render:
- / (landing page with new design)
- /about
- /pricing
- /login (with confirm password, duplicate email error)
- /dashboard (with list/grid toggle)
- /portfolio
- /location/[id] (all tabs, floating PDF viewer)
- /chat (floating PDF persists)
- /settings (password change is email-only, no in-app form)
- /admin (super_admin only)

### STEP 3: VERIFY FEATURES
1. Dashboard list view toggle works
2. Settings only shows "Reset Password via Email" button, no change password form
3. About page has no dark gradient bars between sections
4. CAM audit shows "Generate Dispute Letter" when violations found
5. Floating PDF viewer resizes from all edges
6. Floating PDF stays visible on Chat tab
7. Landing page looks professional with scroll animations
8. Pricing page shows 3 tiers with "Start 14-Day Trial"
9. All "Start Free" text is "Start 14-Day Trial"

### STEP 4: CONSISTENCY
- All cards: bg-white/[0.03] border border-white/[0.06] rounded-xl
- All primary buttons: bg-emerald-600 hover:bg-emerald-500 (no gradients)
- Tab bar: underline style, no dark band
- Sidebar: expand/collapse toggle visible

### STEP 5: CLEAN UP
- Remove unused imports
- Remove commented-out code
- Remove any pm-dashboard remnants
- Fix any TypeScript errors: npx tsc --noEmit

### STEP 6: FINAL BUILD
npx next build must pass with ZERO errors.
git add . && git commit -m "Phase 6 complete: all verified" && git push

