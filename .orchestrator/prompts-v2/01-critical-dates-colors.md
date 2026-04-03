Read the entire src/ directory before making any changes.

## TASK: Fix critical dates color logic and rent escalation text brightness

### FIX 1: CRITICAL DATES COLOR CODING
Current logic shows lease expirations 19.5 years out as GREY instead of GREEN. Fix:
- RED: 0-30 days away (urgent)
- YELLOW/AMBER: 31-90 days away (upcoming)
- GREEN: More than 90 days away AND lease is active (healthy)
- GREY: Date is in the past (expired/completed)

Apply to ALL critical dates: lease expiration, renewal deadlines, CAM objection windows, insurance renewals, rent escalation dates, option exercise dates.

### FIX 2: RENT ESCALATION TIMELINE TEXT BRIGHTNESS
The rent escalation timeline text is too dim/grey. Fix:
- Change text from grey/muted to white or near-white (text-white/90 or text-gray-200)
- All labels, amounts, dates, period descriptions must be clearly readable
- Current period highlighted with emerald accent
- Future periods clearly visible (not dimmed)
- Past periods slightly muted but still readable

### FIX 3: LEASE EXPIRATION DISPLAY
Ensure location detail page shows expiration date, time remaining, and GREEN color badge for far-future active leases.

Run npx next build to verify. Fix any errors.
