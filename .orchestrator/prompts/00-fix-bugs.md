# Task 00: Fix All Existing Bugs

Read the entire src/ directory before making any changes.

## Project Context

This is a Next.js 16 (App Router, TypeScript) web app called LeaseIQ for commercial retail tenants to upload lease PDFs and ask natural-language questions. It uses:
- Tailwind CSS + shadcn/ui
- Vercel AI SDK (`ai` + `@ai-sdk/anthropic`) for chat streaming
- Claude API (claude-sonnet-4-6) for LLM, Claude Haiku for extraction tasks
- LangChain.js for embeddings (OpenAI text-embedding-3-small, 1536 dims)
- Supabase (PostgreSQL + pgvector + Auth + Storage)
- pdf-parse for PDF extraction (server-only)

### Database Schema (already exists — DO NOT recreate)
- `tenant_profiles` — user profiles (id, company_name, role, language_preference, notification_prefs, display_theme)
- `stores` — locations (id, tenant_id, store_name, shopping_center_name, suite_number, address, asset_class)
- `documents` — uploaded files (id, tenant_id, store_id, file_name, display_name, document_type, file_path, lease_identifiers)
- `document_chunks` — chunked text with pgvector embeddings (id, document_id, tenant_id, store_id, content, metadata, embedding)
- `conversations` — chat conversations (id, tenant_id, store_id, title, updated_at)
- `messages` — chat messages (id, conversation_id, role, content, citations)
- `critical_dates` — extracted dates (id, document_id, tenant_id, store_id, date_type, date_value, description, alert_days_before)
- `lease_summaries` — AI-generated lease abstracts (id, store_id, tenant_id, summary_data JSONB)
- `obligation_matrices` — responsibility matrix (id, store_id, tenant_id, matrix_data JSONB)
- `cam_analysis` — CAM charge analysis (id, store_id, tenant_id, analysis_data JSONB)

### Styling Rules (MUST follow for any UI changes)
- Dark theme: body background is `linear-gradient(160deg, #1a1d25 0%, #13151d 55%, #0f1118 100%)`
- Emerald accents: primary color is `#10b981` (emerald-500), highlights use `rgba(16,185,129,...)`
- Font: Plus Jakarta Sans (loaded via `next/font/google` as `--font-sans`)
- Frosted glass cards: use CSS classes `glass-card` (bg rgba(255,255,255,0.04), backdrop-blur-24px, border rgba(255,255,255,0.07))
- Frosted glass inputs: use CSS class `glass-input` (similar but with focus ring)
- Card hover: `glass-card-lift` adds hover translateY(-3px) and emerald border glow

---

## Bug 1: Chat History Not Saving/Loading Properly

### Problem
Chat messages are supposed to be saved to the database when the AI responds, and loaded when a user clicks on a conversation in the sidebar. The saving may be failing silently, or the loading may not be mapping messages correctly.

### Files to Check and Fix
1. **`src/app/api/chat/route.ts`** — The `onFinish` callback saves messages. Issues:
   - The `onFinish` callback runs inside `streamText()` which is async. If the response stream ends before `onFinish` completes, messages might not save.
   - The conversation upsert uses `onConflict: 'id'` — verify this actually works with Supabase's upsert.
   - Both the primary and fallback model code paths have duplicate save logic — ensure both paths actually save.
   - Check if `conversationId` is being passed correctly from the client.

2. **`src/app/chat/page.tsx`** — The client chat page:
   - `handleSelectConversation` fetches `/api/conversations/${id}` and calls `dbMessagesToUIMessages()`.
   - The `dbMessagesToUIMessages` function maps DB messages to `UIMessage[]` format. Verify the `parts` array structure matches what `useChat` expects.
   - Ensure `initialMessages` is properly passed to `useChat` via the `messages` prop and that the `ChatInterface` component re-renders with the `key` prop when switching conversations.

3. **`src/app/api/conversations/[id]/route.ts`** — Verify this endpoint returns messages in the correct order (ascending by created_at).

4. **`src/components/ChatSidebar.tsx`** — Verify the sidebar fetches and displays conversations correctly, and refreshes after a new message is sent.

### Fix Steps
- Read all four files carefully.
- In `src/app/api/chat/route.ts`:
  - Make sure the `onFinish` callback is robust — wrap DB operations in try/catch with clear error logging.
  - Ensure the conversation is created BEFORE messages are inserted (the upsert must complete first).
  - Check that `citations` (the variable from RAG context) is actually accessible inside the `onFinish` closure.
