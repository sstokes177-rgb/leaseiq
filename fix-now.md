Read src/app/about/page.tsx. Bring back the alternating dark grey and light grey section backgrounds. But instead of hard edges where one color stops and the next starts, blend them with CSS gradients on each section.

Each section should have its own background that fades smoothly into the next section's color. Implementation:

For dark sections, instead of a flat bg color, use:
background: linear-gradient(to bottom, rgba(15,15,15,1) 0%, rgba(25,25,25,1) 100%)

For light sections, instead of a flat bg color, use:
background: linear-gradient(to bottom, rgba(25,25,25,1) 0%, rgba(15,15,15,1) 100%)

The key: the bottom color of each section matches the top color of the next section. This creates a seamless blend with zero hard lines.

Alternatively, simpler approach: give each section generous padding (py-24 or py-32) and use a single full-page gradient that gently oscillates between the two shades:
background: linear-gradient(to bottom, rgb(12,12,12) 0%, rgb(22,22,22) 15%, rgb(12,12,12) 30%, rgb(22,22,22) 45%, rgb(12,12,12) 60%, rgb(22,22,22) 75%, rgb(12,12,12) 90%, rgb(22,22,22) 100%)

Apply this to the page container, not individual sections. Sections stay bg-transparent. The underlying page gradient creates the subtle alternating effect with perfectly smooth transitions and zero hard lines.

Keep the navbar its original darker color. Only the content area gets this treatment.

After changes: npx next build — fix any errors. Then git add . and git commit -m "About page: smooth blended alternating dark and light grey sections" and git push.
