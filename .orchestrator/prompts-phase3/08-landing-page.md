Read the entire src/ directory before making any changes. Focus on src/components/LandingPage.tsx and src/app/page.tsx.

## TASK: Landing Page Overhaul — Match Stripe/Linear/Vercel Quality

The landing page must convert visitors into signups. Current one exists but needs to match the best SaaS products. Stripe's clean data presentation, Linear's calm design, Vercel's speed-first aesthetic.

---

### COMPLETE REDESIGN OF src/components/LandingPage.tsx

**Navigation bar (sticky):**
- Left: Provelo logo ("PV" icon + "Provelo" text), tagline "Commercial Lease Intelligence" in text-xs text-gray-500
- Center: Features, How It Works, For Tenants (anchor links)
- Right: "Sign In" (ghost button, text-gray-300 hover:text-white) + "Start Free" (bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg px-5 py-2.5)
- On scroll: bg-gray-950/80 backdrop-blur-xl border-b border-white/5 transition-all
- Mobile: hamburger menu

**Hero Section:**
- Full viewport height minus navbar
- Background: subtle radial gradient from emerald-950/20 at center to transparent
- Optional: very subtle animated grid dots or mesh gradient (CSS only, no heavy library)
- Headline: "Know Your Lease. Protect Your Business." — text-5xl md:text-7xl font-bold tracking-tight text-white, max-w-4xl mx-auto text-center
- Subheadline: "AI-powered lease intelligence for commercial tenants. Understand your rights, catch billing errors, and never miss a critical date." — text-lg md:text-xl text-gray-400 max-w-2xl mx-auto text-center mt-6
- Two CTAs side by side (centered):
  - "Start Free" — large emerald button, px-8 py-4 text-lg rounded-xl
  - "See How It Works" — outlined button, scrolls to features section
- Below CTAs: "No credit card required. First lease analysis in under 2 minutes." — text-sm text-gray-500

**Problem Section (pain points):**
- Background: slightly darker section
- Heading: "Commercial leases are designed to protect landlords." — text-3xl font-bold text-white text-center
- Subheading: "Provelo levels the playing field." — text-emerald-400
- Three pain point cards in a row:
  1. Magnifying glass icon — "40% of CAM reconciliations contain billing errors" — "Most tenants never know they're overpaying."
  2. Calendar icon — "Critical dates buried in 100-page documents" — "Miss a renewal deadline and lose your lease."
  3. Scale/gavel icon — "Legal language designed to confuse" — "You signed it, but do you understand it?"
- Cards: bg-white/[0.03] border border-white/[0.06] rounded-xl p-8, hover:border-emerald-500/20 transition-all

**Feature Cards (4 key features):**
- Two rows of two cards, or staggered layout
- Each card: icon (emerald-400), title (text-xl font-semibold text-white), description (text-gray-400), subtle animated illustration or screenshot area

1. MessageSquare icon — "Ask Your Lease Anything" — "Get plain-English answers about your rights, obligations, and what you can and can't do. With article-level citations you can verify."
2. ShieldCheck icon — "Catch CAM Overcharges" — "14-rule forensic audit finds billing errors that cost tenants thousands. What took CPAs $15,000 takes Provelo 30 seconds."
3. BarChart3 icon — "Score Your Lease Risk" — "20-clause analysis scores your lease from 0-100 with AI-powered negotiation recommendations and suggested lease language."
4. Bell icon — "Never Miss a Deadline" — "Automated alerts for renewals, rent escalations, option windows, and every critical date in your lease."

**How It Works (3 steps):**
- Horizontal flow with connecting lines/arrows between steps
- Step 1: Upload icon — "Upload your lease PDF" — "Drag and drop any commercial lease. We process base leases, amendments, exhibits, and more."
- Step 2: Brain/AI icon — "AI analyzes every clause" — "Our AI reads your entire lease, extracts key terms, identifies risks, and builds your intelligence dashboard."
- Step 3: Sparkles icon — "Get instant intelligence" — "Ask questions, run audits, compare amendments, and get negotiation recommendations — all in plain English."
- Each step: number circle (1, 2, 3) with emerald background, description below

**Social proof / trust section:**
- "Built for commercial tenants managing 1 to 1,000+ locations"
- Three trust badges in a row:
  - Lock icon — "End-to-end encryption"
  - Shield icon — "Enterprise-grade security"
  - Eye-off icon — "Your data stays yours"
- Below: "Provelo never shares your lease data. Documents are encrypted at rest and in transit."

**Final CTA Section:**
- Dark section with emerald gradient overlay
- "Ready to understand your lease?"
- "Start Free" large button
- "Join tenants who've uncovered thousands in billing errors and lease risks."

**Footer:**
- Four columns: Product (Features, Pricing — coming soon, Security), Company (About, Contact, Careers), Legal (Privacy, Terms), Connect (Twitter/X, LinkedIn)
- Bottom: "© 2026 Provelo. Commercial Lease Intelligence." + Provelo logo small
- Dark background, subtle top border

---

### RESPONSIVE

- Mobile: single column everything, hero text scales down to text-3xl, nav becomes hamburger
- Tablet: two-column grids become single or two as appropriate
- All touch targets: 44px minimum

---

### PERFORMANCE

- No heavy images or videos on initial load
- All animations: CSS only (no JS animation libraries)
- Lazy load any below-fold content
- Page should feel instant

---

Run npx next build to verify. Fix ALL errors.
Then: git add . && git commit -m "Phase 3: Landing page overhaul - Stripe/Linear quality" && git push

