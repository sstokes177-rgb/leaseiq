# Task 14: Frontend Audit

Read the entire src/ directory before making any changes.

## Project Context

This is a Next.js 16 (App Router, TypeScript) web app called LeaseIQ for commercial retail tenants. Key tech:
- Tailwind CSS + shadcn/ui
- Vercel AI SDK for chat streaming
- Supabase Auth
- Plus Jakarta Sans font

### Styling Rules (reference for consistency checks)
- Dark theme: body gradient `linear-gradient(160deg, #1a1d25 0%, #13151d 55%, #0f1118 100%)`
- Emerald accents: `#10b981`
- Font: Plus Jakarta Sans (variable `--font-sans`)
- Glass cards: `glass-card` class
- Glass inputs: `glass-input` class
- Labels: `text-[10px] font-semibold text-white/35 uppercase tracking-widest`
- Card hover: `glass-card-lift` class

---

## What This Task Must Do

Perform a comprehensive frontend audit. Check every page and component for issues, then fix everything found.

### Audit Checklist

#### 1. Page Load Verification

Read and verify each page file compiles and renders without errors:

1. `src/app/page.tsx` — Landing page
2. `src/app/login/page.tsx` — Login/signup
3. `src/app/onboarding/page.tsx` + `src/app/onboarding/client.tsx` — Onboarding
4. `src/app/dashboard/page.tsx` — Dashboard
5. `src/app/location/[id]/page.tsx` — Location detail
6. `src/app/chat/page.tsx` — Chat interface
7. `src/app/upload/page.tsx` + `src/app/upload/client.tsx` — Upload
8. `src/app/settings/page.tsx` + settings client component — Settings
9. Any other pages that exist (pm-dashboard, etc.)

For each page, check:
- [ ] All imports resolve correctly
- [ ] TypeScript types are correct (no `any` where a specific type should be used)
- [ ] Props are passed correctly between server and client components
- [ ] `'use client'` directive is present on client components
- [ ] `export const dynamic = 'force-dynamic'` is on pages that need it
- [ ] No missing environment variables (all Supabase/API refs use existing env vars)

#### 2. Button and Link Verification

For every page, trace every button and link:

**Landing Page:**
- [ ] "Sign in" → `/login`
- [ ] "Get started" → `/login?mode=signup`
- [ ] "Go to Dashboard" (authenticated) → `/dashboard`
- [ ] Nav logo → `/`

**Dashboard:**
- [ ] "LeaseIQ" logo → `/`
- [ ] "Dashboard" nav link → `/dashboard`
- [ ] "Settings" nav link → `/settings`
- [ ] "Sign out" → POST `/api/auth/signout`
- [ ] "Add Location" button → triggers modal/form
- [ ] Each store card → `/location/{id}`

**Location Detail:**
- [ ] Back arrow → `/dashboard`
- [ ] "All locations" → `/dashboard`
- [ ] "LeaseIQ" logo → `/`
- [ ] "Upload documents" → `/upload?store={id}`
- [ ] "Start chatting" → `/chat?store={id}`
- [ ] "Sign out" → POST `/api/auth/signout`
- [ ] All "Generate" buttons call correct API endpoints

**Chat:**
- [ ] Back arrow → `/location/{storeId}` or `/dashboard`
- [ ] "Docs" button → `/upload?store={storeId}`
- [ ] LeaseIQ icon → `/`
- [ ] "New Chat" button creates new conversation
- [ ] Conversation sidebar items load conversation history
- [ ] Store switcher changes the active store
- [ ] Example question buttons send the question
- [ ] Send button submits the message
- [ ] Citation clicks open the side panel

**Upload:**
- [ ] Back arrow → correct location
- [ ] File input accepts PDF/DOCX
- [ ] Upload button sends file to API
- [ ] Store selector works

**Settings:**
- [ ] Back arrow → `/dashboard`
- [ ] "Dashboard" link → `/dashboard`
- [ ] Save button calls PUT `/api/settings`
- [ ] Language selector updates preference
- [ ] Notification toggles work

#### 3. Visual Consistency Check

