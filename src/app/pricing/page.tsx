'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  ArrowRight, Menu, X, Check, Plus, Minus,
} from 'lucide-react'

// TODO: Update pricing before launch
const PLANS = {
  starter: { monthly: 99, annual: 79 },
  growth: { monthly: 189, annual: 149 },
} as const

/* ─── Navbar (matches About page) ─────────────────────────────── */

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
    { label: 'Pricing', href: '/pricing' },
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

/* ─── FAQ Accordion Item ──────────────────────────────────────── */

function FaqItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="border-b border-white/[0.06]">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-5 text-left group"
      >
        <span className="text-base font-medium text-white group-hover:text-emerald-400 transition-colors pr-4">
          {question}
        </span>
        <span className="shrink-0 text-gray-500">
          {open
            ? <Minus className="h-4 w-4" />
            : <Plus className="h-4 w-4" />}
        </span>
      </button>
      <div
        className="overflow-hidden transition-all duration-300 ease-out"
        style={{ maxHeight: open ? '200px' : '0px', opacity: open ? 1 : 0 }}
      >
        <p className="text-sm text-gray-400 leading-relaxed pb-5">
          {answer}
        </p>
      </div>
    </div>
  )
}

/* ─── Feature Check Item ──────────────────────────────────────── */

function Feature({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <Check className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
      <span className="text-sm text-gray-300">{children}</span>
    </li>
  )
}

/* ─── Pricing Page ────────────────────────────────────────────── */

const FAQ_DATA = [
  {
    q: 'What happens after my 14-day trial?',
    a: 'Your subscription begins automatically. You can cancel anytime during the trial and won\u2019t be charged.',
  },
  {
    q: 'Can I switch plans later?',
    a: 'Yes, you can upgrade or downgrade at any time. Changes take effect on your next billing cycle.',
  },
  {
    q: 'What payment methods do you accept?',
    a: 'We accept all major credit cards. Enterprise plans can pay by invoice.',
  },
  {
    q: 'Is my data secure?',
    a: 'Yes. All documents are encrypted at rest and in transit. We never share your data with third parties.',
  },
  {
    q: 'Do you offer refunds?',
    a: 'If you\u2019re not satisfied within the first 30 days of your paid subscription, we\u2019ll issue a full refund.',
  },
  {
    q: 'Can I import my existing leases?',
    a: 'Absolutely. Upload any PDF lease document and our AI will extract and analyze it in under 2 minutes.',
  },
]

