Read src/components/LandingPage.tsx and src/app/page.tsx completely before making any changes.

## TASK: Landing Page Redesign — Institutional-Caliber, Futuristic, Captivating

Research the best SaaS landing pages of 2025-2026 (Stripe, Linear, Vercel, Arc Browser, Raycast, Clerk, Resend) and apply their design principles. The current page looks like generic AI-generated output. It needs to feel like a $10M+ company built it.

KEEP: the smooth scrolling and gliding animations that already exist. ENHANCE everything else.

---

### DESIGN PRINCIPLES TO FOLLOW:

1. **Typography-first design** (like Stripe/Vercel): The headline IS the visual. No need for hero images when the words are powerful enough. Use large, confident typography with tight letter-spacing.

2. **Intentional whitespace** (like Linear): Every pixel of empty space is deliberate. Sections breathe. Nothing feels cramped or cluttered.

3. **Subtle motion** (like Vercel): Elements animate in as the user scrolls — fade up, subtle parallax, staggered reveals. Nothing flashy or bouncy. Refined, smooth, purposeful.

4. **Dark mode sophistication** (like Raycast/Arc): Deep blacks, precise borders, glass effects done sparingly. Emerald accents used surgically, not splashed everywhere.

5. **Trust through simplicity**: The fewer elements on screen, the more premium it feels. Every word earns its place.

---

### COMPLETE REDESIGN OF LandingPage.tsx:

**NAVBAR (sticky, transforms on scroll):**
- Before scroll: transparent background, logo + nav links
- After scroll: bg-gray-950/80 backdrop-blur-xl border-b border-white/[0.04]
- Left: PV logo icon + "Provelo" (font-semibold text-lg tracking-tight)
- Center: Features, About, Pricing (text-sm text-gray-400 hover:text-white transition-colors)
- Right: "Sign in" (text-sm text-gray-400) + "Start 14-Day Trial" (bg-emerald-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-emerald-500)
- Mobile: hamburger menu
- Height: 64px, items-center

**HERO SECTION (100vh minus navbar):**
- Center-aligned content, vertically centered in the viewport
- Small pill badge above headline: "Commercial Lease Intelligence" — bg-white/[0.05] border border-white/[0.08] rounded-full px-4 py-1.5 text-xs text-emerald-400 tracking-wider uppercase
- Headline: "Understand your lease." — ONE powerful line
  - text-6xl md:text-7xl lg:text-8xl font-bold tracking-tighter text-white
  - Second line below in text-gray-400: "Protect your business."
  - The contrast between white and gray creates visual hierarchy
- Subheadline (below, after slight gap): "AI-powered lease intelligence that reads your entire lease, scores your risk across 20 clauses, and catches billing errors — in minutes, not months."
  - text-lg md:text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed
- Two CTAs centered below:
  - "Start 14-Day Trial" — bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-3.5 rounded-xl text-base font-medium
  - "See how it works" — text-gray-400 hover:text-white px-6 py-3.5 text-base, with a ChevronDown icon that gently bounces
