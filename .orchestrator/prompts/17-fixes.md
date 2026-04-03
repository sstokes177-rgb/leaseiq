Read the entire src/ directory before making any changes.

## TASK: Fix hydration errors, rebrand to Provelo, improve UX

### FIX 1: REBRAND — Replace ALL instances of ClauseIQ and LeaseIQ with Provelo
Search every file in the entire project for:
- "ClauseIQ" → replace with "Provelo"
- "clauseiq" → replace with "Provelo"
- "CLAUSEIQ" → replace with "PROVELO"
- "LeaseIQ" → replace with "Provelo"
- "leaseiq" → replace with "provelo"
- "LEASEIQ" → replace with "PROVELO"
- "Clause IQ" → replace with "Provelo"
- "Lease IQ" → replace with "Provelo"

Check these files specifically:
- src/app/page.tsx (landing page)
- src/app/layout.tsx (page title, meta tags)
- src/components/ (all components — navbar, footer, headers)
- package.json (name field)
- CLAUDE.md
- Any other file that contains the old name

The logo initials in the header should change to "PV" for Provelo.
The tagline can be: "Commercial Lease Intelligence" (keep this the same).

### FIX 2: HYDRATION ERRORS — p cannot contain p or div
The ArticleRef component inside the markdown renderer is putting <p> and <div> elements inside a <p> tag. This is invalid HTML and causes React hydration errors.

Find the ArticleRef component in the chat message rendering code (likely in src/components/ChatMessage.tsx or a related file around line 500).

The problem: The markdown renderer wraps text in <p> tags via the mdP component. Inside that <p>, the ArticleRef component renders a tooltip/popup that contains <div> and <p> elements. HTML doesn't allow <p> inside <p> or <div> inside <p>.

Fix by:
1. In the mdP component (the custom paragraph renderer for react-markdown), change the outer element from <p> to <div> with the same styling. This allows block-level children inside it.
   Change: <p className="text-sm leading-[1.7] text-white/90 mb-3 last:mb-0">
   To: <div className="text-sm leading-[1.7] text-white/90 mb-3 last:mb-0">
2. In the ArticleRef tooltip/popup, change any <p> tags to <span> tags since they may be inside the paragraph wrapper.
3. Make sure the tooltip popup div uses a portal (createPortal) or is positioned with position:fixed so it's not a DOM child of the <p> — OR simply change the parent from <p> to <div> as described above.

### FIX 3: LOCATION DETAIL PAGE — Move chat and upload buttons to the top
On the location detail page (where you see lease summary, obligation matrix, documents, chat):
- Move "Ask Your Lease" / "Start Chatting" button to the TOP of the page, right below the location header
- Move "Upload Documents" button next to it
- These two should be the most prominent actions — large, clear buttons at the top
- Layout: two buttons side by side at the top. "Ask Your Lease" (emerald/teal gradient, primary) and "Upload Documents" (outlined/secondary style)
- The rest of the content (lease summary, obligation matrix, critical dates, documents list) flows below
- On mobile, stack the buttons vertically

### FIX 4: RESIZABLE PDF SIDE PANEL
The right-side panel that shows the PDF when you click an article reference is too small to read.

Make it resizable:
1. Add a drag handle on the LEFT edge of the panel (a thin vertical bar, 4-6px wide, with a subtle grip indicator)
2. When the user clicks and drags the handle LEFT, the panel gets wider (chat area shrinks)
3. When they drag RIGHT, the panel gets narrower (chat area grows)
4. Minimum panel width: 300px
5. Maximum panel width: 70% of viewport
6. Default panel width: 40% of viewport
7. The drag handle should have a cursor: col-resize on hover
8. Store the panel width in state so it persists during the session
9. Add a "Full Screen" button in the panel header that expands it to 90% of viewport
10. Add a "Reset Size" button that returns it to default 40%
11. On mobile: the panel should be full screen (100% width) with a close button — no dragging needed
12. Smooth transitions when resizing

Implementation:
- Use onMouseDown on the drag handle to start tracking
- Use onMouseMove on the document to update width
- Use onMouseUp to stop tracking
- Apply the width as an inline style on the panel container
- The chat area should use flex-1 so it automatically adjusts

Run npx next build to verify. Fix any errors.
