Read the entire src/ directory before making any changes. Pay special attention to:
- All components related to the chat interface, article references, citation panels
- All components related to risk scoring
- All components related to obligation matrix
- The Supabase schema for conversations, messages, and any chat-related tables
- All API routes

## TASK: Fix 5 critical bugs reported during testing

---

### BUG 1: CITATION PANEL TEXT IS LEFT-ALIGNED — MUST BE CENTERED/JUSTIFIED

When clicking an article reference in chat and viewing the extracted text in the right panel, the text is left-aligned (ragged right edge) like raw code output. This looks unprofessional.

**What to fix:**
Find every component that renders extracted lease text in the side panel (CitationPanel, LeasePanel, ArticlePanel, or whatever it is named). Update the CSS:

```css
text-align: justify;
line-height: 1.7;
font-size: 16px;
padding: 24px 28px;
max-width: 72ch;
margin: 0 auto;
font-family: 'Inter', 'Plus Jakarta Sans', -apple-system, sans-serif;
```

Also ensure:
- Paragraph breaks from the original document are preserved — do NOT collapse into one block
- If the text contains article/section headers (like "Article 10 - Assignment"), make them bold, slightly larger (18px), with margin-top: 24px
- Add a subtle top border or divider between sections
- Check EVERY location (Whole Foods, ABC Logistics, Gate, and any others) to confirm the fix applies universally — the bug may exist in a shared component or may be location-specific due to different rendering paths

**Check all locations systematically.** Search the codebase for any component that renders extracted text. There may be multiple code paths — a panel for chat citations, a panel for document viewer, etc. Fix ALL of them.

---

### BUG 2: IN-APP CHAT SAVING — THIS IS THE 3RD TIME THIS HAS BEEN REQUESTED

The chat conversations are NOT being saved inside the app. When the user navigates away and comes back, the chat is gone. There is only a "Save chat as PDF" button in the top right. The user needs persistent in-app chat history that shows up in the left sidebar under "New Chat".

**This is the #1 priority fix. It has been requested 3 times and must work.**

**Database requirements:**
First, check if the conversations and messages tables already exist in Supabase. If they do, verify the schema matches what's needed below. If they don't exist, create them.

```sql
-- Check and create if not exists
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  title TEXT DEFAULT 'New conversation',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  citations JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_conversations_tenant_store ON conversations(tenant_id, store_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);

-- RLS
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Tenant sees own conversations" ON conversations
  FOR ALL USING (tenant_id = auth.uid());
CREATE POLICY IF NOT EXISTS "Tenant sees own messages" ON messages
  FOR ALL USING (conversation_id IN (
    SELECT id FROM conversations WHERE tenant_id = auth.uid()
  ));
```

**Frontend implementation — step by step:**

1. Find the chat component (likely in the location detail page or a dedicated chat page).

2. When the user sends their FIRST message in a new chat:
   a. Immediately create a new conversation record in Supabase: `{ tenant_id, store_id, title: 'New conversation' }`
   b. Save the user message to the messages table with the new conversation_id
   c. Store the conversation_id in React state so subsequent messages use it
   d. After the AI responds, save the AI response to the messages table
   e. Auto-generate a title: call the Claude API with "Generate a 4-6 word title for this conversation. The user asked: [first message]. Return ONLY the title, nothing else."
   f. Update the conversation record with the generated title

3. For subsequent messages in the SAME conversation:
   a. Save each user message to the messages table with the existing conversation_id
   b. After AI responds, save the AI response to the messages table
   c. Update the conversation's updated_at timestamp

4. Chat history sidebar (LEFT side of chat interface):
   a. Shows all conversations for the CURRENT store/location only
   b. Ordered by most recent (updated_at DESC)
   c. Each entry shows: title, relative date ("2h ago", "Yesterday", "Mar 28")
   d. Clicking an entry loads that conversation's messages into the chat area
   e. Currently active conversation is highlighted with an emerald left border
   f. "New Chat" button at the top starts a fresh conversation (clears chat, resets conversation_id to null)
   g. The sidebar should auto-refresh when a new conversation is created

5. When user navigates away and comes back:
   a. Load all past conversations from the database for this location
   b. If there was an active conversation, it should still be loaded
   c. NO data should EVER be lost

