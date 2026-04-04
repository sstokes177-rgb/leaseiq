Read src/app/about/page.tsx completely. Find the section that contains "In under two minutes, Sarah understands her entire lease." and the section directly above it.

There is a visible color transition right above this section where the background shifts from darker to lighter grey. Remove it completely.

Specific fix: remove the full-page linear-gradient that was just added. Replace the entire page background with a single solid color — just use the default page background with NO gradients whatsoever. No linear-gradient, no radial-gradient on the page container. Pure flat background throughout.

The ONLY gradient allowed on the entire page is the subtle emerald glow on the final CTA section, and even that should be barely visible (1-2% opacity max).

Every section from top to bottom should have identical background: transparent. No variation. Zero. The page should look like one continuous flat surface.

After changes: npx next build — fix any errors. Then git add . and git commit -m "About page: remove all gradients, pure flat background" and git push.
