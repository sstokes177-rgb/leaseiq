Read the entire src/ directory before making any changes.

## TASK: Comprehensive Frontend Audit

### PAGE-BY-PAGE: Verify each loads without errors, data displays, buttons work, loading states, error states, dark theme consistent, navigation works, text readable.
Pages: /, /login, /signup, /forgot-password, /reset-password, /verify-email, /dashboard, /dashboard/portfolio, /dashboard/[storeId], /dashboard/[storeId]/chat, /settings, /auth/callback

### COMPONENTS: No TypeScript errors, no missing key props, no memory leaks, proper error boundaries, accessible (aria-labels, alt text), no console.log in production.

### VISUAL: All cards same style, buttons consistent, text hierarchy correct, spacing consistent, Provelo logo "PV" correct.

### FUNCTIONALITY: Upload->process->chat works, citations clickable->panel opens, sidebar links work, auth flows work, search/filter on dashboard works, settings save.

FIX ALL ISSUES FOUND. Run npx next build AND npx tsc --noEmit. Fix all errors.
