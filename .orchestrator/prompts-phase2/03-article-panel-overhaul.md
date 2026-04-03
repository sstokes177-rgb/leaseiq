Read the entire src/ directory before making any changes. Focus on:
- ArticleRef component (or whatever renders clickable article references in chat)
- CitationPanel / LeasePanel / side panel component
- The API or Supabase query that fetches chunk text for a given article
- Document chunks table structure

## TASK: Complete Overhaul of Article Citation Panel

The citation panel has multiple issues: articles show the same text, text starts with cut-off words, some articles aren't clickable, and the panel doesn't navigate to the correct PDF page. Fix ALL of these.

---

### PART 1: EACH ARTICLE MUST SHOW ITS OWN CORRECT TEXT

**Current bug:** Clicking "Article 5" and "Article 10" both show the same extracted text. The panel is not filtering by article number.

**Fix strategy:**

1. Find the click handler for article references. It must extract the article/section number:
```typescript
function extractArticleNumber(referenceText: string): string {
  // Match patterns like "Article 10", "Section 5.2", "Article 10.1(b)"
  const match = referenceText.match(/(?:Article|Section|Clause|Exhibit|Amendment|Schedule|Appendix)\s+([\w\d]+(?:\.[\w\d]+)*(?:\([a-zA-Z0-9]+\))*)/i);
  return match ? match[1] : '';
}
```

2. The panel open function must receive this article identifier and query for matching chunks:
```typescript
// Query document_chunks for this specific article
const { data: chunks } = await supabase
  .from('document_chunks')
  .select('content, chunk_index, page_number, document_id')
  .eq('document_id', currentDocumentId)
  .or(`content.ilike.%Article ${articleNum}%,content.ilike.%ARTICLE ${articleNum}%,content.ilike.%Section ${articleNum}%,content.ilike.%SECTION ${articleNum}%`)
  .order('chunk_index', { ascending: true });
```

3. If multiple chunks match (article spans multiple chunks), concatenate them in order.

4. If NO chunks match the exact article number, try a broader search:
   - Search for just the number (e.g., "10.1")
   - Search for variations (e.g., "ARTICLE TEN", "Article X")
   - If still no match, show: "Could not locate Article [X] in the extracted text. Try viewing the original PDF."

---

### PART 2: CLEAN TEXT BOUNDARIES — NO CUT-OFF WORDS

**Current bug:** Text starts with "nee or subtenant if Landlord's consent is required." — a fragment of a word cut during extraction.

**Fix with a text cleaning function:**

```typescript
function cleanExtractedText(text: string): string {
  if (!text) return '';
  
  let cleaned = text.trim();
  
  // Remove leading partial word (text that doesn't start with a capital letter, 
  // article header, or number after whitespace trimming)
  // A partial word looks like: "nee or subtenant..." or "tion of the premises..."
  const leadingFragmentRegex = /^[a-z][a-zA-Z]*\s+/;
  if (leadingFragmentRegex.test(cleaned)) {
    // Find the first sentence boundary (period + space + capital letter)
    const firstSentence = cleaned.match(/\.\s+[A-Z]/);
    if (firstSentence && firstSentence.index !== undefined) {
      cleaned = cleaned.substring(firstSentence.index + 2);
    }
  }
  
  // Remove trailing partial sentence (text that doesn't end with punctuation)
  if (!/[.!?;:]$/.test(cleaned.trim())) {
    const lastSentence = cleaned.match(/.*[.!?;:]/s);
    if (lastSentence) {
      cleaned = lastSentence[0];
    }
  }
  
  // Clean up extra whitespace
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  
  // Restore paragraph breaks (double newlines in original)
  cleaned = cleaned.replace(/\.\s+(?=[A-Z])/g, '.\n\n');
  
  return cleaned;
}
```

Apply this function to ALL text before displaying it in the panel.

---

### PART 3: PANEL DISPLAY — TOGGLE BETWEEN TEXT AND PDF

The panel should have two view modes:

1. **"Extracted Text" tab** (default):
   - Clean, justified text with proper formatting
   - Article/section headers bold and larger
   - Paragraph breaks preserved
   - CSS: text-align: justify, line-height: 1.7, font-size: 16px, padding: 24px

2. **"Original PDF" tab**:
   - Embed the actual PDF using an iframe or PDF.js viewer
   - If the page number is known, navigate to that page: `${pdfUrl}#page=${pageNumber}`
   - To get the PDF URL: create or use an API route that generates a signed Supabase storage URL

3. **Tab buttons at top of panel:**
   - Two large tabs: "Extracted Text" | "Original PDF"
   - Active tab has emerald underline
   - Min 44px height for touch accessibility (45+ users)

4. **Panel header:**
   - Document name
   - Article/Section reference
   - Page number (if known)
   - Close (X) button — min 44px touch target

5. **Panel behavior:**
   - Default width: 40% viewport
   - Resizable with drag handle on left edge
   - When closed and reopened: resets to default width
   - On mobile (<768px): full-screen modal with close button

---

### PART 4: IMPROVE CHUNK-TO-ARTICLE MAPPING

For better article matching long-term, improve how chunks map to articles:

1. Add an article_reference column to document_chunks (if it doesn't exist):
```sql
ALTER TABLE document_chunks ADD COLUMN IF NOT EXISTS article_reference TEXT;
```

2. After PDF extraction, run a post-processing step that scans each chunk's content and identifies which article it belongs to:
```typescript
function identifyArticle(chunkContent: string): string | null {
  const match = chunkContent.match(/(?:ARTICLE|Article)\s+(\d+(?:\.\d+)*)/);
  return match ? match[1] : null;
}
```

3. Update each chunk with its article_reference. This makes future lookups fast:
```sql
SELECT * FROM document_chunks 
WHERE document_id = $1 AND article_reference = $2
ORDER BY chunk_index;
```

---

Run npx next build to verify. Fix ALL errors.
Then: git add . && git commit -m "Phase 2 Task 03: Article citation panel overhaul - correct filtering, clean text, PDF toggle" && git push

