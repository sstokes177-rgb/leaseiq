Read the entire src/ directory before making any changes.

## TASK: Fix PDF side panel — resizable, toggle views, reset on close

### FIX 1: TOGGLE BETWEEN EXTRACTED TEXT AND PDF
When clicking an article reference, the right panel shows both extracted text AND PDF overlapping. Add a TOGGLE:
- Two tab buttons at top: "Extracted Text" | "Original PDF"
- Default to "Extracted Text" view
- Only show ONE view at a time
- Active tab has emerald underline/highlight
- Tab buttons min 44px height for accessibility
- Text in extracted view min 16px font size

### FIX 2: RESIZABLE PANEL
Add a drag handle on LEFT edge of panel (6px wide, subtle grip dots):
- Drag LEFT = panel wider, Drag RIGHT = narrower
- Min width: 300px, Max: 70vw, Default: 40vw
- Cursor: col-resize on hover
- Add "Full Screen" button in header (90vw)
- Add "Reset" button in header (back to 40vw)
- Use onMouseDown/onMouseMove/onMouseUp pattern
- Chat area uses flex-1 to auto-adjust

### FIX 3: RESET ON CLOSE/REOPEN
When panel closes (X button) and reopens, return to DEFAULT size (40vw), not last dragged size.

### FIX 4: MOBILE
Under 768px: panel is full screen (100% width) with close button, no drag handle.

### READABILITY (45+ users)
All text: min 16px. Line height: 1.7 min. Touch targets: min 44px.

Run npx next build to verify. Fix any errors.
