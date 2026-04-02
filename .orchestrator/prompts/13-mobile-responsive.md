# Task 13: Mobile Responsive Design

Read the entire src/ directory before making any changes.

## Project Context

This is a Next.js 16 (App Router, TypeScript) web app called LeaseIQ. Key tech:
- Tailwind CSS + shadcn/ui
- Plus Jakarta Sans font
- Dark theme with emerald accents

### Styling Rules (MUST preserve)
- Dark theme: body gradient `linear-gradient(160deg, #1a1d25 0%, #13151d 55%, #0f1118 100%)`
- Emerald accents: `#10b981`
- Glass cards: `glass-card` class
- All existing desktop styling must be preserved — only ADD responsive behavior

### Key Pages to Fix
1. Landing page (`src/components/LandingPage.tsx`)
2. Dashboard (`src/app/dashboard/page.tsx` + `src/components/DashboardGrid.tsx`)
3. Location detail (`src/app/location/[id]/page.tsx`)
4. Chat (`src/app/chat/page.tsx`)
5. Upload (`src/app/upload/page.tsx` + `src/app/upload/client.tsx`)
6. Settings (`src/app/settings/page.tsx` + `src/app/settings/SettingsClient.tsx`)
7. Onboarding (`src/app/onboarding/client.tsx`)
8. Login (`src/app/login/page.tsx`)

---

## What This Task Must Do

Make every page work perfectly at 375px width (iPhone SE / small phones). Test visually by checking the Tailwind responsive breakpoints.

### General Rules

1. **NO horizontal scroll** — nothing should overflow the viewport at 375px
2. **Readable text** — minimum 14px for body text on mobile
3. **Tappable targets** — minimum 44px height for buttons and interactive elements
4. **Proper padding** — at least `px-4` on mobile, `px-6` on sm+
5. **Stack on mobile** — grid layouts should collapse to single column
6. **Fixed chat input** — on the chat page, the input should be fixed at the bottom of the viewport

### Page-by-Page Fixes

#### 1. Landing Page (`src/components/LandingPage.tsx`)

Read the file first. Fix:
- Hero section: The `lg:grid-cols-2` grid is fine but check if the left column text is readable at 375px
- Hero headline: May be too large on mobile. Add responsive sizing:
  ```
  text-3xl sm:text-5xl lg:text-[3.4rem]
  ```
- Chat mockup: Already hidden on mobile (`hidden lg:block`) — good
- Features grid: `md:grid-cols-2 lg:grid-cols-3` — on mobile should be single column `grid-cols-1`. Verify.
- How it works steps: `md:grid-cols-3` → should stack to `grid-cols-1`
- Example questions: flex-wrap handles this naturally — verify
- CTA banner: Check padding on mobile
- Footer: `sm:flex-row` — should stack on mobile (`flex-col`). Verify.
- Nav: Check if the nav buttons and text fit at 375px. The sign-in/sign-up buttons may need to be smaller.

#### 2. Dashboard (`src/app/dashboard/page.tsx`)

Read both files. Fix:
- Header: Check if "LeaseIQ" text, nav links, and sign out button fit at 375px
- Welcome section: The flex layout with AddStoreButton — ensure it wraps properly on mobile
- Store grid: `sm:grid-cols-2 lg:grid-cols-3` → on mobile should be `grid-cols-1`. Verify `DashboardGrid.tsx`.
- Search bar and filters: The filters row may overflow. Ensure `flex-wrap` is applied.
- Filter dropdowns: May be too wide. Add `max-w-[120px]` or similar.

Add a **hamburger nav menu** for mobile:
- Hide the nav links (`Dashboard`, `Settings`) on mobile
- Show a hamburger button (menu icon from lucide-react)
- When tapped, show a dropdown with the nav links

Simple implementation in the header:
```tsx
// In dashboard/page.tsx header:
{/* Mobile menu button */}
<button className="sm:hidden p-2 text-muted-foreground" onClick={toggleMenu}>
  <Menu className="h-5 w-5" />
</button>
```

Since the dashboard page is a server component, you may need to extract the header into a small client component for the hamburger toggle, or use CSS-only approach:

**CSS-only hamburger approach** (simpler, no client component needed):
```tsx
<details className="sm:hidden relative">
  <summary className="list-none cursor-pointer p-2 text-muted-foreground">
    <Menu className="h-5 w-5" />
  </summary>
  <div className="absolute right-0 top-full mt-1 w-40 rounded-xl glass-card p-2 z-50">
    <Link href="/dashboard" className="block px-3 py-2 text-sm rounded-lg hover:bg-white/[0.06]">Dashboard</Link>
    <Link href="/settings" className="block px-3 py-2 text-sm rounded-lg hover:bg-white/[0.06]">Settings</Link>
  </div>
</details>
```