For each page, verify:
- [ ] Background gradient is consistent (the dark theme gradient)
- [ ] All cards use `glass-card` class consistently
- [ ] All headers use `glass border-b border-white/[0.07]` pattern
- [ ] LeaseIQ branding is consistent (same icon, same text style)
- [ ] Emerald accent colors are used consistently for primary actions
- [ ] Loading states show proper skeletons (not blank screens)
- [ ] Error states show meaningful messages (not raw error text)
- [ ] Empty states have clear CTAs

#### 4. Text Readability Check

- [ ] No white text on light backgrounds
- [ ] No dark text on dark backgrounds
- [ ] Labels use `text-white/35` or similar muted colors
- [ ] Values use `text-white/85` for readability
- [ ] Legal disclaimers are visible but not obtrusive
- [ ] All text is legible at default zoom level

#### 5. Form Validation

For every form/input:
- [ ] Required fields are marked or handle empty submission
- [ ] Email inputs validate email format
- [ ] File inputs restrict to accepted types
- [ ] Buttons disable during submission (prevent double-click)
- [ ] Success/error feedback is shown to the user

#### 6. Component Quality Check

Read each component in `src/components/`:
- [ ] `LeaseSummaryCard.tsx` — loading/empty/data states all render correctly
- [ ] `ObligationMatrixCard.tsx` — loading/empty/data states, all responsibility types render
- [ ] `CamAnalysisCard.tsx` — loading/empty/data states
- [ ] `CamReconciliationCard.tsx` — upload + results states
- [ ] `PercentageRentCard.tsx` — config + entry form + calculations
- [ ] `OccupancyCostCard.tsx` — cost breakdown
- [ ] `RentEscalationTimeline.tsx` — timeline rendering
- [ ] `LeaseClauseCard.tsx` — found/not found states
- [ ] `ChatMessage.tsx` — user/assistant messages, citations, streaming
- [ ] `ChatInput.tsx` — input handling, submit
- [ ] `ChatSidebar.tsx` — conversation list, new chat
- [ ] `CitationSidePanel.tsx` — citation display
- [ ] `DashboardGrid.tsx` — search, filters, sort
- [ ] `LandingPage.tsx` — all sections render

#### 7. Error Handling Audit

Check that:
- [ ] API fetch calls have `.catch()` handlers or try/catch
- [ ] Network errors show user-friendly messages (not stack traces)
- [ ] Auth failures redirect to `/login` consistently
- [ ] Missing data shows empty states (not crashes)

#### 8. Performance Quick Check

- [ ] No unnecessary re-renders (check for missing dependency arrays in useEffect)
- [ ] Large lists are not rendered without limits
- [ ] Images use proper loading attributes if any exist
- [ ] No `console.log` statements in client components (remove any found — keep server-side logging)

### Fixing Issues

For every issue found:
1. Document what the issue is
2. Fix it immediately
3. Verify the fix doesn't break anything else

Common fixes:
- Missing `'use client'` directive → add it
- Broken links → fix the href
- Missing loading states → add skeleton/spinner
- Missing error handling → add try/catch with user-friendly error
- TypeScript errors → fix the types
- Visual inconsistencies → match the styling rules above
- `console.log` in client code → remove it

---

## Files to Read and Audit

### Pages (read ALL of these):
1. `src/app/page.tsx`
2. `src/app/login/page.tsx`
3. `src/app/onboarding/page.tsx` + `src/app/onboarding/client.tsx`
4. `src/app/dashboard/page.tsx`
5. `src/app/dashboard/AddStoreModal.tsx` (or similar)
6. `src/app/location/[id]/page.tsx`
7. `src/app/chat/page.tsx`
8. `src/app/upload/page.tsx` + `src/app/upload/client.tsx`
9. `src/app/settings/page.tsx` + settings client
10. Any other pages in `src/app/`

### Components (read ALL of these):
All files in `src/components/`

### Layout:
1. `src/app/layout.tsx`
2. `src/app/globals.css`

### API Routes (quick check for 404-causing issues):
Scan `src/app/api/` to verify all routes referenced in the frontend actually exist.

---

## Verification

After all fixes:

1. Run `npx tsc --noEmit` — fix all TypeScript errors
2. Run `npx next build` — fix all build errors
3. Verify no ESLint errors that block the build

Run `npx next build` to verify. Fix any errors.
