Read src/components/FloatingLeaseViewer.tsx and src/app/location/[id]/page.tsx.

## TASK: Fix Floating Lease PDF Viewer — Resize All Edges + Persist on Chat Tab

### FIX 1: RESIZE FROM ALL EDGES AND CORNERS

Currently the floating PDF viewer can only be resized from the bottom corners. Allow resizing from ALL edges and ALL corners — 8 resize handles total.

Implementation: detect which edge/corner the mouse is near and apply the appropriate resize behavior.

Add resize zones (invisible hit areas, 8px wide) on all edges:
- Top edge: cursor-ns-resize, dragging up increases height and moves Y up
- Bottom edge: cursor-ns-resize, dragging down increases height
- Left edge: cursor-ew-resize, dragging left increases width and moves X left
- Right edge: cursor-ew-resize, dragging right increases width
- Top-left corner: cursor-nwse-resize
- Top-right corner: cursor-nesw-resize
- Bottom-left corner: cursor-nesw-resize
- Bottom-right corner: cursor-nwse-resize

Each resize zone is a div positioned absolutely on the edge of the floating window. They should be invisible but have the correct cursor on hover.

During resize: enforce minimum size 300x300 and maximum size 90vw x 90vh. Prevent the window from going off screen.

### FIX 2: FLOATING VIEWER PERSISTS ON CHAT TAB

Currently the floating PDF viewer disappears when switching to the Chat tab. Fix this.

Root cause: the floating viewer state (open/closed) likely lives inside the location page component, and when the Chat tab renders, the viewer component may be conditionally excluded.

Fix: the FloatingLeaseViewer must render OUTSIDE of the tab content area. It should be at the top level of the location page, rendered regardless of which tab is active:

```tsx
return (
  <div>
    {/* Header, buttons, tabs */}
    
    {/* Tab content */}
    {activeTab === 'overview' && <OverviewContent />}
    {activeTab === 'chat' && <ChatContent />}
    {/* etc */}
    
    {/* Floating viewer - ALWAYS rendered when open, regardless of tab */}
    {floatingViewerOpen && pdfUrl && (
      <FloatingLeaseViewer pdfUrl={pdfUrl} documentName={docName} onClose={() => setFloatingViewerOpen(false)} />
    )}
  </div>
)
```

When switching to Chat tab specifically: the floating viewer should animate smoothly to the left side of the screen. Add a useEffect that watches the active tab:

```typescript
useEffect(() => {
  if (activeTab === 'chat' && floatingViewerOpen) {
    // Smoothly move to left side
    setViewerPosition(prev => ({
      ...prev,
      x: 16, // 16px from left edge
      transition: true // flag to enable CSS transition
    }))
  }
}, [activeTab, floatingViewerOpen])
```

In the FloatingLeaseViewer component, when transition flag is true, add: style={{ transition: 'left 0.3s ease, top 0.3s ease' }}. After the transition completes (300ms), remove the transition flag so dragging feels immediate again.

The user can still drag it elsewhere after it auto-slides to the left.

Run npx next build — fix any errors.
Then: git add . && git commit -m "Floating PDF: resize all edges, persist on chat tab" && git push

