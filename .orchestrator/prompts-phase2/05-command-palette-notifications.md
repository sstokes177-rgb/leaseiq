Read the entire src/ directory before making any changes.

## TASK: Command Palette (Cmd+K), Notification Center, Keyboard Shortcuts

These are baseline expectations for modern SaaS products. Linear, Notion, Vercel all have them. If you can't Cmd+K to it, it doesn't exist.

---

### PART 1: COMMAND PALETTE (Cmd+K / Ctrl+K)

**Component: src/components/CommandPalette.tsx**

1. Global keyboard listener in root layout:
```typescript
useEffect(() => {
  const handler = (e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      setCommandPaletteOpen(true);
    }
  };
  document.addEventListener('keydown', handler);
  return () => document.removeEventListener('keydown', handler);
}, []);
```

2. The palette is a centered modal overlay:
   - Dark overlay: bg-black/50
   - Centered card: max-width 600px, bg-gray-900/95, backdrop-blur-xl, rounded-xl
   - Search input at top: no border, large text (18px), placeholder "Type a command or search..."
   - Results list below with keyboard navigation (arrow keys, Enter, Escape)

3. Available commands (populate dynamically):

**Navigation commands:**
- "Go to Dashboard" → navigate to /dashboard
- "Go to Portfolio" → navigate to /portfolio
- "Go to Settings" → navigate to /settings
- "Go to [Store Name]" → for each store, add a "Go to [name]" command
- "Go to [Store Name] Chat" → open chat for that store

**Action commands:**
- "Upload Document" → open upload modal for current location
- "New Chat" → start new chat at current location
- "Run Risk Analysis" → trigger risk score for current location
- "Run CAM Audit" → open CAM audit for current location
- "Export Lease Summary" → download summary PDF

**Search commands:**
- "Search documents for [query]" → search across all document chunks
- "Search conversations for [query]" → search past chats

4. Fuzzy matching: as user types, filter commands using substring match (case-insensitive). Show top 8 results.

5. Each result shows:
   - Icon (navigation icon, action icon, search icon)
   - Command name
   - Optional keyboard shortcut on the right
   - Hover/selected state: bg-white/5

6. Styling:
   - Results max-height: 400px with scroll
   - Smooth fade-in animation (150ms)
   - Full width on mobile
   - Close on Escape or clicking outside

---

### PART 2: NOTIFICATION CENTER

**Bell icon in the top-right of the navbar/header.**

1. Bell icon with unread count badge:
   - Red dot with number if unread > 0
   - Animate (subtle pulse) when new notifications arrive
   - 44px touch target minimum

2. Clicking opens a dropdown panel (not a page):
   - Width: 380px, max-height: 500px
   - Shows notifications newest first
   - Each notification: icon, title, message preview, relative timestamp, read/unread indicator
   - Unread items have a subtle emerald left border
   - "Mark all as read" link at top
   - "View all" link at bottom (optional — can show all inline)

3. Notification types and when they're generated:
   - **Critical date approaching** — auto-generate when dates are within 30 or 90 days (check on dashboard load)
   - **Lease summary generated** — when a new summary completes
   - **Risk analysis complete** — when risk score finishes
   - **CAM audit complete** — when a CAM audit finishes
   - **Document uploaded** — confirmation after upload

4. Database:
```sql
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  store_id UUID REFERENCES stores(id),
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  link TEXT,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_notifications_tenant ON notifications(tenant_id, read, created_at DESC);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant sees own notifications" ON notifications
  FOR ALL USING (tenant_id = auth.uid());
```

5. API routes:
   - GET /api/notifications — fetch notifications for current user
   - PUT /api/notifications/read — mark one or all as read
   - Notifications should be created server-side when events happen

6. Clicking a notification navigates to the relevant page and marks it as read.

---

### PART 3: GLOBAL KEYBOARD SHORTCUTS

Register these in the root layout:
- Cmd+K / Ctrl+K → Command palette
- Cmd+N / Ctrl+N → New chat (if on a location page)
- Cmd+U / Ctrl+U → Upload document (if on a location page)
- Escape → Close any modal, panel, or palette

Show these shortcuts in the command palette results and in a "Keyboard Shortcuts" section in Settings.

---

Run npx next build to verify. Fix ALL errors.
Then: git add . && git commit -m "Phase 2 Task 05: Command palette, notification center, keyboard shortcuts" && git push

