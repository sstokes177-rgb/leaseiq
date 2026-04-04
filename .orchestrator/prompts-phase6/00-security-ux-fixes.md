Read the entire src/ directory before making any changes.

## TASK: Security + UX Fixes — Password Email-Only, Dashboard List View, About Page, Dispute Letter

---

### FIX 1: PASSWORD CHANGES VIA EMAIL ONLY

Security concern: if someone hacks an account, they should NOT be able to change the password from within the app settings. Password changes must only happen via email verification.

In the settings page (src/app/settings/page.tsx or wherever password change is):
1. REMOVE the "Change Password" form entirely (current password field, new password field, confirm field)
2. Replace it with a single button: "Reset Password via Email"
3. When clicked, call supabase.auth.resetPasswordForEmail(user.email) — this sends a password reset link to the user's email
4. Show a success message: "A password reset link has been sent to your email address. Check your inbox to set a new password."
5. The user must click the link in their email to change their password — no in-app password changing at all
6. Style the button as secondary (not primary) since it's not a frequent action

Also check the forgot-password and reset-password pages still work correctly for the email-based flow.

---

### FIX 2: DASHBOARD LOCATION VIEW TOGGLE (LIST VIEW + GRID VIEW)

On the dashboard where locations are shown as grid cards, add a toggle to switch between Grid View and List View.

**Toggle UI:**
- Two small icon buttons in the top-right of the locations section
- Grid icon (LayoutGrid from lucide-react) — active when grid view is selected
- List icon (List from lucide-react) — active when list view is selected
- Active state: bg-white/[0.1] text-emerald-400
- Inactive: text-gray-500 hover:text-gray-300
- Store preference in localStorage: provelo_location_view

**Grid View (current):**
- Keep as-is — the current block/card layout

**List View (NEW):**
- Clean table/list layout
- Each location is a row with columns:
  - Status dot (red/yellow/green)
  - Location name (font-medium text-white, clickable)
  - Shopping center / address (text-sm text-gray-400)
  - Risk score (colored badge: green/yellow/red with number)
  - Lease expiry date (with "X years remaining" or "Expired" badge)
  - Document count
  - Right arrow icon (clickable, navigates to location detail)
- Row hover: bg-white/[0.03] transition
- Click anywhere on row: navigates to /location/[id]
- Clean borders between rows: border-b border-white/[0.06]
- Mobile: hide some columns (risk score, document count), show essential info only

---

### FIX 3: ABOUT PAGE — REMOVE GRADIENT BAR ABOVE UPLOAD & UNDERSTAND SECTION

Open src/app/about/page.tsx. Find section 2 ("Upload & Understand") and the area above it.

Remove ANY of these that create a visible dark bar/band:
- Gradient backgrounds (bg-gradient-to-b, bg-gradient-to-t)
- Semi-transparent dark overlays
- Borders or dividers between sections that create a harsh line
- Any element with a noticeably different background color that creates a "bar" effect

Each section should flow smoothly into the next. Use either:
- Completely transparent backgrounds on all sections
- OR very subtle alternating backgrounds: bg-transparent and bg-white/[0.01] — so subtle they're barely noticeable
- NO visible edges, bars, or gradient strips between sections

Test by looking at the page — there should be no visible horizontal bars or color strips anywhere.

---

### FIX 4: CAM AUDIT DISPUTE LETTER BUTTON

The "Generate Dispute Letter" button is missing from the CAM audit results.

Open src/components/CamAuditCard.tsx (or wherever CAM audit results are displayed).

1. Check if the dispute letter functionality exists:
   - Search for "dispute" in the component
   - Check if there's a button that's conditionally rendered
   - Check if the condition is wrong (maybe it checks for a field that doesn't exist in the data)

2. If the button exists but isn't showing:
   - The condition is likely checking findings.some(f => f.status === 'violation_found') or similar
   - Log the actual findings data to see what status values are returned
   - Fix the condition to match the actual data

3. If the button doesn't exist at all, add it:
   - Show ONLY when the audit has completed AND at least one finding has a violation
   - Button text: "Generate Dispute Letter"
   - Position: below the findings list, prominent but not overwhelming
   - Style: bg-red-600/10 text-red-400 border border-red-500/20 hover:bg-red-600/20 rounded-lg px-5 py-3
   - Icon: FileText from lucide-react

4. On click, call POST /api/cam-audit/dispute-letter with the audit_id
   - If this API route doesn't exist, create it at src/app/api/cam-audit/dispute-letter/route.ts
   - It should: fetch the audit findings, fetch store details, fetch lease CAM provisions from document_chunks, send to Claude with a dispute letter prompt, return the generated letter text

5. After generation, show the letter in a modal:
   - Full letter text in a scrollable area with monospace font
   - "Copy to Clipboard" button
   - "Download as PDF" button
   - "Edit" mode toggle that makes the text editable before copying/downloading
   - Close button

---

### FIX 5: LEASE SUMMARY DATE EXTRACTION IMPROVEMENT

The Whole Foods lease shows "March 2, 2004 → March 1, 2024" but the actual lease runs through September 30, 2045. The AI is pulling dates from the original base lease and ignoring amendments/renewals.

Open src/app/api/lease-summary/generate/route.ts (or wherever lease summaries are generated).

Update the system prompt to include:

"CRITICAL: When extracting lease dates, you MUST check ALL documents — base lease, amendments, commencement letters, exhibits, and side letters. Amendments frequently modify the lease term, expiration date, and renewal options. The MOST RECENT document's dates take precedence over earlier documents. If an amendment extends the lease term, use the AMENDED expiration date, not the original. If a commencement letter confirms different dates than the base lease, use the commencement letter dates.

Search specifically for these terms across all documents: expiration, termination, term, renewal, extend, extension, amended term, lease year, commencement.

If the base lease says one date but an amendment says a different date, always use the amendment date and note it came from the amendment."

Also: when fetching chunks for the summary, search specifically for date-related chunks:
- Query chunks WHERE content ILIKE ANY of: '%expir%', '%terminat%', '%commence%', '%renewal%', '%extension%', '%amended term%', '%lease year%', '%term of%'
- Include these chunks IN ADDITION to the regular chunks sent to the AI
- This ensures the date information is always in the context even if the vector search didn't surface it

---

Run npx next build — fix any errors.
Then: git add . && git commit -m "Phase 6: Password email-only, dashboard list view, about page fix, dispute letter, date extraction" && git push

