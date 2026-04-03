Read the entire src/ directory before making any changes.

## TASK: Interactive Critical Dates Calendar + Configurable Email Reminders

LeaseCake's Critical Date Alarms rate 9.0/10 on G2. Their system has configurable lead times (e.g., "remind me 210 days before lease expiration if notice is due at 180 days"), multiple reminders per event, and an interactive calendar. Build Provelo's version.

---

### PART 1: INTERACTIVE CALENDAR VIEW

Enhance the CriticalDatesCard (src/components/CriticalDatesCard.tsx) or create a new CriticalDatesCalendar component.

**Add a calendar view toggle:** The existing list view stays, but add a "Calendar" tab that shows a month-view grid.

**Calendar implementation (no heavy library — build a simple grid):**

```typescript
function MonthCalendar({ dates, month, year }: { dates: CriticalDate[], month: number, year: number }) {
  // Calculate days in month, first day of week, etc.
  // Render a 7-column grid (Sun-Sat)
  // Each day cell: number + colored dots for events on that day
  // Dot colors: red (<30 days), yellow (30-90), green (>90), gray (past)
  // Click a day with events: show a popover/tooltip listing the events
  // Navigation: prev/next month arrows
}
```

**Calendar cells:**
- Width: equal columns (14.28% each)
- Height: at least 80px to fit dots
- Today: subtle emerald ring
- Days with events: colored dot(s) below the number
- Click on a day: show popover with event list (each event shows: type, description, location)
- Hover on a dot: tooltip with event name

**Month navigation:**
- Left arrow: previous month
- Right arrow: next month
- Month/Year display in center: "April 2026"
- "Today" button to jump back

---

### PART 2: CONFIGURABLE REMINDERS

For each critical date, allow the user to set custom reminder lead times:

1. Add a "Set Reminder" button/icon next to each date in the list view
2. Clicking opens a small popover:
   - "Remind me X days before" — dropdown with options: 7, 14, 30, 60, 90, 120, 180, 210, 365 days
   - "Add another reminder" — allow multiple reminders per event (e.g., 180 days AND 30 days)
   - Save button

3. Update the critical_dates table:
```sql
ALTER TABLE critical_dates ADD COLUMN IF NOT EXISTS reminder_days INTEGER[] DEFAULT '{30}';
```

4. Display active reminders as small badges on the date item: "30d, 180d"

5. On dashboard/location load, check for dates within any active reminder window and generate notifications.

---

### PART 3: CROSS-LOCATION CRITICAL DATES

On the portfolio page and dashboard, show critical dates from ALL locations:

- Merge dates from all stores
- Include the store name on each date
- Sort by nearest upcoming first
- Color-code by urgency
- Group by: "This Month", "Next 3 Months", "Next 6 Months", "Beyond 6 Months"

---

Run npx next build to verify. Fix ALL errors.
Then: git add . && git commit -m "Phase 3: Interactive critical dates calendar + configurable reminders" && git push

