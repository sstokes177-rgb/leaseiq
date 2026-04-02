# Task 16: Rebrand from Provelo to ClauseIQ

Read the entire src/ directory before making any changes.

## Project Context

This is a Next.js 16 (App Router, TypeScript) web app currently called "Provelo" for commercial retail tenants. The app needs to be rebranded to **ClauseIQ**. If "clauseiq" domain is taken, use **TENORA** instead — but default to ClauseIQ.

### Styling Rules (DO NOT CHANGE — keep exact same design)
- Dark theme: body gradient `linear-gradient(160deg, #1a1d25 0%, #13151d 55%, #0f1118 100%)`
- Emerald accents: `#10b981`
- Font: Plus Jakarta Sans
- Glass cards: all existing card styles
- All colors, animations, layouts remain identical

---

## What This Task Must Do

Replace ALL instances of "Provelo" with "ClauseIQ" throughout the entire codebase. This is PURELY cosmetic — do NOT change any functionality, API logic, database schema, or code behavior.

### Step 1: Search and Replace in Source Files

Search for ALL occurrences of "Provelo" (case-sensitive) and "provelo" (case-insensitive) across the entire `src/` directory and project config files.

**Files that DEFINITELY contain "Provelo" (read and update each):**

1. **`src/app/layout.tsx`** — Metadata title and description:
   ```
   title: "Provelo — Understand Your Lease"
   description: "Ask plain-language questions about your commercial lease..."
   ```
   Change to:
   ```
   title: "ClauseIQ — Understand Your Lease"
   description: "Ask plain-language questions about your commercial lease..."
   ```

2. **`src/components/LandingPage.tsx`** — Multiple occurrences:
   - Nav logo text: `<span className="font-bold text-sm tracking-tight">Provelo</span>`
   - Hero section (if any text mentions Provelo)
   - Example questions section: "Provelo answers every one..."
   - CTA: "Join retail tenants who use Provelo..."
   - Footer: `<span className="text-sm font-bold text-foreground/80">Provelo</span>`
   - Footer disclaimer: "Provelo provides informational summaries..."
   - Footer copyright: "© {year} Provelo"
   
   Replace ALL with "ClauseIQ".

3. **`src/app/dashboard/page.tsx`** — Header logo text:
   ```
   <span className="font-bold text-base tracking-tight">Provelo</span>
   ```

4. **`src/app/location/[id]/page.tsx`** — Header logo text (same pattern)

5. **`src/app/settings/page.tsx`** — Header logo text

6. **`src/app/upload/page.tsx`** — Logo text:
   ```
   <span className="hidden sm:block text-sm font-bold tracking-tight text-foreground/80">Provelo</span>
   ```

7. **`src/app/chat/page.tsx`** — Legal disclaimer:
   ```
   Provelo provides informational summaries only — not legal advice.
   ```

8. **`src/components/ChatMessage.tsx`** — Response disclaimer:
   ```
   Informational summary based on your uploaded documents — not legal advice.
   ```
   (This one may not mention Provelo by name, but check.)

9. **`src/app/onboarding/client.tsx`** — Any welcome text that mentions Provelo

10. **`src/app/login/page.tsx`** — Any branding text

11. **`CLAUDE.md`** — Project description:
    ```
    # Provelo — Project Context for Claude Code
    ```
    Change to:
    ```
    # ClauseIQ — Project Context for Claude Code
    ```
    Update ALL references throughout the file.

12. **`package.json`** — Name field:
    ```
    "name": "provelo"
    ```
    Change to:
    ```
    "name": "clauseiq"
    ```

13. **`src/lib/pdfExport.ts`** (if exists) — PDF header text "Provelo"

### Step 2: Update Logo/Icon Initials

The app uses a `FileText` or `FileSearch` icon from lucide-react inside a small emerald gradient box as its logo. This doesn't need to change — it's an icon, not text initials. BUT if anywhere in the code there are letter initials displayed (like "LI" for Provelo), change them to "CQ" for ClauseIQ.

Search for any hardcoded initials patterns.

### Step 3: Comprehensive Search

Use grep/search to find ALL remaining occurrences:

```bash
# Search for all case variations
grep -ri "provelo" src/
grep -ri "provelo" CLAUDE.md
grep -ri "provelo" package.json
grep -ri "provelo" README.md  # if exists
grep -ri "lease.iq" src/      # in case of Lease.IQ or Lease-IQ
```

Also search for:
- `"Provelo"` (quoted)
- `Provelo` (unquoted in JSX)
- `provelo` (lowercase, e.g., in URLs, file names, CSS classes)
- Any meta tags, open graph tags, or SEO-related content

### Step 4: Files to NOT Change

Do NOT change:
- Database table names or column names
- API route paths (keep `/api/lease-summary`, etc.)
- Internal variable names that use "lease" as a domain concept (e.g., `leaseSummary`, `leaseType`)
- The word "lease" when it refers to the actual lease document (e.g., "Upload your lease")
- Import paths
- Library/package references
- Git history

The rebrand is ONLY for the display name "Provelo" → "ClauseIQ". The word "lease" in general usage remains unchanged.

### Step 5: Verify Consistency

After all replacements, verify:
1. Every page header shows "ClauseIQ" (not "Provelo")
2. The landing page nav, hero, features, CTA, footer all say "ClauseIQ"
3. The chat disclaimer says "ClauseIQ"
4. The page title (browser tab) says "ClauseIQ"
5. CLAUDE.md references "ClauseIQ"
6. package.json name is "clauseiq"

### Step 6: Update PM Dashboard (if exists)

If `src/app/pm-dashboard/` exists, update any Provelo references there too.

### Step 7: Update Any i18n/Translation Files

If `src/lib/i18n.ts` exists, update:
- English translation: `'chat.disclaimer': 'ClauseIQ provides informational summaries only...'`
- Spanish translation: `'chat.disclaimer': 'ClauseIQ proporciona resúmenes informativos solamente...'`
- Any other mention of Provelo in translations

---

## Summary of Changes

This task is a find-and-replace operation. The key rule:

**"Provelo" → "ClauseIQ"** everywhere it appears as a brand name.
**"provelo" → "clauseiq"** in package.json name and any slug/identifier contexts.

DO NOT change:
- Functionality
- API routes
- Database schema
- Domain concepts (the word "lease" in general)
- Variable/function names

---

## Files to Modify (read each first)

1. `src/app/layout.tsx`
2. `src/components/LandingPage.tsx`
3. `src/app/dashboard/page.tsx`
4. `src/app/location/[id]/page.tsx`
5. `src/app/settings/page.tsx`
6. `src/app/upload/page.tsx`
7. `src/app/chat/page.tsx`
8. `src/components/ChatMessage.tsx`
9. `src/app/onboarding/client.tsx`
10. `src/app/login/page.tsx`
11. `CLAUDE.md`
12. `package.json`
13. `src/lib/pdfExport.ts` (if exists)
14. `src/lib/i18n.ts` (if exists)
15. `src/app/pm-dashboard/page.tsx` (if exists)
16. Any other files found via grep

---

Run `npx next build` to verify. Fix any errors.