export default function PricingPage() {
  const [annual, setAnnual] = useState(true)

  const starterPrice = annual ? PLANS.starter.annual : PLANS.starter.monthly
  const growthPrice = annual ? PLANS.growth.annual : PLANS.growth.monthly
  const starterStrikethrough = annual ? PLANS.starter.monthly : null
  const growthStrikethrough = annual ? PLANS.growth.monthly : null

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      {/* ── Header ──────────────────────────────────────────── */}
      <section className="relative pt-20 sm:pt-28 pb-12 sm:pb-16 px-4 sm:px-6">
        <div className="absolute inset-0 -z-10"
          style={{ background: 'radial-gradient(ellipse at 50% 30%, rgba(6,78,59,0.18) 0%, transparent 70%)' }} />

        <div className="max-w-4xl mx-auto text-center">
          <h1 className="anim-hero-1 text-4xl font-bold text-white">
            Simple, transparent pricing
          </h1>
          <p className="anim-hero-2 text-lg text-gray-400 mt-4">
            Start your 14-day free trial. No commitment, cancel anytime.
          </p>
          <p className="anim-hero-3 text-sm text-gray-500 mt-2">
            Credit card required to start trial
          </p>

          {/* ── Billing Toggle ───────────────────────────────── */}
          <div className="anim-hero-3 flex items-center justify-center gap-3 mt-10">
            <span className={`text-sm font-medium transition-colors ${!annual ? 'text-white' : 'text-gray-500'}`}>
              Monthly
            </span>
            <button
              onClick={() => setAnnual(!annual)}
              className="relative w-14 h-8 rounded-full bg-white/[0.06] transition-colors"
              aria-label="Toggle billing period"
            >
              <span
                className={`absolute top-1 w-6 h-6 rounded-full bg-emerald-600 transition-all duration-200 ${
                  annual ? 'left-7' : 'left-1'
                }`}
              />
            </button>
            <span className={`text-sm font-medium transition-colors ${annual ? 'text-white' : 'text-gray-500'}`}>
              Annual
            </span>
            {annual && (
              <span className="text-xs font-semibold text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 rounded-full px-2.5 py-0.5">
                Save 20%
              </span>
            )}
          </div>
        </div>
      </section>

      {/* ── Pricing Tiers ───────────────────────────────────── */}
      <section className="px-4 sm:px-6 pb-24 sm:pb-32">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

          {/* ── STARTER ─────────────────────────────────────── */}
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-8 flex flex-col">
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-white">Starter</h3>
              <p className="text-sm text-gray-400 mt-1">For individual tenants</p>
              <p className="text-xs text-gray-500 mt-0.5">1–3 locations</p>
            </div>

            <div className="mb-8">
              <div className="flex items-baseline gap-1">
                <span className="text-5xl font-bold text-white">${starterPrice}</span>
                <span className="text-lg text-gray-400">/mo</span>
              </div>
              {starterStrikethrough && (
                <p className="text-sm text-gray-500 mt-1">
                  <span className="line-through">${starterStrikethrough}/mo</span>
                  <span className="ml-2">billed annually</span>
                </p>
              )}
            </div>

            <Link href="/login?mode=signup"
              className="inline-flex items-center justify-center gap-2 border border-white/[0.12] text-white hover:bg-white/[0.06] rounded-xl px-6 py-3 text-sm font-semibold transition-all mb-8">
              Start 14-Day Trial
            </Link>

            <ul className="space-y-3.5 flex-1">
              <Feature>AI lease chat with article citations</Feature>
              <Feature>Lease summary extraction</Feature>
              <Feature>Risk score with 20-clause analysis</Feature>
              <Feature>Obligation matrix</Feature>
              <Feature>Critical date alerts</Feature>
              <Feature>CAM charge analysis</Feature>
              <Feature>Document storage (up to 50 documents)</Feature>
              <Feature>Email support</Feature>
            </ul>
          </div>

          {/* ── GROWTH (Most Popular) ───────────────────────── */}
          <div className="relative bg-emerald-500/[0.03] border border-emerald-500/40 rounded-2xl p-8 flex flex-col lg:-mt-4 lg:mb-[-1rem] shadow-[0_0_60px_-12px_rgba(16,185,129,0.15)]">
            {/* Most Popular badge */}
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
              <span className="text-xs font-semibold text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 rounded-full px-4 py-1.5">
                Most Popular
              </span>
            </div>

            <div className="mb-6 mt-2">
              <h3 className="text-lg font-semibold text-white">Growth</h3>
              <p className="text-sm text-gray-400 mt-1">For growing businesses</p>
              <p className="text-xs text-gray-500 mt-0.5">4–15 locations</p>
            </div>

            <div className="mb-8">
              <div className="flex items-baseline gap-1">
                <span className="text-5xl font-bold text-white">${growthPrice}</span>
                <span className="text-lg text-gray-400">/mo</span>
              </div>
              {growthStrikethrough && (
                <p className="text-sm text-gray-500 mt-1">
                  <span className="line-through">${growthStrikethrough}/mo</span>
                  <span className="ml-2">billed annually</span>
                </p>
              )}
            </div>

            <Link href="/login?mode=signup"
              className="inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl px-6 py-3.5 text-sm font-semibold transition-colors shadow-[0_4px_24px_rgba(16,185,129,0.25)] mb-8">
              Start 14-Day Trial <ArrowRight className="h-4 w-4" />
            </Link>

            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-4">
              Everything in Starter, plus:
            </p>
            <ul className="space-y-3.5 flex-1">
              <Feature>Portfolio analytics dashboard</Feature>
              <Feature>Cross-location AI chat</Feature>
              <Feature>CAM forensic audit (14 detection rules)</Feature>
              <Feature>Lease comparison (amendment analysis)</Feature>
              <Feature>Negotiation recommendations with suggested language</Feature>
              <Feature>CAM dispute letter generation</Feature>
              <Feature>Team collaboration (up to 5 members)</Feature>
              <Feature>Priority support</Feature>
              <Feature>Export to PDF/CSV</Feature>
            </ul>
          </div>

          {/* ── SCALE ───────────────────────────────────────── */}
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-8 flex flex-col">
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-white">Scale</h3>
              <p className="text-sm text-gray-400 mt-1">For multi-location operators</p>
              <p className="text-xs text-gray-500 mt-0.5">16+ locations</p>
            </div>

            <div className="mb-8">
              <div className="flex items-baseline gap-1">
                <span className="text-5xl font-bold text-white">Custom</span>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Tailored to your portfolio
              </p>
            </div>

            <a href="mailto:sales@provelo.io"
              className="inline-flex items-center justify-center gap-2 border border-white/[0.12] text-white hover:bg-white/[0.06] rounded-xl px-6 py-3 text-sm font-semibold transition-all mb-8">
              Contact Sales
            </a>

            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-4">
              Everything in Growth, plus:
            </p>
            <ul className="space-y-3.5 flex-1">
              <Feature>Unlimited locations</Feature>
              <Feature>Unlimited team members</Feature>
              <Feature>Dedicated onboarding</Feature>
              <Feature>Custom integrations</Feature>
              <Feature>SLA guarantee</Feature>
              <Feature>Dedicated account manager</Feature>
              <Feature>API access (coming soon)</Feature>
            </ul>
          </div>
        </div>
      </section>

      {/* ── FAQ ─────────────────────────────────────────────── */}
      <section className="px-4 sm:px-6 pb-24 sm:pb-32">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl font-bold text-white text-center mb-12">
            Frequently asked questions
          </h2>
          <div className="border-t border-white/[0.06]">
            {FAQ_DATA.map((faq) => (
              <FaqItem key={faq.q} question={faq.q} answer={faq.a} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ───────────────────────────────────────── */}
      <section className="px-4 sm:px-6 pb-24 sm:pb-32">
        <div className="max-w-3xl mx-auto">
          <div className="relative rounded-3xl px-6 py-16 sm:px-12 sm:py-20 text-center overflow-hidden"
            style={{ background: 'linear-gradient(135deg, rgba(6,78,59,0.25) 0%, rgba(16,185,129,0.08) 100%)', border: '1px solid rgba(16,185,129,0.15)' }}>
            <div className="absolute inset-0 -z-10"
              style={{ background: 'radial-gradient(ellipse at 50% 100%, rgba(16,185,129,0.12) 0%, transparent 60%)' }} />

            <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight mb-3">
              Ready to understand your lease?
            </h2>
            <p className="text-gray-400 text-lg mb-8">
              Start your 14-day trial today
            </p>

            <Link href="/login?mode=signup"
              className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl px-8 py-4 text-lg font-semibold transition-colors shadow-[0_4px_24px_rgba(16,185,129,0.3)]">
              Start 14-Day Trial <ArrowRight className="h-5 w-5" />
            </Link>

            <p className="text-sm text-gray-500 mt-5">
              No commitment. Cancel anytime.
            </p>
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────── */}
      <footer className="border-t border-white/[0.06] mt-auto">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            <div>
              <h4 className="text-sm font-semibold text-white mb-4">Product</h4>
              <ul className="space-y-3">
                <li><Link href="/#features" className="text-sm text-gray-400 hover:text-white transition-colors">Features</Link></li>
                <li><Link href="/pricing" className="text-sm text-gray-400 hover:text-white transition-colors">Pricing</Link></li>
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
