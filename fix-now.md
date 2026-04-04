Read the entire src/ directory, focusing on src/app/location/[id]/page.tsx, src/components/CitationSidePanel.tsx, and any PDF viewer components.

TASK: Build a Floating Draggable Lease PDF Viewer

Add a Preview Lease button right next to the Upload Documents button at the top of the location detail page.

When clicked it opens a floating, draggable, resizable window containing the lease PDF. The window uses position fixed so it stays on screen while scrolling. User can grab the title bar area and drag it anywhere on screen. User can resize it by dragging the bottom-right corner. It persists when switching between tabs (Overview, Risk, Financial, Documents, Chat). It is COMPLETELY INDEPENDENT from the CitationSidePanel. They are two separate features that do not interact. When in Chat and user clicks an article reference, the citation panel opens normally as always showing extracted text. The floating lease window stays wherever the user put it, showing whatever page they were on. Close button X in the top-right corner of the floating window.

Create src/components/FloatingLeaseViewer.tsx as a client component with useState for position (x,y), size (width,height), isDragging, and minimized state. Title bar is dark bg-gray-900, shows document name, has cursor-grab for dragging, grip icon on the left. Controls in title bar: minimize button (collapse to just title bar), maximize button (expand to 80vw x 80vh), close X button. Body contains an iframe showing the PDF via signed URL from Supabase storage. Border: border border-white/10 rounded-xl overflow-hidden. Shadow: shadow-2xl. z-index 40. Minimum size 300x300. Resize handle in bottom-right corner.

Drag implementation: onMouseDown on title bar captures offset, mousemove on document updates position, mouseup stops dragging. Set document.body.style.userSelect to none while dragging.

To get the PDF URL: when Preview Lease is clicked, fetch the first document for this store from /api/documents then get its signed URL from /api/documents/[id]/url. If multiple documents exist, show a small dropdown to pick which one.

State management: the floating viewer open/closed state and pdfUrl live in the location page component. The FloatingLeaseViewer renders when open.

Also verify the ScrollToTop component uses behavior smooth in window.scrollTo for smooth scrolling not instant jumping.

After all changes: npx next build and fix any errors. Then git add . and git commit -m "Floating draggable lease PDF viewer" and git push.