- In `src/app/chat/page.tsx`:
  - Verify `dbMessagesToUIMessages` correctly maps the `content` field to `parts: [{ type: 'text', text: msg.content }]`.
  - Ensure the `metadata` field carries citations correctly: `{ citations: msg.citations }`.
  - Make sure `setChatKey(k => k + 1)` is called when switching conversations so `useChat` re-initializes.
- In the conversations API route, ensure messages are ordered by `created_at` ascending.

---

## Bug 2: Lease Summary Disappearing on Navigation

### Problem
When a user generates a lease summary and then navigates away from the location page and comes back, the summary sometimes doesn't appear. It should be persisted in the `lease_summaries` table and re-fetched on page load.

### Files to Check and Fix
1. **`src/lib/leaseSummary.ts`** — The `generateLeaseSummary` function upserts to `lease_summaries`.
   - Check that the upsert logic actually works — it does a SELECT then either UPDATE or INSERT.
   - Ensure the `summary_data` JSONB is being stored correctly (not wrapped in an extra layer).

2. **`src/app/api/lease-summary/route.ts`** (GET) — This fetches the existing summary.
   - Verify it queries `lease_summaries` with correct `store_id` and `tenant_id` filters.
   - Check if the error handler is swallowing real errors (currently returns `{ summary: null }` on any error).

3. **`src/app/api/lease-summary/generate/route.ts`** (POST) — This generates and returns the summary.
   - Verify it returns `summary_data` in the response body.

4. **`src/components/LeaseSummaryCard.tsx`** — The client component.
   - The `fetchSummary` function calls GET `/api/lease-summary?store_id=${storeId}`.
   - It extracts `data.summary?.summary_data`. Verify this matches what the API returns.
   - After generation, it sets `setSummary(data.summary_data)`. Verify the generate endpoint returns this field.

### Fix Steps
- Read all files. Trace the data flow:
  1. Generate: POST `/api/lease-summary/generate` → calls `generateLeaseSummary()` → upserts to DB → returns `{ summary_data }`.
  2. Fetch: GET `/api/lease-summary` → queries DB → returns `{ summary: { summary_data: {...} } }`.
  3. Display: `LeaseSummaryCard.fetchSummary()` → `data.summary?.summary_data`.
- Fix any mismatch in the data shape between generation and fetching.
- In `leaseSummary.ts`, add explicit error logging if the upsert fails.
- Ensure the `lease_summaries` table actually has the correct columns. If the table might not exist, create it using the admin Supabase client:

```typescript
const admin = createAdminSupabaseClient()
// Check if table exists by attempting a query. If it fails, create it.
```

---

## Bug 3: Obligation Matrix "Upload Documents First" Error When Docs Exist

### Problem
When clicking "Generate obligation matrix" on a location that has documents, it returns the error "Could not generate matrix — upload lease documents first" even though documents are uploaded.

### Files to Check and Fix
1. **`src/lib/obligationMatrix.ts`** — The `generateObligationMatrix` function:
   - It searches for chunks using `keywordSearchChunks()` for 8 obligation keywords.
   - `keywordSearchChunks` calls the `keyword_search_documents` Supabase RPC function, which may NOT exist yet (the code gracefully falls back to empty array).
   - The fallback path fetches raw chunks from `document_chunks` table filtered by `tenant_id` and `store_id`.
   - **Bug**: The fallback only runs if `chunks.length === 0` after keyword search. But `keywordSearchChunks` may return empty arrays silently if the RPC function doesn't exist, AND the fallback query might also fail due to RLS or missing data.
   - If both paths return 0 chunks, it returns `null`, which the API route translates to the error message.

2. **`src/app/api/obligations/generate/route.ts`** — Returns 422 with "upload lease documents first" when `generateObligationMatrix` returns null.

### Fix Steps
- In `src/lib/obligationMatrix.ts`:
  - Make the fallback path more robust. After keyword search returns 0, query `document_chunks` with ONLY `store_id` filter (using the admin client which bypasses RLS).
  - Log the chunk count at each step so failures are visible.
  - If `rawChunks` fetch returns 0 results, log the store_id and tenant_id for debugging.
  - Remove the filter that requires obligation-related text — just send ALL chunks (up to 35) if keyword search fails.
  - Use `createAdminSupabaseClient()` (which it already does) to bypass RLS.

---

## Bug 4: Cross-Location Data Leak in Chat

### Problem
When chatting about one location, the RAG pipeline might return chunks from a different location. The `store_id` filter MUST be strict — NEVER fall back to tenant-wide search when a `store_id` is provided.

