Read the entire src/ directory, package.json, and CLAUDE.md before making any changes.

## TASK: Complete rebrand to Provelo + Fix hydration errors

### PART 1: REBRAND TO PROVELO
Search EVERY file in the entire project. Replace ALL instances:
- "ClauseIQ" -> "Provelo"
- "clauseiq" -> "provelo"
- "CLAUSEIQ" -> "PROVELO"
- "LeaseIQ" -> "Provelo"
- "leaseiq" -> "provelo" (except in file paths and git URLs)
- "LEASEIQ" -> "PROVELO"
- "Clause IQ" -> "Provelo"
- "Lease IQ" -> "Provelo"

Check specifically: src/app/page.tsx, src/app/layout.tsx, src/components/, package.json (name field), CLAUDE.md, src/lib/prompts.ts, src/app/api/, any CSS/config files.

Logo initials: Change to "PV" wherever the logo shows initials.
Tagline: Keep "Commercial Lease Intelligence".
Color scheme: Keep existing dark theme with emerald accents.

### PART 2: FIX HYDRATION ERRORS
The mdP component (custom paragraph renderer for react-markdown) renders a <p> tag. Inside it, ArticleRef renders tooltip/popup elements containing <div> and <p> tags. HTML spec forbids block elements inside <p>.

Fix:
1. Find the mdP function in chat message rendering code.
2. Change mdP from <p> to <div> with identical className.
3. Inside ArticleRef tooltip popup, change any <p> tags to <span>.
4. Verify no other markdown components have nesting issues.

### VERIFICATION
Run: grep -ri "clauseiq\|leaseiq" src/ --include="*.tsx" --include="*.ts" --include="*.md" | grep -v node_modules | grep -v ".next"
Should return ZERO results except git URLs.
Run npx next build to verify. Fix any errors.
