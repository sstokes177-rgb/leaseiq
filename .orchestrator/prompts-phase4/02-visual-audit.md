Read the entire src/ directory before making any changes.

## TASK: Visual/UI Audit — Fix Empty Spaces, Add Professionalism, Institutional Feel

The app currently has too much empty space, inconsistent styling, and doesn't feel like a serious institutional product. Fix everything.

---

### PRINCIPLE: No empty space without purpose

Every section of the app should feel intentionally designed. Empty space should be "breathing room" between elements, NOT blank voids that make the page look unfinished.

### AUDIT EVERY PAGE:

**Dashboard (src/app/dashboard/page.tsx):**
- Stats cards should fill the full width in a clean grid (2 or 3 columns on desktop, 1 on mobile)
- If there's space below the cards, add: recent activity feed, quick actions, or portfolio summary
- If the user has no locations: the empty state should fill the viewport center — large, inviting, not a tiny message in the corner
- Remove any spacing larger than gap-6 between cards
- All cards should be the same height in a row (use grid with auto-rows or items-stretch)

**Location detail page (src/app/location/[id]/page.tsx):**
- Tab content area: minimum height so it never looks like an empty page
- Overview tab: lease summary should fill more width (max-w-4xl or wider), reduce inner padding if cards feel too spacious
- Risk & Compliance tab: if risk score hasn't been analyzed yet, show a prominent CTA card that fills the space
- Financial tab: if no CAM data, show an explanatory card about what this section does
- Documents tab: document list + upload zone should fill available space
- Chat tab: historical conversations list should fill the space, not a tiny "Open Chat" button centered in a void
- Between the location header and tabs: reduce vertical space. Header → buttons → tabs should feel compact and connected, not spread apart

**Portfolio page:**
- Charts should fill available width
- Below charts: if no data, show helpful empty states
- Heatmap table: full width

**Settings page:**
- Form fields should have reasonable max-width (640px), centered
- Remove excessive spacing between sections

---

### SPECIFIC VISUAL FIXES:

1. **Tab bar (location page):** Remove the dark band background. Tabs should use underline style (active = emerald bottom border, no pill background). Left-aligned, not centered.

2. **Card consistency:** Every card across the app must use:
   - bg-white/[0.03] (NOT bg-white/5 or bg-gray-800 or other variants)
   - border border-white/[0.06]
   - rounded-xl
   - p-6 (consistent padding)
   - NO heavy shadows

3. **Button consistency:**
   - Primary: bg-emerald-600 hover:bg-emerald-500 (NOT gradient — clean solid color)
   - Secondary: bg-transparent border border-white/[0.1] text-gray-300 hover:text-white hover:bg-white/[0.05]
   - Remove any gradient buttons — they look dated. Use solid colors.

4. **Typography consistency:**
   - Page titles: text-2xl font-semibold text-white
   - Section headers: text-lg font-medium text-white
   - Body: text-sm text-gray-300 (or text-base for important content)
   - Labels: text-xs uppercase tracking-wider text-gray-500
   - NO mixing of text sizes within the same context

5. **Reduce "Ask Your Lease" and "Upload Documents" button sizes:** They're too large and dominate the page. Make them normal-sized buttons that sit naturally below the header:
   - Remove the oversized width — auto width based on content
   - Smaller padding: px-5 py-2.5 (not px-8 py-4)
   - Keep the emerald primary style but tone down the prominence
   - They should feel like useful actions, not the ENTIRE purpose of the page

6. **Loading skeletons:** Replace any remaining spinners with skeleton loaders that match the content shape. Pulsing animation: animate-pulse bg-white/[0.06] rounded.

7. **Hover states on all interactive elements:** Every clickable thing should have a visible hover transition (opacity change, background change, or subtle scale).

---

### INSTITUTIONAL FEEL CHECKLIST:

- [ ] Consistent 8px spacing grid
- [ ] No element wider than its container
- [ ] All text is readable (contrast ratio 4.5:1+)
- [ ] No orphaned labels or headings without content
- [ ] Every loading state uses skeletons, not spinners
- [ ] Every error state has a helpful message, not a raw error
- [ ] No console errors
- [ ] Colors limited to: emerald (action), gray (neutral), red (danger), amber (warning)
- [ ] Animations are subtle (150-200ms, not flashy)

---

Run npx next build — fix ALL errors.
Then: git add . && git commit -m "Phase 4: Visual audit - fix empty spaces, professionalism, institutional feel" && git push