### Files to Check and Fix
1. **`src/lib/ragChain.ts`** — The `buildRAGContext` function:
   - Line: `if (chunks.length === 0 && storeId != null)` — verify it does NOT fall back to searching without store_id.
   - Currently it logs "will NOT fall back to other stores" but verify this is actually true for ALL search paths.
   - Check that keyword search also passes `storeId`.
   - Check that topic expansion also passes `storeId`.

2. **`src/lib/vectorStore.ts`** — `retrieveRelevantChunks` and `keywordSearchChunks`:
   - `retrieveRelevantChunks` calls `match_documents` RPC with `p_store_id`. Verify the SQL function filters by store_id.
   - `keywordSearchChunks` calls `keyword_search_documents` with `p_store_id`. Same check.

3. **Supabase RPC functions** — The `match_documents` SQL function (in `supabase/migrations/`):
   - Read the migration files to verify the function filters by `p_store_id` when provided.
   - The function should use `AND (p_store_id IS NULL OR dc.store_id = p_store_id)` — verify this clause exists AND works correctly.
   - **CRITICAL**: When `p_store_id` IS provided, it MUST filter. When `p_store_id IS NULL`, it can search all tenant docs. But in the chat flow, `storeId` should ALWAYS be provided.

### Fix Steps
- Read `supabase/migrations/002_multi_store.sql` to see the `match_documents` function definition.
- In `src/lib/ragChain.ts`:
  - After the initial vector search returns 0 results with a store_id, do NOT attempt any broader search. Already correct per the code comment, but verify ALL paths.
  - In keyword search, ensure `storeId ?? null` is passed (not `undefined`).
  - In topic expansion, ensure `storeId ?? null` is passed.
- In `src/app/api/chat/route.ts`:
  - Verify `storeId` is extracted from the request body and passed to `buildRAGContext`.
  - The client sends `store_id` in the body via the `DefaultChatTransport`. Verify this.

---

## Bug 5: Citation Excerpts Starting/Ending Mid-Word

### Problem
Citation excerpts in the chat sometimes start or end in the middle of a word, making them hard to read.

### Files to Check and Fix
1. **`src/lib/vectorStore.ts`** — The `cleanExcerpt` function (around line 149):
   ```typescript
   function cleanExcerpt(content: string, minLength = 300): string {
     const text = content.trim()
     if (text.length <= minLength) return text
     let raw = text.slice(0, minLength + 50)
     // Trim start: if the chunk begins mid-word
     const startsClean = /^[A-Z"(\d]/.test(raw) || /^[.!?]\s/.test(text.slice(0, 2))
     // ... etc
   }
   ```
   - The start-trim logic only checks for capital letters, quotes, parens, digits. But chunks can start with lowercase words that are legitimate starts (e.g., "the Tenant shall...").
   - The end-trim logic finds the last space before the cutoff, which is good, but the threshold `minLength - 50` might be too aggressive.

### Fix Steps
- Improve `cleanExcerpt` in `src/lib/vectorStore.ts`:
  - For **start trimming**: Skip to the next word boundary (space) only if the text starts with what looks like a mid-sentence fragment. Better heuristic: check if the first character is a lowercase letter AND the preceding character (if available from the full content) is a letter (indicating mid-word). Since we only have the chunk content, check if the chunk starts mid-word by looking at the first few characters.
  - For **end trimming**: Always trim to the last complete word boundary. Find the last space, period, comma, or other punctuation before the cutoff.
  - Add a more robust word boundary detection:
    ```typescript
    function cleanExcerpt(content: string, minLength = 300): string {
      const text = content.trim()
      if (text.length <= minLength) return text
      
      let start = 0
      let prefix = ''
      
      // If text starts mid-word (lowercase after no sentence boundary), skip to first word boundary
      if (/^[a-z]/.test(text)) {
        const firstSpace = text.indexOf(' ')
        if (firstSpace > 0 && firstSpace < 40) {
          start = firstSpace + 1
          prefix = '…'
        }
      }
      
      let raw = text.slice(start, start + minLength + 60)
      let suffix = ''
      
      // Trim to last complete word boundary
      if (start + raw.length < text.length) {
        const lastBoundary = raw.search(/[\s.,;:!?]\S*$/)
        if (lastBoundary > minLength - 80) {
          raw = raw.slice(0, lastBoundary + 1).trimEnd()
        }
        suffix = '…'
      }
      
      return prefix + raw + suffix
    }
    ```

---

## Bug 6: Chat Text Streaming Appearing Glitchy

### Problem
When the AI streams its response, the text rendering can appear janky — text jumping, layout shifting, or flickering.