6. API routes needed (create if they don't exist):
   - POST /api/conversations — create a new conversation
   - GET /api/conversations?store_id=X — list conversations for a store
   - PUT /api/conversations/[id] — update title
   - POST /api/messages — save a message
   - GET /api/messages?conversation_id=X — load messages for a conversation

**Test this thoroughly.** After implementing:
- Send a message → navigate away → come back → conversation should be in the sidebar
- Click the conversation → messages should load
- Start a new chat → send a message → it should appear as a second conversation in the sidebar
- The title should auto-generate after the first exchange

---

### BUG 3: LEASE RISK SCORE FAILS FOR ALL LOCATIONS

Every location shows "Risk analysis failed. Please try again." when trying to view the risk score.

**Debugging steps:**
1. Find the risk score API route (likely /api/risk-score/route.ts or similar)
2. Check for these common failure causes:
   a. The API route might be calling Claude/OpenAI with chunks that are too large — token limit exceeded
   b. The Supabase query might be failing silently (no chunks found for the store)
   c. The API key might not be configured in .env.local
   d. The response parsing might fail if Claude returns unexpected format
   e. The store_id might not be passed correctly from the frontend

3. Add proper error handling and logging:
   ```typescript
   try {
     // ... existing logic
   } catch (error) {
     console.error('Risk score analysis failed:', error);
     return NextResponse.json(
       { error: 'Risk analysis failed', details: error instanceof Error ? error.message : 'Unknown error' },
       { status: 500 }
     );
   }
   ```

4. Fix the root cause. The most likely issue is:
   - Chunks are too large: limit to the most relevant 20-30 chunks, or summarize them before sending
   - API timeout: increase the timeout or use streaming
   - Missing env variable: check that ANTHROPIC_API_KEY or OPENAI_API_KEY exists in .env.local

5. Make the risk score more resilient:
   - If analysis partially fails, show what succeeded
   - Add a loading state with progress indication
   - Cache results so re-analyzing doesn't always hit the API
   - If no chunks are found, show a helpful message: "Upload your lease documents to enable risk analysis"

---

### BUG 4: OBLIGATION MATRIX ONLY WORKS FOR SOME LOCATIONS

The Obligation Matrix works for Whole Foods and ABC Logistics but NOT for Gate. 

**Debugging steps:**
1. Find the obligation matrix component and its data source
2. Check what's different about the Gate location:
   a. Does Gate have uploaded documents? Check the documents table for Gate's store_id
   b. Are there document_chunks for Gate? Maybe the PDF extraction failed
   c. Is the obligation matrix generation API returning an error for Gate specifically?

3. If Gate legitimately lacks lease data (no documents uploaded, or the lease doesn't contain obligation-type clauses):
   - Show a clear, helpful message: "No obligation data could be extracted from the uploaded documents for this location. This may be because: (1) No lease documents have been uploaded yet, (2) The uploaded documents don't contain standard lease obligation clauses. Upload your complete lease to enable this feature."
   - Do NOT show a generic error or a blank space — explain WHY

4. If Gate DOES have documents but the matrix fails to generate:
   - Fix the extraction/generation logic
   - The issue might be that Gate's lease uses different terminology or structure
   - Make the obligation extraction prompt more flexible to handle different lease formats

---

### BUG 5: SOME ARTICLE REFERENCES IN CHAT ARE NOT CLICKABLE

When the AI responds with article references (like "Per Article 10.1(b)" or "Section 5.2"), some are clickable and some are not. ALL article references must be clickable.

**Root cause:** The regex that detects and wraps article references in the chat response is not catching all patterns.

**Fix the regex to match ALL of these patterns:**
```javascript
const articleRegex = /(?:Per |Under |See |In |Pursuant to )?(?:Article|Section|Clause|Paragraph|Exhibit|Schedule|Appendix|Addendum|Amendment)\s+(\d+(?:\.\d+)*(?:\([a-zA-Z0-9]+\))*)/gi;
```

This should match:
- "Article 10"
- "Article 10.1"
- "Article 10.1(b)"
- "Section 5.2"
- "Per Article 10.1(b)"
- "Under Section 3"
- "Clause 7.4"
- "Exhibit A"
- "Exhibit B-1"
- "Amendment 1"
- "Schedule 1"
- "Appendix C"

**Also handle these edge cases:**
- References at the start of a sentence vs middle
- References followed by punctuation (comma, period, semicolon)
- References in parentheses
- Multiple references in one sentence: "Articles 5 and 10" or "Sections 3.1, 3.2, and 3.3"

**For each matched reference:**
1. Wrap it in a clickable component (ArticleRef or similar)
2. On click, open the citation panel with the correct article content
3. Parse the article/section number from the reference text
4. Query document_chunks for content matching that article/section
5. Display the matching content in the panel

**Test across all locations** to make sure every article reference in every chat response is clickable.

---

## FINAL STEPS

After all 5 fixes:
1. Run: npx next build — fix ALL errors
2. Run: git add . && git commit -m "Phase 2 Task 00: Fix 5 critical bugs - chat saving, risk score, obligation matrix, article refs, text alignment" && git push

