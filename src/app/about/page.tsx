'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import {
  ArrowRight, Menu, X,
  FileText, MessageSquare, Shield, BarChart3,
  Calendar, PieChart, GitCompare, Sparkles,
} from 'lucide-react'
import { useState } from 'react'

/* ─── Reuse Landing Navbar ──────────────────────────────────── */

function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const onResize = () => { if (window.innerWidth >= 768) setMobileOpen(false) }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const navLinks = [
    { label: 'Features', href: '/#features' },
    { label: 'How It Works', href: '/#how-it-works' },
    { label: 'About', href: '/about' },
    { label: 'For Tenants', href: '/#for-tenants' },
  ]

  return (
    <nav className={`sticky top-0 z-50 transition-all duration-300 ${
      scrolled
        ? 'bg-gray-950/80 backdrop-blur-xl border-b border-white/5'
        : 'bg-transparent border-b border-transparent'
    }`}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg"
              style={{ background: 'linear-gradient(135deg,rgba(16,185,129,0.25),rgba(20,184,166,0.15))', border: '1px solid rgba(16,185,129,0.25)' }}>
              <span className="text-[11px] font-extrabold text-emerald-400">PV</span>
            </div>
            <span className="font-bold text-base tracking-tight text-white">Provelo</span>
          </Link>
          <span className="hidden sm:block text-xs text-gray-500">Commercial Lease Intelligence</span>
        </div>

        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((l) => (
            <Link key={l.href} href={l.href}
              className="text-sm text-gray-400 hover:text-white transition-colors">
              {l.label}
            </Link>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-3">
          <Link href="/login"
            className="text-sm text-gray-300 hover:text-white transition-colors px-3 py-2">
            Sign In
          </Link>
          <Link href="/login?mode=signup"
            className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg px-5 py-2.5 text-sm font-semibold transition-colors">
            Start 14-Day Trial
          </Link>
        </div>

        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="md:hidden p-2 text-gray-400 hover:text-white transition-colors"
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {mobileOpen && (
        <div className="md:hidden bg-gray-950/95 backdrop-blur-xl border-b border-white/5 px-4 pb-6 pt-2">
          <div className="flex flex-col gap-4">
            {navLinks.map((l) => (
              <Link key={l.href} href={l.href}
                onClick={() => setMobileOpen(false)}
                className="text-sm text-gray-300 hover:text-white transition-colors py-2">
                {l.label}
              </Link>
            ))}
            <div className="border-t border-white/10 pt-4 flex flex-col gap-3">
              <Link href="/login"
                className="text-sm text-gray-300 hover:text-white transition-colors py-2 text-center">
                Sign In
              </Link>
              <Link href="/login?mode=signup"
                className="inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg px-5 py-3 text-sm font-semibold transition-colors">
                Start 14-Day Trial
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}

/* ─── Scroll-reveal Section wrapper ─────────────────────────── */

function RevealSection({
  children,
  className = '',
}: {
  children: React.ReactNode
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true) },
      { threshold: 0.15 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      } ${className}`}
    >
      {children}
    </div>
  )
}

/* ─── Section Data ──────────────────────────────────────────── */

const SECTIONS = [
  {
    num: '01',
    icon: FileText,
    label: 'The Challenge',
    heading: 'Sarah manages 12 retail locations across three states.',
    body: `Each location has a different lease, different terms, different critical dates. She spends hours every month digging through filing cabinets and PDFs trying to answer basic questions — When does this lease expire? What's the rent escalation? Can I sublease? Every answer requires pulling out the binder, flipping through 80+ pages, and hoping she finds the right clause. It's not anyone's fault — commercial leases are complex documents. But without the right tools, staying on top of them is a full-time job.`,
    accent: false,
  },
  {
    num: '02',
    icon: Sparkles,
    label: 'Upload & Understand',
    heading: 'In under two minutes, Sarah understands her entire lease.',
    body: `She uploads her first lease to Provelo. The AI reads all 87 pages and builds a complete summary — tenant name, landlord, lease dates, rent schedule, renewal options, permitted use, and every critical clause. What used to take hours of manual review is now an organized, searchable intelligence card. Every key term, every important date, every obligation — extracted and structured automatically.`,
    accent: true,
    card: {
      title: 'Lease Summary — Downtown Austin',
      items: [
        { label: 'Tenant', value: 'Sarah Chen Retail LLC' },
        { label: 'Landlord', value: 'Austin Plaza Partners LP' },
        { label: 'Term', value: 'Jan 2023 — Dec 2032 (10 yrs)' },
        { label: 'Base Rent', value: '$8,450/mo with 3% annual escalation' },
        { label: 'Renewal Options', value: '2 x 5-year options at FMV' },
        { label: 'Permitted Use', value: 'Retail sales of apparel and accessories' },
      ],
    },
  },
  {
    num: '03',
    icon: MessageSquare,
    label: 'Ask Anything',
    heading: `"Who's responsible for HVAC repairs?"`,
    body: `Sarah types her question in plain English. Provelo responds in seconds: "Per Article 9.1 of your base lease, HVAC maintenance is your responsibility as the tenant. You must maintain a service contract with a licensed provider per Section 9.1(c). The landlord is responsible for replacement of the HVAC system only if it cannot be reasonably repaired, per Section 9.2." Every answer cites the exact article so Sarah can verify it herself. No more guessing. No more calling her attorney for basic questions.`,
    accent: false,
    chat: {
      question: "Who's responsible for HVAC repairs?",
      answer:
        'Per Article 9.1 of your base lease, HVAC maintenance is your responsibility as the tenant. You must maintain a service contract with a licensed provider per Section 9.1(c).',
      cite: 'Article 9.1, Section 9.1(c) — Base Lease',
    },
  },
  {
    num: '04',
    icon: Shield,
    label: 'Know Your Risk',
    heading: 'Her downtown location scores 42 out of 100 — a red flag.',
    body: `Provelo scores Sarah's lease across 20 clause categories. Her downtown location has no early termination right, no CAM cap, and the landlord can relocate her with just 90 days notice. But Provelo doesn't just identify problems — it generates specific negotiation recommendations with suggested lease language she can bring to her attorney. Proactive. Empowering. Actionable.`,
    accent: true,
    riskCard: {
      score: 42,
      flags: [
        'No early termination right',
        'No CAM cap',
        'Landlord relocation clause (90 days)',
        'No exclusive use protection',
      ],
    },
  },
  {
    num: '05',
    icon: BarChart3,
    label: 'Catch Billing Errors',
    heading: "Sarah's been overcharged $4,200 this year.",
    body: `When Sarah receives her annual CAM reconciliation, she uploads it to Provelo. The system checks it against 14 detection rules and finds that her pro-rata share is calculated incorrectly. Billing errors are common in commercial real estate — they're rarely intentional, but they add up. Provelo generates a professional dispute letter she can send to her property manager, complete with the specific discrepancy, the correct calculation, and the relevant lease provision.`,
    accent: false,
  },
  {
    num: '06',
    icon: Calendar,
    label: 'Never Miss a Date',
    heading: "Sarah's renewal deadline is in 6 months. Provelo won't let her forget.",
    body: `Provelo alerts Sarah 210 days before her lease renewal deadline, then again at 90 days and 30 days. It tracks every critical date across all 12 locations — lease expirations, rent escalations, option exercise windows, insurance renewal deadlines, and more. She never misses a deadline again. And because missed deadlines can mean losing a location or paying penalties, that peace of mind is priceless.`,
    accent: true,
  },
  {
    num: '07',
    icon: PieChart,
    label: 'See the Big Picture',
    heading: 'Three leases expire within 8 months of each other.',
    body: `Across all 12 locations, Sarah can compare risk scores, track expirations, and spot trends. She sees that three leases expire within 8 months of each other — giving her leverage to negotiate better terms across all three simultaneously. The portfolio dashboard turns scattered data into strategic intelligence. Instead of managing leases one at a time, Sarah sees the whole picture.`,
    accent: false,
  },
  {
    num: '08',
    icon: GitCompare,
    label: 'Compare Changes',
    heading: "The landlord proposes an amendment. What's really changing?",
    body: `When Sarah's landlord sends over a proposed lease amendment, she uploads it alongside her base lease. Provelo highlights every change — what was modified, what was added, what was removed. It flags whether each change is favorable, unfavorable, or neutral, and explains what Sarah should watch out for. No more reading two 80-page documents side by side. Provelo does the comparison in seconds.`,
    accent: true,
  },
]

/* ─── About Page ────────────────────────────────────────────── */

export default function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col" style={{ scrollBehavior: 'smooth' }}>
      <Navbar />

      {/* ── Hero ──────────────────────────────────────────────── */}
      <section className="relative flex items-center justify-center px-4 sm:px-6 py-24 sm:py-32">
        <div className="absolute inset-0 -z-10"
          style={{ background: 'radial-gradient(ellipse at 50% 40%, rgba(6,78,59,0.18) 0%, transparent 70%)' }} />
        <div className="max-w-3xl mx-auto text-center">
          <p className="anim-hero-1 text-xs font-semibold text-emerald-400/70 uppercase tracking-widest mb-4">
            About Provelo
          </p>
          <h1 className="anim-hero-2 text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-white leading-[1.1]">
            How one tenant went from overwhelmed to in control
          </h1>
          <p className="anim-hero-3 text-lg sm:text-xl text-gray-400 mt-6 leading-relaxed max-w-2xl mx-auto">
            This is the story of Sarah — and every tenant who manages more than they can track with spreadsheets and filing cabinets.
          </p>
        </div>
      </section>

      {/* ── Story Sections ────────────────────────────────────── */}
      {SECTIONS.map((s) => {
        const Icon = s.icon
        return (
          <section
            key={s.num}
            className={`relative py-20 sm:py-28 ${
              s.accent ? 'bg-white/[0.01]' : 'bg-transparent'
            }`}
          >
            <div className="max-w-5xl mx-auto px-4 sm:px-6">
              <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-8 lg:gap-16 items-start">
                {/* Left: chapter marker */}
                <RevealSection className="flex lg:flex-col items-center lg:items-start gap-4 lg:gap-3 lg:pt-2">
                  <span className="text-5xl sm:text-6xl font-extrabold text-white/[0.06] leading-none select-none">
                    {s.num}
                  </span>
                  <div className="flex items-center gap-2.5">
                    <div
                      className="flex items-center justify-center w-10 h-10 rounded-xl"
                      style={{
                        background: 'rgba(16,185,129,0.10)',
                        border: '1px solid rgba(16,185,129,0.18)',
                      }}
                    >
                      <Icon className="h-5 w-5 text-emerald-400" />
                    </div>
                    <span className="text-xs font-semibold text-emerald-400/70 uppercase tracking-widest">
                      {s.label}
                    </span>
                  </div>
                </RevealSection>

                {/* Right: narrative */}
                <RevealSection>
                  <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight leading-snug mb-6">
                    {s.heading}
                  </h2>
                  <p className="text-lg text-gray-300 leading-[1.8] max-w-2xl">
                    {s.body}
                  </p>

                  {/* Optional: Lease Summary Card (Section 02) */}
                  {s.card && (
                    <div className="mt-10 bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6 sm:p-8 max-w-lg">
                      <p className="text-xs font-semibold text-emerald-400/70 uppercase tracking-widest mb-4">
                        {s.card.title}
                      </p>
                      <div className="space-y-3">
                        {s.card.items.map((item) => (
                          <div key={item.label} className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3">
                            <span className="text-sm text-gray-500 shrink-0 sm:w-36">{item.label}</span>
                            <span className="text-sm text-white font-medium">{item.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Optional: Chat mock (Section 03) */}
                  {s.chat && (
                    <div className="mt-10 max-w-lg space-y-4">
                      {/* User message */}
                      <div className="flex justify-end">
                        <div className="bg-emerald-600/20 border border-emerald-500/20 rounded-2xl rounded-br-md px-5 py-3 max-w-sm">
                          <p className="text-sm text-white">{s.chat.question}</p>
                        </div>
                      </div>
                      {/* AI response */}
                      <div className="flex justify-start">
                        <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl rounded-bl-md px-5 py-3 max-w-sm">
                          <p className="text-sm text-gray-200 leading-relaxed">{s.chat.answer}</p>
                          <p className="text-xs text-emerald-400/60 mt-2 flex items-center gap-1.5">
                            <FileText className="h-3 w-3" />
                            {s.chat.cite}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Optional: Risk card (Section 04) */}
                  {s.riskCard && (
                    <div className="mt-10 bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6 sm:p-8 max-w-lg">
                      <div className="flex items-center gap-4 mb-5">
                        <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20">
                          <span className="text-2xl font-bold text-red-400">{s.riskCard.score}</span>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-white">Risk Score</p>
                          <p className="text-xs text-red-400">High Risk — Needs Attention</p>
                        </div>
                      </div>
                      <ul className="space-y-2">
                        {s.riskCard.flags.map((flag) => (
                          <li key={flag} className="flex items-start gap-2.5 text-sm text-gray-300">
                            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                            {flag}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </RevealSection>
              </div>
            </div>
          </section>
        )
      })}

      {/* ── Final CTA ─────────────────────────────────────────── */}
      <section className="py-24 sm:py-32">
        <RevealSection>
          <div className="max-w-3xl mx-auto px-4 sm:px-6">
            <div
              className="relative rounded-3xl px-6 py-16 sm:px-12 sm:py-20 text-center overflow-hidden bg-white/[0.02]"
              style={{
                border: '1px solid rgba(16,185,129,0.15)',
              }}
            >

              <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight mb-4">
                Whether you manage 1 location or 1,000, Provelo gives you the lease intelligence you need to protect your business.
              </h2>

              <p className="text-gray-400 mb-8 text-lg max-w-md mx-auto">
                No credit card required. Your first lease analysis takes under 2 minutes.
              </p>

              <Link
                href="/login?mode=signup"
                className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl px-8 py-4 text-lg font-semibold transition-colors shadow-[0_4px_24px_rgba(16,185,129,0.3)]"
              >
                Start 14-Day Trial <ArrowRight className="h-5 w-5" />
              </Link>
            </div>
          </div>
        </RevealSection>
      </section>

      {/* ── Footer ────────────────────────────────────────────── */}
      <footer className="border-t border-white/[0.06] mt-auto">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            <div>
              <h4 className="text-sm font-semibold text-white mb-4">Product</h4>
              <ul className="space-y-3">
                <li><Link href="/#features" className="text-sm text-gray-400 hover:text-white transition-colors">Features</Link></li>
                <li><span className="text-sm text-gray-500">Pricing <span className="text-xs text-gray-600">(coming soon)</span></span></li>
                <li><Link href="/#for-tenants" className="text-sm text-gray-400 hover:text-white transition-colors">Security</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white mb-4">Company</h4>
              <ul className="space-y-3">
                <li><Link href="/about" className="text-sm text-gray-400 hover:text-white transition-colors">About</Link></li>
                <li><span className="text-sm text-gray-400">Contact</span></li>
                <li><span className="text-sm text-gray-400">Careers</span></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white mb-4">Legal</h4>
              <ul className="space-y-3">
                <li><span className="text-sm text-gray-400">Privacy</span></li>
                <li><span className="text-sm text-gray-400">Terms</span></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white mb-4">Connect</h4>
              <ul className="space-y-3">
                <li><span className="text-sm text-gray-400">Twitter / X</span></li>
                <li><span className="text-sm text-gray-400">LinkedIn</span></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-white/[0.06] pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md flex items-center justify-center"
                style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.20)' }}>
                <span className="text-[9px] font-extrabold text-emerald-400">PV</span>
              </div>
              <span className="text-sm font-bold text-gray-400">Provelo</span>
            </div>
            <p className="text-xs text-gray-500">
              &copy; {new Date().getFullYear()} Provelo. Commercial Lease Intelligence.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
