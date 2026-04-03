Read the entire src/ directory before making any changes.

## TASK: Complete Mobile Responsive Overhaul (375px)

Fix EVERY page at 375px:
- Landing: hero wraps, CTAs full width, features/pricing stack
- Login/Signup: form centered, inputs full width
- Dashboard: sidebar=hamburger menu, cards stack, search full width, stats 2x2
- Location detail: buttons stack full width, tabs horizontal scroll
- Chat: sidebar hidden (toggle icon), messages max-w-[90%], input fixed bottom with safe area, PDF panel=full screen overlay
- Settings: fields full width, sections stack
- Portfolio: charts resize, stats 2-column, tables horizontal scroll

### GLOBAL:
Min touch target: 44x44px. Body text min 16px. Input font 16px (prevents iOS zoom).
Viewport meta: width=device-width, initial-scale=1, maximum-scale=1.
No horizontal overflow. Bottom safe area padding.

### HAMBURGER MENU:
Three-line icon top-left on mobile. Full-height sidebar overlay (bg-black/50, slides from left). Close on X/tap outside.

Run npx next build to verify. Fix any errors.
