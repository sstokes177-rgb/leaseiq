Read the entire src/ directory before making any changes.

## TASK: Mobile Responsive Overhaul

Every page must work perfectly on mobile (320px-768px). Provelo users are commercial tenants — they check their lease info on phones during property visits, meetings, and calls.

---

### RESPONSIVE RULES (apply to ALL pages):

**Breakpoints:**
- Mobile: 0-639px
- Tablet: 640-1023px
- Desktop: 1024px+

**Navigation:**
- Mobile: sidebar becomes a hamburger menu drawer (slide in from left with overlay)
- Hamburger icon: top-left, 44px touch target
- When drawer opens: overlay behind it, close on tap outside or swipe left
- Bottom nav bar (optional): Dashboard, Chat, Upload, Settings — 4 icons max

**Cards and grids:**
- Desktop 2-3 column grids → mobile single column, full width
- Card padding: 16px on mobile (24px on desktop)
- No horizontal scrolling — everything stacks vertically

**Typography:**
- Body text: 16px minimum on mobile (never smaller)
- Headings: scale down proportionally but never below 20px for h1
- Line height: 1.5-1.6 on mobile

**Touch targets:**
- All interactive elements: minimum 44px × 44px
- Buttons: full width on mobile, padding: 14px 16px
- Links in lists: full-row tap target
- Form inputs: min-height 48px, font-size 16px (prevents iOS zoom)

**Specific pages:**

**Dashboard:**
- Stats cards: 2 per row on mobile (or stack to 1 if text overflows)
- Charts: full width, adjust aspect ratio for portrait orientation
- Critical dates: list view, no table

**Location detail page:**
- Action buttons (Ask Your Lease, Upload): stack vertically, full width
- Lease summary: single column
- Obligation matrix: horizontal scroll with sticky first column, or transform to a list view
- Risk score: full width card

**Chat interface:**
- Chat bubbles: max-width 90% (not 88%)
- Input bar: fixed to bottom, safe area padding for notch phones
- Citation panel: opens as FULL SCREEN modal (not side panel), close button top-right (44px)
- Chat history sidebar: opens as a drawer from left (same as nav)

**Tables:**
- Any table wider than viewport: either horizontal scroll with sticky first column, or transform to a card/list view on mobile
- Do NOT show tables with 5+ columns on mobile — transform to cards

**Modals:**
- On mobile: all modals become full-screen with a top bar (close X, title)
- Bottom sheets for short actions (confirmation dialogs)

---

### TESTING CHECKLIST

After making changes, verify with browser dev tools at these widths:
- 375px (iPhone SE/13 Mini)
- 390px (iPhone 14/15)
- 768px (iPad mini/tablet)

Check:
- No horizontal scrolling on any page
- All text is readable without zooming
- All buttons are tappable
- Chat input doesn't get hidden behind the keyboard
- Forms are usable

---

Run npx next build to verify. Fix ALL errors.
Then: git add . && git commit -m "Phase 2 Task 09: Mobile responsive overhaul" && git push

