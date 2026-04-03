Read the entire src/ directory before making any changes.

## TASK: Modern SaaS UX Polish — Linear/Notion/Stripe Design Patterns

Apply the design vocabulary that defines best-in-class SaaS in 2026. Every interaction should feel snappy, every element intentional.

---

### PART 1: DESIGN SYSTEM CONSISTENCY

Apply these rules GLOBALLY across every page and component:

**Typography:**
- Primary font: 'Inter' or 'Plus Jakarta Sans' (check which is already imported, use that)
- Headings: font-semibold, text-white (on dark) or text-gray-900 (on light)
- Body: text-gray-300 (on dark) or text-gray-600 (on light), font-normal
- Captions: text-gray-500, text-sm
- NO mixing of font families within the same page
- Letter-spacing: -0.025em on headings (tighter, like Linear)

**Spacing:**
- Use an 8px spacing scale: 8, 16, 24, 32, 40, 48, 64
- Consistent padding on cards: 24px
- Consistent gap between cards: 16px
- Page margins: 24px on mobile, 32-48px on desktop

**Colors:**
- Primary: emerald-500 (#10B981) for actions, active states, success
- Backgrounds: gray-950 or gray-900 (dark mode), white (light mode)
- Cards: bg-white/5 with backdrop-blur on dark, bg-white with shadow-sm on light
- Borders: border-white/10 on dark, border-gray-200 on light
- Text accents: emerald-400 for links, highlights
- Danger: red-500 for errors, violations
- Warning: amber-500 for caution
- DO NOT use random colors — everything should be emerald, neutral grays, or semantic (red/amber/green)

**Cards:**
- All cards: rounded-xl (12px border radius)
- Subtle border: 1px solid rgba(255,255,255,0.06)
- Hover state: slight brightness increase or border color change
- No heavy shadows — use subtle ones only

**Buttons:**
- Primary: bg-emerald-600 hover:bg-emerald-500, text-white, rounded-lg, px-4 py-2.5
- Secondary: bg-white/5 hover:bg-white/10, text-white, border border-white/10
- Ghost: bg-transparent hover:bg-white/5, text-gray-400
- All buttons: min-height 40px, transition-all duration-150
- Disabled state: opacity-50, cursor-not-allowed

---

### PART 2: ANIMATIONS AND TRANSITIONS

**Page transitions:**
- Fade in content on route change (opacity 0→1, 200ms)
- Cards stagger in on page load (each card 50ms delay)

**Micro-interactions:**
- Buttons: scale(0.98) on click (active state), 100ms
- Cards: subtle translateY(-1px) on hover
- Modals/panels: slide in from right (panel) or fade+scale (modal), 200ms
- Toasts: slide in from top-right, auto-dismiss after 5 seconds

**Loading states:**
- Skeleton loaders for content (pulsing gray rectangles matching content shape)
- NOT just a spinner — show the layout shape while loading
- For AI operations (risk score, CAM audit): show a progress message that updates

---

### PART 3: SIDEBAR REFINEMENT

The left sidebar should follow the Linear pattern:

1. **Structure:**
   - Logo/brand at top (Provelo + "PV" icon)
   - Main nav: Dashboard, Portfolio, Settings
   - Divider
   - "Your Locations" section header
   - List of locations (each with icon + name)
   - "Add Location" button at bottom

2. **Collapsible:** 
   - Toggle button at top to collapse sidebar to just icons (48px width)
   - Remember collapsed state in localStorage
   - On mobile: sidebar is a drawer that slides in from left, overlay behind it

3. **Active state:** emerald left border (3px) + bg-white/5 on the active nav item

4. **Location list:**
   - Each location shows: small colored dot (green if active lease, yellow if expiring soon, red if expired) + location name
   - Truncate long names with ellipsis
   - Hover shows full name in tooltip

---

### PART 4: DATA TABLES (Stripe-style)

Any table in the app (obligation matrix, portfolio data, notifications list) should follow Stripe's data table pattern:

- Clean, sortable columns with subtle header styling
- Hover state on rows (bg-white/3)
- Clickable rows that navigate to detail
- Compact but readable (14px body text, 12px headers)
- Sticky header on scroll
- No heavy borders — use alternating subtle backgrounds or thin bottom borders only

---

### PART 5: RENT ESCALATION TIMELINE TEXT BRIGHTNESS

The rent escalation timeline text, once populated, is too grey/dim and hard to read. Fix:
- Active/populated text: text-white or text-gray-100 (bright, high contrast)
- Placeholder/empty text: text-gray-500 (dim, clearly a placeholder)
- Ensure sufficient contrast ratio (minimum 4.5:1 per WCAG AA)

---

### PART 6: CRITICAL DATES COLORS ON DASHBOARD

Fix the critical dates display:
- Past dates (already happened): text-gray-500, subtle "Passed" badge
- Future within 30 days: text-red-400, red badge — URGENT
- Future 31-90 days: text-amber-400, amber badge — APPROACHING
- Future 90+ days: text-emerald-400, green badge — HEALTHY
- Lease expiration with 19.5 years remaining: MUST be green, not grey
- Sort: upcoming dates first (nearest at top), past dates at bottom

---

### PART 7: REMOVE PRICING PLACEHOLDERS

Remove any hardcoded pricing (like "$15/team member") from the settings or team page. Replace with:
- "Team collaboration" section
- "Invite team members" functionality
- No price shown — pricing will be determined later
- If there's a pricing page or upgrade CTA, show "Contact us for pricing" or remove it entirely

---

Run npx next build to verify. Fix ALL errors.
Then: git add . && git commit -m "Phase 2 Task 07: Modern SaaS UX polish - Linear/Notion/Stripe patterns" && git push