#### 3. Location Detail (`src/app/location/[id]/page.tsx`)

Read the file. Fix:
- Header: Similar hamburger treatment
- Location header: The icon + text flex should wrap properly
- Analysis cards: They're already single-column on mobile. Verify.
- Action cards: `sm:grid-cols-2` → `grid-cols-1` on mobile. Verify.
- Critical dates: Full width on mobile
- Document list: Full width, text should truncate
- Clause cards: `sm:grid-cols-2` → `grid-cols-1` on mobile. Verify.

#### 4. Chat Page (`src/app/chat/page.tsx`)

Read the file. This is the most critical page for mobile. Fix:
- **Full viewport height**: Already uses `h-[100dvh]`. Good.
- **Sidebar**: Already hidden on mobile with overlay. Good.
- **Chat messages**: Ensure bubbles don't exceed viewport width. Max-width of `max-w-[85%]` on mobile.
- **Input area**: Must be fixed at bottom. Already in the layout — verify it stays visible when keyboard opens.
  - Add `pb-safe` or bottom padding for safe area on iPhone:
    ```css
    padding-bottom: env(safe-area-inset-bottom, 0);
    ```
- **Header**: Compact on mobile — reduce padding, smaller text
- **Store switcher**: May overflow. Reduce text size or truncate.
- **Citation panel**: Should be hidden or overlaying on mobile (already handled). Verify.

In `src/app/globals.css`, add safe area support:
```css
@supports (padding-bottom: env(safe-area-inset-bottom)) {
  .pb-safe {
    padding-bottom: env(safe-area-inset-bottom);
  }
}
```

#### 5. Upload Page

Read `src/app/upload/page.tsx` and the client component. Fix:
- File upload area: Full width on mobile
- Store selector (if multi-store): Full width
- Buttons: Full width on mobile

#### 6. Settings Page

Read the settings files. Fix:
- Form inputs: Full width on mobile
- Language selector grid: `grid-cols-2` should still fit at 375px since each card is ~170px
- Notification toggles: Ensure the toggle and label don't overflow
- Team section (if added): Full width on mobile

#### 7. Onboarding Page

Read `src/app/onboarding/client.tsx`. Fix:
- Form should be centered and full width on mobile
- Step indicators should fit
- Buttons should be full width on mobile

#### 8. Login Page

Read `src/app/login/page.tsx`. Fix:
- Form should be centered, max-w-sm, with proper mobile padding

### Global CSS Additions

In `src/app/globals.css`, add:

```css
/* ─── Mobile safe areas ─── */
@supports (padding-bottom: env(safe-area-inset-bottom)) {
  .pb-safe {
    padding-bottom: env(safe-area-inset-bottom);
  }
}

/* Prevent horizontal overflow */
html, body {
  overflow-x: hidden;
  max-width: 100vw;
}

/* Ensure images don't overflow */
img {
  max-width: 100%;
  height: auto;
}
```

### Component-Level Responsive Patterns

For any component that needs responsive adjustments:
- Use `px-4 sm:px-6` for horizontal padding
- Use `text-sm sm:text-base` for text that's too small on mobile
- Use `grid-cols-1 sm:grid-cols-2` for 2-column layouts
- Use `hidden sm:flex` for desktop-only nav
- Use `w-full sm:w-auto` for buttons that should be full-width on mobile

---

## Files to Modify (read each first)

1. `src/app/globals.css` — Add mobile safe area, overflow prevention
2. `src/components/LandingPage.tsx` — Responsive hero, nav
3. `src/app/dashboard/page.tsx` — Hamburger nav, responsive header
4. `src/components/DashboardGrid.tsx` — Filter row wrapping
5. `src/app/location/[id]/page.tsx` — Responsive layout
6. `src/app/chat/page.tsx` — Mobile chat UX, safe area padding
7. `src/app/upload/page.tsx` (and client) — Full-width on mobile
8. `src/app/settings/page.tsx` (and client) — Responsive form
9. `src/app/onboarding/client.tsx` — Mobile-friendly form
10. `src/app/login/page.tsx` — Centered mobile form

---

Run `npx next build` to verify. Fix any errors.
