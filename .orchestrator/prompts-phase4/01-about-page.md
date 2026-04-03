Read the entire src/ directory before making any changes.

## TASK: Build an "About Provelo" Page — Story-Driven Walkthrough

Create a beautiful, professional page that walks prospective users through HOW Provelo helps tenants, using a scenario-based narrative. This is NOT a features list — it's a STORY.

IMPORTANT: Do NOT slander property management companies. Do NOT position Provelo as adversarial to landlords or managers. Position it as a tool that helps tenants be informed, organized, and proactive — something that benefits everyone.

---

### CREATE: src/app/about/page.tsx

**Narrative structure — tell a story of a tenant named "Sarah" who manages 12 retail locations:**

**Section 1: The Challenge**
"Sarah runs 12 retail locations across three states. Each location has a different lease, different terms, different critical dates. She spends hours every month digging through filing cabinets and PDFs trying to answer basic questions about her leases."
- Paint the picture of complexity without blaming anyone
- Tone: empathetic, relatable

**Section 2: Upload and Understand (Lease Abstraction)**
"Sarah uploads her first lease to Provelo. In under two minutes, the AI reads all 87 pages and builds a complete summary — tenant name, landlord, lease dates, rent schedule, renewal options, permitted use, and every critical clause."
- Highlight: AI-extracted summary, instant understanding
- Visual: show a mock card layout resembling the lease summary

**Section 3: Ask Anything (AI Chat)**
"'Who's responsible for HVAC repairs?' Sarah types. Provelo responds in seconds: 'Per Article 9.1 of your base lease, HVAC maintenance is your responsibility as the tenant. You must maintain a service contract per Section 9.1(c).' Every answer cites the exact article."
- Highlight: natural language Q&A, article-level citations
- Tone: conversational, empowering

**Section 4: Know Your Risk (Risk Scoring)**
"Provelo scores Sarah's lease across 20 clause categories. Her downtown location scores 42 out of 100 — a red flag. The lease has no termination right, no CAM cap, and the landlord can relocate her with 90 days notice. Provelo generates specific negotiation recommendations with suggested lease language she can bring to her attorney."
- Highlight: risk scoring, negotiation playbook
- Tone: proactive, empowering

**Section 5: Catch Billing Errors (CAM Audit)**
"When Sarah receives her annual CAM reconciliation, she uploads it to Provelo. The system checks it against 14 detection rules and finds that her pro-rata share is calculated incorrectly — she's been overcharged $4,200 this year. Provelo generates a professional dispute letter she can send to her property manager."
- Highlight: forensic CAM audit, dispute letters
- Tone: factual, not adversarial — "billing errors happen, Provelo helps you catch them"

**Section 6: Never Miss a Date (Critical Dates)**
"Sarah's lease renewal deadline is in 6 months. Provelo alerts her 210 days before, then again at 90 days and 30 days. She never misses a deadline again."
- Highlight: configurable alerts, calendar view

**Section 7: See the Big Picture (Portfolio Analytics)**
"Across all 12 locations, Sarah can compare risk scores, track expirations, and spot trends. She sees that three leases expire within 8 months of each other — giving her leverage to negotiate better terms."
- Highlight: portfolio dashboard, cross-location intelligence

**Section 8: Compare Changes (Lease Comparison)**
"When Sarah's landlord proposes an amendment, she uploads it alongside her base lease. Provelo highlights every change — what was modified, whether it's favorable or unfavorable, and what she should watch out for."
- Highlight: side-by-side comparison, unique feature

**Final Section: CTA**
"Whether you manage 1 location or 1,000, Provelo gives you the lease intelligence you need to protect your business."
- "Start Free" button
- "No credit card required"

---

### DESIGN

- Full-page scroll experience
- Each section: full viewport height (or close to it) with clean typography
- Alternating subtle background tints between sections (very subtle — gray-950 vs gray-900/50)
- Large section numbers or chapter markers on the left (subtle, decorative)
- Typography: text-4xl for section headings, text-lg text-gray-300 for narrative, generous line-height (1.8)
- Use lucide-react icons as section markers (MessageSquare, Shield, BarChart3, Calendar, FileText, etc.)
- NO stock photos. Use icons, subtle gradients, and typography as the visual language.
- Smooth scroll between sections
- Each section fades in as user scrolls to it (use Intersection Observer + CSS transition)

---

### NAVIGATION

- Add "About" link in the landing page navbar (between "How It Works" and "For Tenants")
- Add "About" link in the app sidebar footer (small, text-gray-500)
- The About page should have the same navbar as the landing page (not the app sidebar)

---

Run npx next build — fix ALL errors.
Then: git add . && git commit -m "Phase 4: About Provelo story-driven walkthrough page" && git push

