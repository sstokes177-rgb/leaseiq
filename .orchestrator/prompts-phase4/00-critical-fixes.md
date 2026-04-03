Read the entire src/ directory before making any changes.

## TASK: Critical Bug Fixes — Chat UUID, JSON Parsing, Visual Overhaul

---

### FIX 1: CHAT UUID ERROR (this has failed 3+ times — must be fixed NOW)

Error: "invalid input syntax for type uuid: VoJ7u4nxOEjtCnsE"

The useChat hook from @ai-sdk/react generates short random IDs. Supabase needs UUIDs.

In src/app/api/chat/route.ts:
1. Find where conversationId is extracted from the request body
2. Add this validation IMMEDIATELY after extracting it:

```typescript
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function ensureUUID(id: string | undefined | null): string | null {
  if (!id) return null;
  if (UUID_REGEX.test(id)) return id;
  // Not a valid UUID — generate a new one
  return crypto.randomUUID();
}
```

3. Replace the raw conversationId with: `const safeConversationId = ensureUUID(conversationId)`
4. Use safeConversationId in ALL Supabase operations instead of conversationId
5. Return the safeConversationId in the response headers so the frontend can update:
   Add to the stream response: `headers: { 'X-Conversation-Id': safeConversationId }`

In src/app/chat/page.tsx:
1. Find where activeConversationId is created — it should use crypto.randomUUID()
2. Find the useChat hook configuration
3. Ensure body sends: `{ id: activeConversationId, store_id: storeId }`
4. The useChat hook's `id` prop should be set to activeConversationId
5. On response, check for X-Conversation-Id header and update state if different

---

### FIX 2: JSON PARSE FAILURES (risk-score, lease-compare, and ALL AI routes)

Claude sometimes returns ```json ... ``` fenced JSON. The parser must strip this.

Create a shared utility in src/lib/parseAIJSON.ts:

```typescript
export function parseAIJSON<T = unknown>(raw: string): T {
  let text = raw.trim();
  
  // Strip markdown code fences
  text = text.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '');
  text = text.trim();
  
  // Try direct parse first
  try {
    return JSON.parse(text) as T;
  } catch {
    // Fallback: find first { and last }
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      return JSON.parse(text.slice(firstBrace, lastBrace + 1)) as T;
    }
    // Try array
    const firstBracket = text.indexOf('[');
    const lastBracket = text.lastIndexOf(']');
    if (firstBracket !== -1 && lastBracket > firstBracket) {
      return JSON.parse(text.slice(firstBracket, lastBracket + 1)) as T;
    }
    throw new Error(`Failed to parse AI JSON response: ${text.slice(0, 200)}`);
  }
}
```

Now replace JSON.parse in EVERY API route that parses AI-generated text:
- src/app/api/risk-score/route.ts
- src/app/api/lease-compare/route.ts (if it exists)
- src/app/api/cam-audit/route.ts
- src/app/api/lease-summary/generate/route.ts
- src/app/api/obligations/generate/route.ts
- src/app/api/lease-clauses/route.ts
- Any other route that calls Claude/AI and parses the response

Import and use: `import { parseAIJSON } from '@/lib/parseAIJSON'`

---

### FIX 3: LOCATION PAGE TAB BAR STYLING

The tab bar looks awkward — flat black bar with empty space. Redesign:

1. Remove any dark background band behind the tabs. The tabs should float naturally on the page background.
2. Tab bar container: no background color, just a subtle bottom border (border-b border-white/[0.06]) to separate from content
3. Each tab: text-sm font-medium px-4 py-3 relative transition-all
4. Active tab: text-emerald-400 with a 2px emerald bottom border (pseudo-element or border-b-2 border-emerald-500)
5. Inactive tab: text-gray-400 hover:text-gray-200
6. NO pill/rounded background on tabs — just clean underline style (like Stripe's dashboard tabs)
7. The tab bar should be full width, with tabs left-aligned (not centered)
8. Add subtle spacing: mt-6 mb-8 between the buttons above and the tab content below
9. The tab bar should be sticky (stick to top when scrolling) with a backdrop-blur-xl bg-gray-950/80

Content area below tabs:
- Minimum height: calc(100vh - 300px) so it never looks empty
- If a section has limited content, pad it and center it vertically
- Remove excessive whitespace between cards — use gap-6 instead of gap-8 or larger

---

### FIX 4: CHAT TAB — SHOW HISTORICAL CHATS

The Chat tab on the location page currently shows just an "Open Chat" button with lots of empty space. Instead:

1. Show a list of historical conversations for this location directly in the Chat tab
2. Fetch conversations from /api/conversations?store_id=X
3. Display as a clean list:
   - Each conversation: title, date, message count preview
   - Click to open that conversation in the full chat page
   - Style: cards with hover effect, or a clean list with dividers
4. Above the list: "New Chat" button (opens chat with a fresh conversation)
5. If no conversations exist: show the empty state with suggested questions
6. Each conversation card:
   - Left: chat icon
   - Middle: title (font-medium text-white), relative date (text-sm text-gray-400)
   - Right: arrow icon indicating it's clickable
   - Hover: bg-white/[0.04] transition
   - Click: navigates to /chat?store=STORE_ID&conversation=CONV_ID

---

### FIX 5: SIDEBAR EXPAND TOGGLE

The sidebar is collapsed to icons with no way to expand. Add:

1. A toggle button at the bottom of the sidebar (or top-right corner)
2. When collapsed: show a small ChevronRight icon button
3. When expanded: show ChevronLeft icon button
4. Button style: w-8 h-8 rounded-full bg-white/[0.06] hover:bg-white/[0.1] flex items-center justify-center transition-all
5. Position: absolute right-[-16px] top-[50%] transform -translate-y-1/2 (half inside, half outside the sidebar) with z-10
6. OR at the bottom of the sidebar as a full-width row
7. Store state in localStorage key 'provelo_sidebar_expanded'
8. Default: expanded (showing full text labels)

---

Run npx next build — fix ALL errors.
Then: git add . && git commit -m "Phase 4: Fix chat UUID, JSON parsing, tab styling, chat history, sidebar toggle" && git push

