Read the entire src/ directory before making any changes.

## TASK: Move action buttons to top + implement in-app chat history saving

### PART 1: MOVE BUTTONS TO TOP
On location detail page, "Ask Your Lease" and "Upload Documents" buttons are buried too far down.
Move BOTH to the very TOP, directly below the location header:
- "Ask Your Lease" = PRIMARY (emerald gradient, white text, chat icon)
- "Upload Documents" = SECONDARY (outlined, border-emerald, emerald text, upload icon)
- Desktop: side by side, ~200-250px each
- Mobile: stack vertically, full width
- Below buttons: lease summary, obligation matrix, critical dates, documents

### PART 2: IN-APP CHAT HISTORY
Implement persistent chat history using existing conversations and messages tables:

DATABASE:
- On chat start, create conversation: id, tenant_id, store_id, title (from first message), created_at, updated_at
- Save EVERY message: id, conversation_id, role, content, citations (jsonb), created_at
- Auto-generate title from first user message (first 50 chars)

SIDEBAR (LEFT side of chat):
- List of past conversations for CURRENT store only
- Each shows: title, date, message count
- Click to load past conversation
- "New Chat" button at top
- Mobile: hidden by default, toggle via history icon

SAVING:
- Auto-save after each assistant response
- Persists across navigation
- Scoped to specific store/location
- RLS: tenants see only their own conversations

Run npx next build to verify. Fix any errors.
