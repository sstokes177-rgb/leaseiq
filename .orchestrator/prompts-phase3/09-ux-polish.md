Read the entire src/ directory before making any changes.

## TASK: Global UX Polish — Linear/Notion/Stripe Design System

Apply consistent design patterns across EVERY page and component. The goal: every interaction feels snappy, every element intentional, the app feels like it was designed by a top-tier SaaS team.

---

### DESIGN TOKENS (apply globally)

**Typography:**
- Font: use whatever is already imported (Inter or Plus Jakarta Sans). Do NOT add new fonts.
- Headings: font-semibold text-white tracking-tight
- Body: text-gray-300 font-normal
- Captions: text-gray-500 text-sm
- Letter-spacing on large headings: -0.025em (tighter, like Linear)
- NEVER mix fonts on the same page

**Spacing (8px scale):**
- Card padding: 24px (p-6)
- Gap between cards: 16px (gap-4)
- Section spacing: 48px (py-12)
- Page margins: 24px mobile, 32-48px desktop

**Colors (enforce everywhere):**
- Primary action: emerald-500 (#10B981)
- Card backgrounds: bg-white/[0.03] with backdrop-blur-sm (NOT solid gray backgrounds)
- Card borders: border border-white/[0.06]
- Active/selected: emerald left border, bg-white/[0.05]
- Text links: text-emerald-400 hover:text-emerald-300
- Danger: red-500
- Warning: amber-500
- Success: emerald-500
- DO NOT USE random colors — everything is emerald, neutral grays, or semantic

**Buttons (standardize):**
- Primary: bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg px-4 py-2.5 font-medium transition-all
- Secondary: bg-white/[0.05] hover:bg-white/[0.08] text-white border border-white/[0.1] rounded-lg px-4 py-2.5
- Ghost: bg-transparent hover:bg-white/[0.05] text-gray-400 hover:text-white rounded-lg px-3 py-2
- Destructive: bg-red-600/10 hover:bg-red-600/20 text-red-400 border border-red-500/20 rounded-lg
- ALL buttons: min-h-[40px] transition-all duration-150
- Loading state: spinner icon + disabled, opacity-70

**Cards (standardize):**
- ALL cards: rounded-xl (12px radius)
- Border: border border-white/[0.06]
- Background: bg-white/[0.03] backdrop-blur-sm
- Hover: border-white/[0.1] transition-colors
- No heavy drop shadows — minimal or none

---

### ANIMATIONS

**Page content:** Fade in on mount (opacity 0→1, 200ms)
**Cards:** Stagger in on page load (each card 50ms delay, translateY 8→0, opacity 0→1)
**Modals/panels:** Slide in from right for panels, fade+scale for modals (200ms)
**Buttons:** Active state scale(0.98) for 100ms
**Toasts:** Slide in from top-right, auto-dismiss 5 seconds
**Skeleton loaders:** For every component that fetches data, show pulsing skeleton shapes matching the content layout (NOT just a spinner)

---

### SIDEBAR REFINEMENT

Fix the sidebar to match the Linear pattern:

1. Structure (top to bottom):
   - Logo: "PV" icon + "Provelo" text
   - Main nav: Dashboard, Portfolio, Settings
   - Divider (thin line, border-white/[0.06])
   - "Locations" section label (text-xs uppercase text-gray-500 tracking-wider px-4)
   - Location list (each with colored status dot + name)
   - "Add Location" button at bottom (ghost style)

2. Active state: 3px emerald left border + bg-white/[0.05] on active nav item

3. Location status dots:
   - Green: active lease, >2 years remaining
   - Yellow: lease expiring within 2 years
   - Red: lease expired or <6 months remaining
   - Gray: no lease data uploaded

4. Collapsible: button at top to collapse to icons only (48px width). Store state in localStorage.

---

### RENT ESCALATION TIMELINE BRIGHTNESS

In RentEscalationTimeline.tsx:
- Populated/active text: text-white or text-gray-100 (bright, high contrast)
- Placeholder text: text-gray-500
- Ensure WCAG AA contrast ratio (4.5:1 minimum)

### CRITICAL DATES COLORS

In CriticalDatesCard.tsx:
- Past dates: text-gray-500, "Passed" badge
- Future <30 days: text-red-400, "Urgent" badge (bg-red-500/10 border-red-500/20)
- Future 30-90 days: text-amber-400, "Approaching" badge
- Future >90 days: text-emerald-400, "On Track" badge
- Lease with 19.5 years remaining: MUST be green
- Sort: nearest upcoming first, past at bottom

---

### GLOBAL CONSISTENCY PASS

Go through EVERY component file and ensure:
1. All cards use the same border radius, background, and border styles
2. All buttons use the standardized styles above
3. All loading states use skeleton loaders (not just spinners)
4. All error states have user-friendly messages (not raw error strings)
5. No component uses hardcoded colors that don't match the palette
6. All interactive elements have hover transitions

---

Run npx next build to verify. Fix ALL errors.
Then: git add . && git commit -m "Phase 3: Global UX polish - Linear/Notion/Stripe design system" && git push