### Files to Check and Fix
1. **`src/app/globals.css`** — The `.streaming-content` CSS:
   - Currently has `overflow: hidden` and child animations with `stream-in` (opacity 0.4 → 1).
   - The problem might be that EACH paragraph/element gets its own animation, causing individual elements to pop in.

2. **`src/components/ChatMessage.tsx`** — The `LeaseResponseContent` component:
   - It renders `<ReactMarkdown>` which re-renders on every streaming token.
   - The cursor element is `<span className="animate-pulse">` appended after content.

3. **`src/app/chat/page.tsx`** — The scroll behavior:
   - Auto-scroll uses `requestAnimationFrame` and `behavior: 'smooth'`.
   - Check if scroll events are firing too frequently during streaming.

### Fix Steps
- In `src/app/globals.css`:
  - Simplify the streaming animation. Instead of animating each child element, just ensure the container handles overflow gracefully:
    ```css
    .streaming-content {
      overflow-wrap: break-word;
      word-break: break-word;
    }
    
    .streaming-content > p,
    .streaming-content > ul,
    .streaming-content > ol,
    .streaming-content > div,
    .streaming-content > h1,
    .streaming-content > h2,
    .streaming-content > h3,
    .streaming-content > hr {
      animation: stream-in 0.15s ease-out both;
    }
    
    @keyframes stream-in {
      from { opacity: 0.6; }
      to { opacity: 1; }
    }
    ```
  - Make the animation faster (0.15s instead of 0.2s) and start from higher opacity (0.6 instead of 0.4) to reduce flicker.

- In `src/components/ChatMessage.tsx`:
  - Ensure the streaming cursor is not causing layout shifts. The cursor span should be `inline-block` with a fixed width.

- In `src/app/chat/page.tsx`:
  - Throttle the auto-scroll during streaming. Instead of scrolling on every message update, use a simple debounce or only scroll every 100ms:
    ```typescript
    const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout>>()
    
    useEffect(() => {
      if (scrollRef.current) {
        clearTimeout(scrollTimeoutRef.current)
        scrollTimeoutRef.current = setTimeout(() => {
          const el = scrollRef.current
          if (!el) return
          const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 150
          if (isNearBottom) {
            el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
          }
        }, 80)
      }
    }, [messages, showTypingIndicator])
    ```

---

## Bug 7: Dashboard Search Bar and Filters Not Working

### Problem
The search bar and filter dropdowns on the dashboard page don't seem to filter locations correctly.

### Files to Check and Fix
1. **`src/components/DashboardGrid.tsx`** — The client component with search/filter/sort:
   - Search filters by `store_name`, `address`, `shopping_center_name`, `suite_number` — verify the `includes()` checks work.
   - State filter checks `s.address.includes(stateFilter)` — this is a simple substring match on a 2-letter state code, which could match other parts of the address (e.g., "CA" in "CALIFORNIA").
   - Asset class filter checks `s.asset_class === assetFilter` — this should work if asset_class values match exactly.
   - Status filter checks `new Date(s.lease_expiry)` — the `lease_expiry` comes from the parent page, which extracts it from `lease_summaries.summary_data.lease_end_date`. This could be null, a date string, or a text description.

2. **`src/app/dashboard/page.tsx`** — The server page passes `storesWithCounts` to `DashboardGrid`.
   - `lease_expiry` is extracted from `leaseSummaries`. Check if the `lease_summaries` query works and returns data.

### Fix Steps
- Read both files.
- In `DashboardGrid.tsx`:
  - Fix the state filter: use a regex that matches the state code more precisely: `new RegExp(`\\b${stateFilter}\\b`).test(s.address)` or match against the end of the address.
  - Fix the status filter: handle null/undefined `lease_expiry` and invalid date strings.
  - Ensure the search is case-insensitive (it already uses `.toLowerCase()`).
  - Ensure `filtered` is memoized correctly with all dependencies.
- In `dashboard/page.tsx`:
  - Ensure the `lease_summaries` query doesn't silently fail (the try/catch swallows errors).
  - Log any errors from the `lease_summaries` query.

---

## Bug 8: Document Preview Not Functioning

### Problem
Users cannot preview their uploaded documents. There should be a way to view the PDF from the location detail page or document list.

### Files to Check and Fix
1. **`src/app/api/documents/[id]/url/route.ts`** — Returns a signed URL for document viewing.
2. **`src/app/api/documents/signed-url/route.ts`** — Returns both preview & download URLs.
3. **`src/app/location/[id]/page.tsx`** — The documents list shows docs but has no click-to-preview.