- Below CTAs: "No credit card for 14 days. Cancel anytime." — text-sm text-gray-600
- Subtle background: radial gradient from emerald-950/10 at center, fading to transparent. Optional: very subtle grid pattern (like Stripe's dot grid) using CSS background-image with tiny dots at 32px intervals, opacity 0.03

**SOCIAL PROOF BAR (subtle, below hero):**
- A thin section: "Trusted by commercial tenants managing retail, office, and industrial spaces"
- text-sm text-gray-500 text-center
- Below: a row of 3-4 trust indicators (not logos since we don't have client logos yet):
  - "Enterprise-grade security" with Lock icon
  - "SOC 2 architecture" with Shield icon  
  - "256-bit encryption" with Key icon
- Each: text-xs text-gray-500, subtle, understated

**FEATURES SECTION:**
- Section heading: "Everything you need." in text-4xl font-bold text-white, left-aligned
- Subheading: "One platform for lease intelligence, risk analysis, and cost recovery." text-lg text-gray-400
- STAGGERED CARD LAYOUT (not a boring grid):
  - Use a bento-grid style layout — cards of different sizes arranged artfully
  - Large card (spans 2 columns): AI Chat — "Ask your lease anything"
    - Show a mock chat bubble exchange (dark bg, emerald user bubble, gray assistant bubble with a short lease answer including an article citation)
    - Not a screenshot — build it as styled HTML elements
  - Medium card: Risk Scoring — "Score every clause"
    - Show a mini risk gauge (0-100) with 3 colored clause dots
  - Medium card: CAM Audit — "Catch billing errors"  
    - Show a mini finding card: "Pro-rata share error: $4,200 overcharge detected"
  - Small card: Critical Dates — "Never miss a deadline"
    - Show a mini calendar with colored dots
  - Small card: Lease Comparison — "Track every change"
    - Show two columns with a green/red diff indicator
  - Small card: Portfolio Analytics — "See the big picture"
    - Show a mini bar chart

Card styling:
- bg-white/[0.02] border border-white/[0.06] rounded-2xl overflow-hidden
- Each card has: header area (p-6, icon + title + description) and visual area (mock UI element)
- Hover: border-white/[0.1] transition-all duration-300, subtle translateY(-2px)
- Cards fade in and slide up as they scroll into view (Intersection Observer + CSS)

**HOW IT WORKS SECTION:**
- Three steps, horizontal on desktop, vertical on mobile
- Each step connected by a thin line (border-dashed border-white/[0.06])
- Step 1: "Upload" — Upload icon in emerald circle, "Drop your lease PDF" below, brief description
- Step 2: "Analyze" — Brain/Sparkles icon, "AI reads every clause", brief description  
- Step 3: "Act" — Zap icon, "Get intelligence and recommendations", brief description
- Numbers: large "01" "02" "03" in text-6xl font-bold text-white/[0.03] positioned behind the content (watermark style)
- Fade in on scroll

**FINAL CTA SECTION:**
- Full-width section with subtle emerald glow
- "Ready to understand your lease?" — text-4xl font-bold text-white text-center
- "Join commercial tenants who save thousands by knowing their rights." — text-lg text-gray-400
- Large "Start 14-Day Trial" button
- Below: "14-day free trial. No commitment. Cancel anytime."

**FOOTER:**
- Four columns: Product (Features, Pricing, Security), Company (About, Contact), Legal (Privacy, Terms), Connect (Twitter, LinkedIn)
- Bottom row: "2026 Provelo. Commercial Lease Intelligence." + small PV logo
- Muted colors: text-gray-500, links hover to text-gray-300
- border-t border-white/[0.04]

---

### ANIMATIONS (CSS only, no heavy libraries):

All scroll animations use Intersection Observer:
```typescript
useEffect(() => {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animate-in')
        }
      })
    },
    { threshold: 0.1 }
  )
  document.querySelectorAll('.scroll-animate').forEach(el => observer.observe(el))
  return () => observer.disconnect()
}, [])
```

CSS classes:
```css
.scroll-animate {
  opacity: 0;
  transform: translateY(20px);
  transition: opacity 0.6s ease, transform 0.6s ease;
}
.scroll-animate.animate-in {
  opacity: 1;
  transform: translateY(0);
}
```

Stagger: add transition-delay inline (style={{ transitionDelay: '100ms' }}) for sequential elements.

Hero text: fade in from bottom on page load (not scroll-triggered — immediate on mount with 200ms delay).

---

### RESPONSIVE:
- Mobile: text scales down (hero text-4xl), cards stack to single column, nav becomes hamburger
- Tablet: hero text-5xl, cards 2-column
- All touch targets 44px minimum

---

### PERFORMANCE:
- No images to load — everything is CSS/SVG/HTML
- No animation libraries — pure CSS transitions
- Page should feel instant

---

Run npx next build — fix any errors.
Then: git add . && git commit -m "Phase 6: Landing page redesign - institutional caliber" && git push

