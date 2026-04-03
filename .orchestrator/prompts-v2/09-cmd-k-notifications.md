Read the entire src/ directory before making any changes.

## TASK: Command Palette (Cmd+K) and Notification Center

### COMMAND PALETTE (Cmd+K / Ctrl+K)
Create src/components/CommandPalette.tsx. Keyboard listener in root layout.

Modal: centered, dark bg-gray-900/95, backdrop-blur-xl, 600px wide.
Search input at top (autofocused, 18px). Results list with keyboard nav (arrows + Enter + Escape).

Commands: "Go to Dashboard/Portfolio/Settings/[Store Name]", "Upload Document", "New Chat", "Export Lease Summary", "Run CAM Audit", "Analyze Risk Score"

### NOTIFICATION CENTER
Bell icon in top-right header with unread count badge.
Dropdown panel with notifications:
- Critical date approaching (30/90 days)
- Analysis complete (risk score, CAM audit)
- Team member joined

Database: notifications table (id, tenant_id, store_id, type, title, message, link, read boolean, created_at). RLS.
Auto-generate on: critical dates within 30/90 days, analysis completion, team updates.
Each notification clickable to navigate to context.

### KEYBOARD SHORTCUTS
Cmd+K=palette, Cmd+N=new chat, Cmd+U=upload, Escape=close modals.

Run npx next build to verify. Fix any errors.
