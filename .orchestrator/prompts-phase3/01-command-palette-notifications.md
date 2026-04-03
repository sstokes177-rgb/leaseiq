Read the entire src/ directory before making any changes. These components DO NOT exist yet — create them from scratch.

## TASK: Command Palette (Cmd+K), Notification Center, Keyboard Shortcuts

Linear has Cmd+K. Notion has Cmd+K. Vercel has Cmd+K. In 2026 SaaS, if you can't Cmd+K to it, it doesn't exist. Provelo currently has NONE of these. Build all three.

---

### PART 1: COMMAND PALETTE — src/components/CommandPalette.tsx

**Trigger:** Cmd+K (Mac) or Ctrl+K (Windows/Linux)

**Implementation:**

1. Create a global keyboard listener. Add it to the root layout (src/app/layout.tsx):
```typescript
'use client'
import { useState, useEffect } from 'react'
import { CommandPalette } from '@/components/CommandPalette'

function CommandPaletteProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(prev => !prev)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])
  return <>
    {children}
    <CommandPalette open={open} onClose={() => setOpen(false)} />
  </>
}
```

2. Wrap the app body with this provider (inside ClientProviders or directly in layout.tsx body).

3. The CommandPalette component:

```typescript
interface CommandItem {
  id: string
  label: string
  icon: React.ReactNode
  shortcut?: string
  action: () => void
  section: 'navigation' | 'actions' | 'search'
}
```

**Visual design:**
- Overlay: fixed inset-0 bg-black/60 backdrop-blur-sm z-50
- Card: centered, max-w-[600px] w-full mx-4, bg-gray-900/95 border border-white/10, rounded-xl, shadow-2xl
- Search input: w-full bg-transparent text-white text-lg px-5 py-4, border-b border-white/10, placeholder "Type a command or search...", autofocus
- Results list: max-h-[400px] overflow-y-auto py-2
- Each result: px-4 py-3 flex items-center gap-3 cursor-pointer rounded-lg mx-2
- Selected/hover: bg-white/[0.06]
- Section headers: px-5 py-2 text-xs uppercase tracking-wider text-gray-500
- Keyboard navigation: Arrow Up/Down to select, Enter to execute, Escape to close

**Commands to register (dynamically built on open):**

Navigation section:
- "Go to Dashboard" → router.push('/dashboard')
- "Go to Portfolio" → router.push('/portfolio')
- "Go to Settings" → router.push('/settings')
- For each store the tenant has: "Go to [Store Name]" → router.push('/location/[id]')

Actions section:
- "New Chat" → navigate to chat for current location
- "Upload Document" → trigger upload modal
- "Analyze Risk Score" → trigger risk analysis
- "Run CAM Audit" → navigate to CAM section

Search section:
- "Search documents..." → placeholder, navigates to search
- "Search conversations..." → placeholder

4. **Fuzzy matching:** As user types, filter commands case-insensitively. Use substring match. If user types "who" and there's "Go to Whole Foods", it should match. Show top 8 results.

5. **Animation:** Fade in overlay 150ms, scale card from 95% to 100% with opacity 0 to 1. Same reverse on close.

6. **Close on:** Escape, clicking overlay, or executing a command.

---

### PART 2: NOTIFICATION CENTER — src/components/NotificationCenter.tsx

**Bell icon in the header/navbar, top-right area.**

1. Find the existing layout or navbar component. Add a bell icon button next to any existing header elements (like the user avatar or settings link).

2. Bell icon:
   - Use Bell from lucide-react
   - Size: 20px inside a 40px button
   - If unread count > 0: small red circle badge with count (top-right of bell)
   - Badge: min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full, absolute -top-1 -right-1

3. Click opens a dropdown panel:
   - Position: absolute right-0 top-full mt-2
   - Width: 380px, max-h-[500px] overflow-y-auto
   - Background: bg-gray-900/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl
   - Header: "Notifications" title + "Mark all as read" link
   - Each notification:
     - Left: icon based on type (Calendar for critical dates, Shield for risk, FileText for documents)
     - Middle: title (font-medium text-white), message (text-sm text-gray-400), relative timestamp (text-xs text-gray-500)
     - Unread indicator: 3px emerald left border
     - Click: navigates to relevant page, marks as read
   - Empty state: "No notifications yet" with bell icon

4. **Generate notifications automatically:**
   - On dashboard load, check critical_dates for dates within 30 and 90 days. Create notifications if they don't exist.
   - After risk score completes, create a notification.
   - After CAM audit completes, create a notification.
   - Use the notifications table (already created in the SQL migration).

5. **API routes:**
   - GET /api/notifications/route.ts — fetch notifications for current user, ordered by created_at DESC, limit 20
   - PATCH /api/notifications/route.ts — mark one or all as read (accept { id?: string, mark_all?: boolean })

---

### PART 3: KEYBOARD SHORTCUTS

Register these in the root layout alongside the Cmd+K handler:
- Cmd+K / Ctrl+K → Open command palette
- Cmd+N / Ctrl+N → New chat (if on a location page, navigate to chat)
- Cmd+U / Ctrl+U → Upload document (if applicable)
- Escape → Close any open modal, panel, or palette

Prevent default browser behavior for these shortcuts.

Show shortcuts in the command palette results as small badges on the right side (e.g., "⌘K" or "Ctrl+K").

---

Run npx next build to verify. Fix ALL errors.
Then: git add . && git commit -m "Phase 3: Command palette, notification center, keyboard shortcuts" && git push

