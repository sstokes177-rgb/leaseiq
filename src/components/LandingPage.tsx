'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  ArrowRight, Menu, X,
  Search, Calendar, Scale,
  MessageSquare, ShieldCheck, BarChart3, Bell,
  Upload, Brain, Sparkles,
  Lock, Shield, EyeOff,
} from 'lucide-react'

/* ─── Nav ─────────────────────────────────────────────────────── */

function Navbar({ isAuthenticated }: { isAuthenticated: boolean }) {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Close mobile menu on resize
  useEffect(() => {
    const onResize = () => { if (window.innerWidth >= 768) setMobileOpen(false) }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const navLinks = [
    { label: 'Features', href: '#features' },
    { label: 'How It Works', href: '#how-it-works' },
    { label: 'About', href: '/about' },
    { label: 'For Tenants', href: '#for-tenants' },
    { label: 'Pricing', href: '/pricing' },
  ]

  return (
    <nav className={`sticky top-0 z-50 transition-all duration-300 ${
      scrolled
        ? 'bg-gray-950/80 backdrop-blur-xl border-b border-white/5'
        : 'bg-transparent border-b border-transparent'
    }`}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Left: Logo */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg"
              style={{ background: 'linear-gradient(135deg,rgba(16,185,129,0.25),rgba(20,184,166,0.15))', border: '1px solid rgba(16,185,129,0.25)' }}>
              <span className="text-[11px] font-extrabold text-emerald-400">PV</span>
            </div>
            <span className="font-bold text-base tracking-tight text-white">Provelo</span>
          </div>
          <span className="hidden sm:block text-xs text-gray-500">Commercial Lease Intelligence</span>
        </div>

        {/* Center: Nav links (desktop) */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((l) => (
            <a key={l.href} href={l.href}
              className="text-sm text-gray-400 hover:text-white transition-colors">
              {l.label}
            </a>
          ))}
        </div>

        {/* Right: Auth buttons (desktop) */}
        <div className="hidden md:flex items-center gap-3">
          {isAuthenticated ? (
            <Link href="/dashboard"
              className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg px-5 py-2.5 text-sm font-semibold transition-colors">
              Dashboard <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          ) : (
            <>
              <Link href="/login"
                className="text-sm text-gray-300 hover:text-white transition-colors px-3 py-2">
                Sign In
              </Link>
              <Link href="/login?mode=signup"
                className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg px-5 py-2.5 text-sm font-semibold transition-colors">
                Start 14-Day Trial
              </Link>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="md:hidden p-2 text-gray-400 hover:text-white transition-colors"
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden bg-gray-950/95 backdrop-blur-xl border-b border-white/5 px-4 pb-6 pt-2">
          <div className="flex flex-col gap-4">
            {navLinks.map((l) => (
              <a key={l.href} href={l.href}
                onClick={() => setMobileOpen(false)}
                className="text-sm text-gray-300 hover:text-white transition-colors py-2">
                {l.label}
              </a>
            ))}
            <div className="border-t border-white/10 pt-4 flex flex-col gap-3">
              {isAuthenticated ? (
                <Link href="/dashboard"
                  className="inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg px-5 py-3 text-sm font-semibold transition-colors">
                  Dashboard <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              ) : (
                <>
                  <Link href="/login"
                    className="text-sm text-gray-300 hover:text-white transition-colors py-2 text-center">
                    Sign In
                  </Link>
                  <Link href="/login?mode=signup"
                    className="inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg px-5 py-3 text-sm font-semibold transition-colors">
                    Start 14-Day Trial
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}

/* ─── Pain Point Card ─────────────────────────────────────────── */

const PAIN_POINTS = [
  {
    icon: <Search className="h-6 w-6" />,
    stat: '40% of CAM reconciliations contain billing errors',
    desc: 'Most tenants never know they\'re overpaying.',
  },
  {
    icon: <Calendar className="h-6 w-6" />,
    stat: 'Critical dates buried in 100-page documents',
    desc: 'Miss a renewal deadline and lose your lease.',
  },
  {
    icon: <Scale className="h-6 w-6" />,
    stat: 'Legal language designed to confuse',
    desc: 'You signed it, but do you understand it?',
  },
]

/* ─── Feature Cards ───────────────────────────────────────────── */

const FEATURES = [
  {
    icon: <MessageSquare className="h-6 w-6" />,
    title: 'Ask Your Lease Anything',
    desc: 'Get plain-English answers about your rights, obligations, and what you can and can\'t do. With article-level citations you can verify.',
  },
  {
    icon: <ShieldCheck className="h-6 w-6" />,
    title: 'Catch CAM Overcharges',
    desc: '14-rule forensic audit finds billing errors that cost tenants thousands. What took CPAs $15,000 takes Provelo 30 seconds.',
  },
  {
    icon: <BarChart3 className="h-6 w-6" />,
    title: 'Score Your Lease Risk',
    desc: '20-clause analysis scores your lease from 0-100 with AI-powered negotiation recommendations and suggested lease language.',
  },
  {
    icon: <Bell className="h-6 w-6" />,
    title: 'Never Miss a Deadline',
    desc: 'Automated alerts for renewals, rent escalations, option windows, and every critical date in your lease.',
  },
]

/* ─── How It Works Steps ──────────────────────────────────────── */

const STEPS = [
  {
    icon: <Upload className="h-6 w-6" />,
    n: 1,
    title: 'Upload your lease PDF',
    desc: 'Drag and drop any commercial lease. We process base leases, amendments, exhibits, and more.',
  },
  {
    icon: <Brain className="h-6 w-6" />,
    n: 2,
    title: 'AI analyzes every clause',
    desc: 'Our AI reads your entire lease, extracts key terms, identifies risks, and builds your intelligence dashboard.',
  },
  {
    icon: <Sparkles className="h-6 w-6" />,
    n: 3,
    title: 'Get instant intelligence',
    desc: 'Ask questions, run audits, compare amendments, and get negotiation recommendations — all in plain English.',
  },
]

/* ─── Main Component ──────────────────────────────────────────── */

export function LandingPage({ isAuthenticated = false }: { isAuthenticated?: boolean }) {
  const ctaHref = isAuthenticated ? '/dashboard' : '/login?mode=signup'
  const ctaText = isAuthenticated ? 'Go to Dashboard' : 'Start 14-Day Trial'

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar isAuthenticated={isAuthenticated} />

      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="relative flex items-center justify-center px-4 sm:px-6"
        style={{ minHeight: 'calc(100vh - 4rem)' }}>
        {/* Background gradient */}
        <div className="absolute inset-0 -z-10"
          style={{ background: 'radial-gradient(ellipse at 50% 40%, rgba(6,78,59,0.20) 0%, transparent 70%)' }} />
        {/* Subtle grid */}
        <div className="absolute inset-0 -z-10 opacity-[0.04]"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
            backgroundSize: '64px 64px',
          }} />

        <div className="max-w-4xl mx-auto text-center py-20 sm:py-28">
          <h1 className="anim-hero-1 text-4xl sm:text-5xl md:text-7xl font-bold tracking-tight text-white max-w-4xl mx-auto leading-[1.08]">
            Know Your Lease.{' '}
            <span className="block sm:inline">Protect Your Business.</span>
          </h1>

          <p className="anim-hero-2 text-lg md:text-xl text-gray-400 max-w-2xl mx-auto text-center mt-6 leading-relaxed">
            AI-powered lease intelligence for commercial tenants. Understand your rights,
            catch billing errors, and never miss a critical date.
          </p>

          <div className="anim-hero-3 flex flex-wrap items-center justify-center gap-4 mt-10">
            <Link href={ctaHref}
              className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl px-8 py-4 text-lg font-semibold transition-colors shadow-[0_4px_24px_rgba(16,185,129,0.3)]">
              {ctaText} <ArrowRight className="h-5 w-5" />
            </Link>
            {!isAuthenticated && (
              <a href="#how-it-works"
                className="inline-flex items-center gap-2 border border-white/10 text-gray-300 hover:text-white hover:border-white/20 rounded-xl px-8 py-4 text-lg font-medium transition-all">
                See How It Works
              </a>
            )}
          </div>

          {!isAuthenticated && (
            <p className="anim-hero-4 text-sm text-gray-500 mt-6">
              14-day free trial. First lease analysis in under 2 minutes.
            </p>
          )}
        </div>
      </section>

      {/* ── Problem Section (Pain Points) ────────────────────── */}
      <section id="for-tenants" className="relative py-24 sm:py-32"
        style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.15) 0%, transparent 100%)' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
              Commercial leases are designed to protect landlords.
            </h2>
            <p className="text-emerald-400 text-lg mt-3 font-medium">
              Provelo levels the playing field.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {PAIN_POINTS.map((p) => (
              <div key={p.stat}
                className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-8 hover:border-emerald-500/20 transition-all duration-300 group">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl mb-5"
                  style={{ background: 'rgba(16,185,129,0.10)', border: '1px solid rgba(16,185,129,0.18)' }}>
                  <span className="text-emerald-400">{p.icon}</span>
                </div>
                <h3 className="font-semibold text-white text-lg leading-snug mb-3">{p.stat}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────── */}
      <section id="features" className="py-24 sm:py-32">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <p className="text-xs font-semibold text-emerald-400/70 uppercase tracking-widest mb-3">Features</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
              Everything you need to understand your lease
            </h2>
            <p className="text-gray-400 mt-3 max-w-xl mx-auto">
              Built specifically for commercial tenants — the people who actually have to live with the terms.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {FEATURES.map((f) => (
              <div key={f.title}
                className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-8 hover:border-emerald-500/20 transition-all duration-300 group">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl mb-5"
                  style={{ background: 'rgba(16,185,129,0.10)', border: '1px solid rgba(16,185,129,0.18)' }}>
                  <span className="text-emerald-400 group-hover:scale-110 transition-transform duration-300">{f.icon}</span>
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">{f.title}</h3>
                <p className="text-gray-400 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ─────────────────────────────────────── */}
      <section id="how-it-works" className="py-24 sm:py-32"
        style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.10) 0%, transparent 100%)' }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <p className="text-xs font-semibold text-emerald-400/70 uppercase tracking-widest mb-3">How it works</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
              Up and running in minutes
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
            {/* Connector lines (desktop only) */}
            <div className="hidden md:block absolute top-14 left-[calc(33.33%+0.5rem)] w-[calc(33.33%-1rem)] h-px"
              style={{ background: 'linear-gradient(90deg, rgba(16,185,129,0.4), rgba(16,185,129,0.15))' }} />
            <div className="hidden md:block absolute top-14 left-[calc(66.66%+0.5rem)] w-[calc(33.33%-1rem)] h-px"
              style={{ background: 'linear-gradient(90deg, rgba(16,185,129,0.4), rgba(16,185,129,0.15))' }} />

            {STEPS.map((s) => (
              <div key={s.n} className="text-center relative">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-5 bg-emerald-600 text-white">
                  <span className="text-lg font-bold">{s.n}</span>
                </div>
                <h3 className="font-semibold text-white text-lg mb-2">{s.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed max-w-xs mx-auto">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Trust / Social Proof ─────────────────────────────── */}
      <section className="py-24 sm:py-32">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <p className="text-gray-300 text-lg font-medium mb-12">
            Built for commercial tenants managing 1 to 1,000+ locations
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10">
            {[
              { icon: <Lock className="h-5 w-5" />, label: 'End-to-end encryption' },
              { icon: <Shield className="h-5 w-5" />, label: 'Enterprise-grade security' },
              { icon: <EyeOff className="h-5 w-5" />, label: 'Your data stays yours' },
            ].map((t) => (
              <div key={t.label}
                className="flex flex-col items-center gap-3 p-6 bg-white/[0.03] border border-white/[0.06] rounded-xl">
                <span className="text-emerald-400">{t.icon}</span>
                <span className="text-sm text-gray-300 font-medium">{t.label}</span>
              </div>
            ))}
          </div>

          <p className="text-sm text-gray-500 max-w-lg mx-auto">
            Provelo never shares your lease data. Documents are encrypted at rest and in transit.
          </p>
        </div>
      </section>

      {/* ── Final CTA ────────────────────────────────────────── */}
      <section className="py-24 sm:py-32">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="relative rounded-3xl px-6 py-16 sm:px-12 sm:py-20 text-center overflow-hidden"
            style={{ background: 'linear-gradient(135deg, rgba(6,78,59,0.25) 0%, rgba(16,185,129,0.08) 100%)', border: '1px solid rgba(16,185,129,0.15)' }}>
            {/* BG glow */}
            <div className="absolute inset-0 -z-10"
              style={{ background: 'radial-gradient(ellipse at 50% 100%, rgba(16,185,129,0.12) 0%, transparent 60%)' }} />

            <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight mb-4">
              Ready to understand your lease?
            </h2>

            <p className="text-gray-400 mb-8 text-lg max-w-md mx-auto">
              Join tenants who&apos;ve uncovered thousands in billing errors and lease risks.
            </p>

            <Link href={ctaHref}
              className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl px-8 py-4 text-lg font-semibold transition-colors shadow-[0_4px_24px_rgba(16,185,129,0.3)]">
              {ctaText} <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────── */}
      <footer className="border-t border-white/[0.06] mt-auto">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            {/* Product */}
            <div>
              <h4 className="text-sm font-semibold text-white mb-4">Product</h4>
              <ul className="space-y-3">
                <li><a href="#features" className="text-sm text-gray-400 hover:text-white transition-colors">Features</a></li>
                <li><Link href="/pricing" className="text-sm text-gray-400 hover:text-white transition-colors">Pricing</Link></li>
                <li><a href="#for-tenants" className="text-sm text-gray-400 hover:text-white transition-colors">Security</a></li>
              </ul>
            </div>

            {/* Company */}
            <div>
              <h4 className="text-sm font-semibold text-white mb-4">Company</h4>
              <ul className="space-y-3">
                <li><Link href="/about" className="text-sm text-gray-400 hover:text-white transition-colors">About</Link></li>
                <li><span className="text-sm text-gray-400">Contact</span></li>
                <li><span className="text-sm text-gray-400">Careers</span></li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="text-sm font-semibold text-white mb-4">Legal</h4>
              <ul className="space-y-3">
                <li><span className="text-sm text-gray-400">Privacy</span></li>
                <li><span className="text-sm text-gray-400">Terms</span></li>
              </ul>
            </div>

            {/* Connect */}
            <div>
              <h4 className="text-sm font-semibold text-white mb-4">Connect</h4>
              <ul className="space-y-3">
                <li><span className="text-sm text-gray-400">Twitter / X</span></li>
                <li><span className="text-sm text-gray-400">LinkedIn</span></li>
              </ul>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="border-t border-white/[0.06] pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md flex items-center justify-center"
                style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.20)' }}>
                <span className="text-[9px] font-extrabold text-emerald-400">PV</span>
              </div>
              <span className="text-sm font-bold text-gray-400">Provelo</span>
            </div>
            <p className="text-xs text-gray-500">
              © {new Date().getFullYear()} Provelo. Commercial Lease Intelligence.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
