Read the entire src/ directory before making any changes.

## TASK: Mobile Responsive Overhaul + Export Improvements

Stripe's mobile companion app focuses on exactly two use cases: morning review of yesterday's numbers and quick lookups. Provelo's mobile experience should prioritize: checking critical dates, asking quick lease questions, and viewing risk scores.

---

### PART 1: MOBILE RESPONSIVE (every page)

**Breakpoints:**
- Mobile: 0-639px (sm)
- Tablet: 640-1023px (md)
- Desktop: 1024px+ (lg)

**Global mobile rules:**
- Sidebar: hidden by default, hamburger icon (top-left, 44px) opens as drawer overlay
- All body text: minimum 16px (prevents iOS zoom on inputs too)
- All touch targets: minimum 44x44px
- No horizontal scrolling on any page
- Cards: full width, stack vertically
- Multi-column grids → single column on mobile
- Input fields: min-h-[48px], font-size 16px

**Dashboard mobile:**
- Stats cards: 2 per row (2 columns), or stack if text overflows
- Any charts: full width, taller aspect ratio for portrait
- Critical dates: list view only (no table)

**Location detail page mobile:**
- Action buttons (Ask Your Lease, Upload): stack vertically, full width
- All cards: single column, full width
- Obligation matrix: transform to a list of cards (not a table), or horizontal scroll with sticky first column
- Risk score: full width card, clause list stacks normally

**Chat mobile:**
- Full screen experience
- Chat bubbles: max-width 92%
- Input bar: fixed bottom, with safe-area-inset-bottom padding for notch phones
- Citation panel: FULL SCREEN modal (not side panel), close button top-right 44px
- Chat sidebar: drawer from left (same as nav)

**Portfolio mobile:**
- Charts: full width, scrollable container
- Heatmap table: horizontal scroll with sticky first column, or transform to cards
- Stats: 2 per row

**Tables anywhere:**
- Tables with 4+ columns: horizontal scroll on mobile with sticky first column
- OR transform to card/list view (each row becomes a card)

**Modals on mobile:**
- All modals: full screen with top bar (close X + title)
- No small centered modals on mobile — they're hard to interact with

---

### PART 2: EXPORT IMPROVEMENTS

Add comprehensive export options across the app:

**Lease Summary Export (PDF):**
- On location page, add "Export Summary" button
- Generates a professional PDF containing:
  - Location name, address, lease dates
  - Key lease terms (rent, escalations, CAM, renewal options)
  - Critical dates list
  - Risk score summary with clause ratings
  - Obligation matrix
- Use the existing PDF export utility (src/lib/pdfExport.ts)
- Style: clean, professional, branded with Provelo logo

**Risk Score Export (PDF):**
- "Export Risk Report" button on RiskScoreCard
- PDF containing: overall score, all clause ratings with summaries, top 3 negotiation priorities with suggested language

**CAM Audit Export (PDF):**
- Already partially implemented — enhance to include:
  - Summary header with total potential overcharge
  - Each finding with rule name, status, estimated overcharge, explanation
  - Dispute letter (if generated)

**Portfolio Export (CSV/Excel):**
- "Export Portfolio Data" button on portfolio page
- CSV with columns: Location, Address, Risk Score, Lease Expiry, Annual Rent, Rent/SF, Top Risk, CAM Total
- Use a simple CSV generation (no heavy library needed):
```typescript
function generateCSV(data: any[], headers: string[]): string {
  const rows = [headers.join(',')]
  for (const item of data) {
    rows.push(headers.map(h => `"${item[h] ?? ''}"`).join(','))
  }
  return rows.join('\n')
}
```

---

Run npx next build to verify. Fix ALL errors.
Then: git add . && git commit -m "Phase 3: Mobile responsive overhaul + export improvements" && git push

