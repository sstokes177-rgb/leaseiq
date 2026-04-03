Read the entire src/ directory before making any changes.

## TASK: Modern SaaS UX Polish

### DESIGN CONSISTENCY (apply globally):
Typography: Plus Jakarta Sans/Inter. Headings=font-semibold text-white. Body=text-gray-300 (NOT gray-500/600). Muted=text-gray-400 minimum.
Background: dark (#0f1117 or gradient). Cards: bg-white/5 backdrop-blur-sm border-white/10 rounded-xl p-6.
Primary: emerald-500. Buttons: primary=bg-emerald-500 text-white, secondary=border-emerald outlined, ghost=transparent.
Spacing: p-6 cards, gap-4/gap-6 between sections, px-4 md:px-8 page padding.
All buttons: min-h-[40px], transition-all duration-200.
Nav: collapsible left sidebar (not top bar). Active=bg-white/10 text-white emerald left border.

### AUDIT EVERY PAGE:
Landing, login/signup, dashboard, location detail, chat, settings, portfolio. Fix: broken layouts, dim text, inconsistent cards, missing loading states, missing error states.

### LOADING STATES for every async: skeleton loaders, chat typing dots, upload progress bar.
### ERROR STATES: helpful messages, never raw errors/stack traces.

Run npx next build to verify. Fix any errors.