### Fix Steps
- Read the API routes for document URLs.
- In the location page's document list, each document row is a `<div>` with no click handler or link. Add a click handler that:
  1. Fetches a signed URL from `/api/documents/${doc.id}/url` or `/api/documents/signed-url?id=${doc.id}`.
  2. Opens the URL in a new tab (`window.open(url, '_blank')`).
- Add a clickable indicator (e.g., an eye icon from lucide-react) to show documents are viewable.
- The document list section is currently a server component (in the location page). You may need to extract the document list into a client component to handle click events, OR use a simple `<a>` tag with the signed URL approach.
- IMPORTANT: The signed URL generation might fail if the file path in the database doesn't match what's in Supabase Storage. Verify the file path format: it should be `{userId}/{timestamp}_{filename}`.

Since the location page is a server component, the simplest approach is to create a small client component for the document list:

```typescript
// src/components/DocumentListItem.tsx
'use client'

import { useState } from 'react'
import { FileText, Eye, Loader2 } from 'lucide-react'

interface DocumentListItemProps {
  doc: {
    id: string
    file_name: string
    display_name: string | null
    document_type: string
  }
}

const DOC_TYPE_LABELS: Record<string, string> = {
  base_lease: 'Base Lease',
  amendment: 'Amendment',
  commencement_letter: 'Commencement Letter',
  exhibit: 'Exhibit / Addendum',
  side_letter: 'Side Letter',
}

export function DocumentListItem({ doc }: DocumentListItemProps) {
  const [loading, setLoading] = useState(false)

  const handlePreview = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/documents/signed-url?id=${doc.id}`)
      if (res.ok) {
        const data = await res.json()
        if (data.previewUrl) {
          window.open(data.previewUrl, '_blank')
        }
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="glass-card rounded-xl px-5 py-4 flex items-center gap-4 cursor-pointer hover:bg-white/[0.06] transition-colors"
      onClick={handlePreview}
    >
      <div
        className="flex items-center justify-center w-9 h-9 rounded-lg shrink-0"
        style={{ background: 'rgba(16,185,129,0.10)', border: '1px solid rgba(16,185,129,0.15)' }}
      >
        <FileText className="h-4 w-4 text-emerald-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{doc.display_name ?? doc.file_name}</p>
        {doc.display_name && (
          <p className="text-xs text-muted-foreground/75 truncate mt-0.5">{doc.file_name}</p>
        )}
      </div>
      <span className="text-xs text-muted-foreground/70 shrink-0 bg-white/[0.04] px-2 py-1 rounded-md">
        {DOC_TYPE_LABELS[doc.document_type] ?? doc.document_type.replace(/_/g, ' ')}
      </span>
      <button className="text-muted-foreground/50 hover:text-emerald-400 transition-colors shrink-0">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  )
}
```

Then use `<DocumentListItem doc={doc} />` in the location page instead of the current static `<div>`.

---

## Bug 9: Asset Class Not Being Auto-Detected from Lease

### Problem
When a user uploads documents and generates a lease summary, the asset class should be automatically set on the store. The `generateLeaseSummary` function extracts `asset_class` and updates the store, but it may not be working.

### Files to Check and Fix
1. **`src/lib/leaseSummary.ts`** — The function extracts `asset_class` from Claude's response and updates the store:
   ```typescript
   if (asset_class) {
     await admin.from('stores').update({ asset_class }).eq('id', storeId).eq('tenant_id', tenantId)
   }
   ```
   - Verify the stores table has an `asset_class` column.
   - Verify the Claude prompt asks for `asset_class` (it does).
   - Check if the destructuring `const { asset_class, ...summaryOnly } = summaryData` correctly separates asset_class.

2. **`src/app/api/stores/[id]/detect-asset-class/route.ts`** — Separate endpoint for manual detection.

### Fix Steps
- Verify the `stores` table has an `asset_class` column (check migration 002).
- In `leaseSummary.ts`:
  - Add error logging if the store update fails.
  - Ensure `asset_class` is one of the valid values: Retail, Office, Industrial, Mixed-Use, Medical, Restaurant, Grocery, Other.
  - If Claude returns a different format, normalize it.
- After generating a lease summary, the `LeaseSummaryCard` should trigger a refresh of the parent location page to show the updated asset class. Since the location page is a server component, consider using `router.refresh()` or a simple page reload after generation.

---

## Testing Approach

After fixing each bug:
1. Check that TypeScript compiles: `npx tsc --noEmit`
2. Check that the build succeeds: `npx next build`
3. Search for any remaining `console.log` statements that should be removed from production code (keep error/warn logging).

## Final Verification

Run `npx next build` to verify. Fix any errors.
