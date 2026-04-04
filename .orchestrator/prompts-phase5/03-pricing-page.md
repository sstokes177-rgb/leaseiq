Read the entire src/ directory before making any changes.

## TASK: Build Premium Pricing Page — 14-Day Trial, Tiered Plans

Provelo is a premium product. No free tier. 14-day free trial with credit card required upfront. The pricing page must communicate high-end value, not bargain software.

### CREATE: src/app/pricing/page.tsx

This is a PUBLIC page (no auth required), using the same navbar as the landing page.

### PAGE STRUCTURE

**Header:**
- Title: "Simple, transparent pricing" — text-4xl font-bold text-white text-center
- Subtitle: "Start your 14-day free trial. No commitment, cancel anytime." — text-lg text-gray-400 text-center
- Below subtitle: "Credit card required to start trial" — text-sm text-gray-500

**Billing toggle:**
- Monthly / Annual toggle switch (centered)
- Annual shows discount: "Save 20%" badge next to Annual option
- Toggle: pill-shaped, bg-white/[0.06], active side bg-emerald-600
- Default: Annual selected

**Three pricing tiers in a row:**

TIER 1 — STARTER
- For: "For individual tenants"
- Locations: "1-3 locations"
- Price: show as placeholder — "$___/mo" with note "Pricing coming soon"
- Or if you want placeholder numbers: "$79/mo billed annually" (this positions it as premium)
- Features list:
  - AI lease chat with article citations
  - Lease summary extraction
  - Risk score with 20-clause analysis
  - Obligation matrix
  - Critical date alerts
  - CAM charge analysis
  - Document storage (up to 50 documents)
  - Email support
- CTA button: "Start 14-Day Trial" (secondary style)

TIER 2 — GROWTH (MOST POPULAR — highlighted)
- Badge: "Most Popular" emerald badge at top
- For: "For growing businesses"
- Locations: "4-15 locations"
- Price: "$___/mo" or placeholder "$149/mo billed annually"
- Everything in Starter, PLUS:
  - Portfolio analytics dashboard
  - Cross-location AI chat
  - CAM forensic audit (14 detection rules)
  - Lease comparison (amendment analysis)
  - Negotiation recommendations with suggested language
  - CAM dispute letter generation
  - Team collaboration (up to 5 members)
  - Priority support
  - Export to PDF/CSV
- CTA button: "Start 14-Day Trial" (PRIMARY style — emerald, larger)
- This card is slightly larger, has an emerald border, and is visually prominent

TIER 3 — SCALE
- For: "For multi-location operators"
- Locations: "16+ locations"
- Price: "Custom" or "Contact Us"
- Everything in Growth, PLUS:
  - Unlimited locations
  - Unlimited team members
  - Dedicated onboarding
  - Custom integrations
  - SLA guarantee
  - Dedicated account manager
  - API access (coming soon)
- CTA button: "Contact Sales" (secondary style, links to mailto or contact form)

**Card styling:**
- Each card: bg-white/[0.03] border border-white/[0.06] rounded-2xl p-8
- Growth card (highlighted): border-emerald-500/40 bg-emerald-500/[0.03] relative overflow-hidden, with a subtle emerald glow
- Feature list: checkmark icons (emerald) next to each feature, text-sm text-gray-300
- Price: text-5xl font-bold text-white for the number, text-lg text-gray-400 for "/mo"
- Annual price shows monthly equivalent, with strikethrough on monthly price

**Below the tiers:**

FAQ Section:
- "Frequently asked questions" heading
- Expandable accordion items:
  1. "What happens after my 14-day trial?" — "Your subscription begins automatically. You can cancel anytime during the trial and won't be charged."
  2. "Can I switch plans later?" — "Yes, you can upgrade or downgrade at any time. Changes take effect on your next billing cycle."
  3. "What payment methods do you accept?" — "We accept all major credit cards. Enterprise plans can pay by invoice."
  4. "Is my data secure?" — "Yes. All documents are encrypted at rest and in transit. We never share your data with third parties."
  5. "Do you offer refunds?" — "If you're not satisfied within the first 30 days of your paid subscription, we'll issue a full refund."
  6. "Can I import my existing leases?" — "Absolutely. Upload any PDF lease document and our AI will extract and analyze it in under 2 minutes."

Each FAQ item: click to expand/collapse, smooth animation, plus/minus icon.

**Final CTA:**
- "Ready to understand your lease?"
- "Start your 14-day trial today"
- Button: "Start 14-Day Trial" (large, emerald)
- Below: "No commitment. Cancel anytime."

### NAVIGATION

- Add "Pricing" link to the landing page navbar (between "For Tenants" and "Sign In")
- Add "Pricing" link to the About page navbar
- Link from the landing page "Start 14-Day Trial" buttons to /pricing or directly to /login?signup=true

### IMPORTANT NOTES

- Do NOT hardcode final prices if you use placeholder amounts — add a comment: // TODO: Update pricing before launch
- The page must feel PREMIUM — not cheap, not bargain. Think Stripe's pricing page aesthetic.
- Lots of whitespace, clean typography, high contrast
- Mobile responsive: cards stack vertically, Growth card stays highlighted

Run npx next build — fix any errors.
Then: git add . && git commit -m "Premium pricing page with 14-day trial tiers" && git push

