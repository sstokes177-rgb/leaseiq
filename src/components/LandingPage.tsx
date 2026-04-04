'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import {
  ArrowRight, Menu, X, ChevronDown,
  MessageSquare, ShieldCheck, BarChart3, Calendar,
  Upload, Brain, Zap,
  Lock, Shield, KeyRound,
  GitCompareArrows, PieChart,
} from 'lucide-react'

/* ═══════════════════════════════════════════════════════════════
   Scroll Animation Hook
   ═══════════════════════════════════════════════════════════════ */

function useScrollAnimate() {
  const initialized = useRef(false)

  useEffect(() => {
    if (initialized.current) return
    initialized.current = true

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('animate-in')
          }
        })
      },
      { threshold: 0.1 }
    )

    document.querySelectorAll('.scroll-animate').forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])
}

/* ═══════════════════════════════════════════════════════════════
   Navbar
   ═══════════════════════════════════════════════════════════════ */

function Navbar({ isAuthenticated }: { isAuthenticated: boolean }) {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 768) setMobileOpen(false)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const navLinks = [
    { label: 'Features', href: '#features' },
    { label: 'About', href: '/about' },
    { label: 'Pricing', href: '/pricing' },
  ]

  return (
    <nav
      className={`sticky top-0 z-50 transition-all duration-500 ${
        scrolled
          ? 'bg-gray-950/80 backdrop-blur-xl border-b border-white/[0.04]'
          : 'bg-transparent border-b border-transparent'
      }`}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div
            className="flex items-center justify-center w-8 h-8 rounded-lg"
            style={{
              background: 'linear-gradient(135deg,rgba(16,185,129,0.25),rgba(20,184,166,0.15))',
              border: '1px solid rgba(16,185,129,0.25)',
            }}
          >
            <span className="text-[11px] font-extrabold text-emerald-400">PV</span>
          </div>
          <span className="font-semibold text-lg tracking-tight text-white">Provelo</span>
        </Link>

        {/* Center nav links */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              {l.label}
            </a>
          ))}
        </div>

        {/* Right auth */}
        <div className="hidden md:flex items-center gap-3">
          {isAuthenticated ? (
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors"
            >
              Dashboard <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="text-sm text-gray-400 hover:text-white transition-colors px-3 py-2"
              >
                Sign in
              </Link>
              <Link
                href="/login?mode=signup"
                className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors"
              >
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
        <div className="md:hidden bg-gray-950/95 backdrop-blur-xl border-b border-white/[0.04] px-4 pb-6 pt-2">
          <div className="flex flex-col gap-4">
            {navLinks.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setMobileOpen(false)}
                className="text-sm text-gray-300 hover:text-white transition-colors py-2"
              >
                {l.label}
              </a>
            ))}
            <div className="border-t border-white/10 pt-4 flex flex-col gap-3">
              {isAuthenticated ? (
                <Link
                  href="/dashboard"
                  className="inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg px-5 py-3 text-sm font-medium transition-colors"
                >
                  Dashboard <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="text-sm text-gray-300 hover:text-white transition-colors py-2 text-center"
                  >
                    Sign in
                  </Link>
                  <Link
                    href="/login?mode=signup"
                    className="inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg px-5 py-3 text-sm font-medium transition-colors"
                  >
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

/* ═══════════════════════════════════════════════════════════════
   Mock UI: Chat Exchange (for AI Chat feature card)
   ═══════════════════════════════════════════════════════════════ */

function MockChat() {
  return (
    <div className="px-5 pb-5 space-y-3">
      {/* User bubble */}
      <div className="flex justify-end">
        <div className="bg-emerald-600/20 border border-emerald-500/20 rounded-2xl rounded-br-md px-4 py-2.5 max-w-[85%]">
          <p className="text-sm text-emerald-200">Can my landlord pass through capital expenditures as CAM?</p>
        </div>
      </div>
      {/* AI bubble */}
      <div className="flex justify-start">
        <div className="bg-white/[0.04] border border-white/[0.06] rounded-2xl rounded-bl-md px-4 py-2.5 max-w-[85%]">
          <p className="text-sm text-gray-300 leading-relaxed">
            No. Per <span className="text-emerald-400 font-medium">Article 7.2(c)</span>, capital improvements are explicitly excluded from operating expense pass-throughs. Only routine maintenance qualifies.
          </p>
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   Mock UI: Risk Gauge (for Risk Scoring card)
   ═══════════════════════════════════════════════════════════════ */

function MockRiskGauge() {
  return (
    <div className="px-5 pb-5">
      <div className="flex items-end gap-4">
        {/* Score */}
        <div className="flex flex-col items-center">
          <span className="text-4xl font-bold text-white tabular-nums">73</span>
          <span className="text-xs text-gray-500 mt-1">/ 100</span>
        </div>
        {/* Clause dots */}
        <div className="flex-1 space-y-2">
          {[
            { label: 'Exclusions', color: 'bg-emerald-500', w: 'w-[82%]' },
            { label: 'CAM cap', color: 'bg-amber-500', w: 'w-[54%]' },
            { label: 'Assignment', color: 'bg-red-500', w: 'w-[28%]' },
          ].map((c) => (
            <div key={c.label} className="flex items-center gap-2">
              <span className="text-[10px] text-gray-500 w-16 text-right">{c.label}</span>
              <div className="flex-1 h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
                <div className={`h-full ${c.color} rounded-full ${c.w}`} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   Mock UI: CAM Finding (for CAM Audit card)
   ═══════════════════════════════════════════════════════════════ */

function MockCAMFinding() {
  return (
    <div className="px-5 pb-5">
      <div className="bg-red-500/[0.06] border border-red-500/[0.12] rounded-xl p-3.5">
        <div className="flex items-start gap-3">
          <div className="w-2 h-2 rounded-full bg-red-400 mt-1.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-white">Pro-rata share error</p>
            <p className="text-xs text-gray-400 mt-0.5">$4,200 overcharge detected in 2025 reconciliation</p>
          </div>
        </div>
      </div>
      <div className="bg-amber-500/[0.06] border border-amber-500/[0.12] rounded-xl p-3.5 mt-2">
        <div className="flex items-start gap-3">
          <div className="w-2 h-2 rounded-full bg-amber-400 mt-1.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-white">Capital expense misclassified</p>
            <p className="text-xs text-gray-400 mt-0.5">Roof repair ($8,100) billed as maintenance</p>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   Mock UI: Calendar (for Critical Dates card)
   ═══════════════════════════════════════════════════════════════ */

function MockCalendar() {
  return (
    <div className="px-5 pb-5">
      <div className="space-y-2">
        {[
          { date: 'Mar 15', label: 'Renewal option window', color: 'bg-emerald-400' },
          { date: 'Jun 01', label: 'Rent escalation', color: 'bg-amber-400' },
          { date: 'Sep 30', label: 'CAM reconciliation due', color: 'bg-sky-400' },
        ].map((d) => (
          <div key={d.label} className="flex items-center gap-3">
            <div className={`w-1.5 h-1.5 rounded-full ${d.color} shrink-0`} />
            <span className="text-xs text-gray-500 w-12 font-mono">{d.date}</span>
            <span className="text-xs text-gray-300">{d.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   Mock UI: Diff (for Lease Comparison card)
   ═══════════════════════════════════════════════════════════════ */

function MockDiff() {
  return (
    <div className="px-5 pb-5 font-mono text-[11px] leading-relaxed">
      <div className="text-red-400/70 line-through">- Base rent: $42.50/sf NNN</div>
      <div className="text-emerald-400/90 mt-1">+ Base rent: $45.00/sf NNN</div>
      <div className="text-gray-600 mt-1">&nbsp;&nbsp;Lease term: 60 months</div>
      <div className="text-red-400/70 line-through mt-1">- CAM cap: none</div>
      <div className="text-emerald-400/90 mt-1">+ CAM cap: 5% annual</div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   Mock UI: Bar chart (for Portfolio Analytics card)
   ═══════════════════════════════════════════════════════════════ */

function MockBarChart() {
  return (
    <div className="px-5 pb-5">
      <div className="flex items-end gap-2 h-16">
        {[40, 65, 52, 78, 45, 90, 68].map((h, i) => (
          <div
            key={i}
            className="flex-1 rounded-sm bg-emerald-500/30"
            style={{ height: `${h}%` }}
          />
        ))}
      </div>
      <div className="flex justify-between mt-2">
        <span className="text-[10px] text-gray-600">Q1</span>
        <span className="text-[10px] text-gray-600">Q4</span>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   Feature Card
   ═══════════════════════════════════════════════════════════════ */

function FeatureCard({
  icon,
  title,
  desc,
  children,
  className = '',
  delay = 0,
}: {
  icon: React.ReactNode
  title: string
  desc: string
  children?: React.ReactNode
  className?: string
  delay?: number
}) {
  return (
    <div
      className={`scroll-animate bg-white/[0.02] border border-white/[0.06] rounded-2xl overflow-hidden hover:border-white/[0.1] transition-all duration-300 hover:-translate-y-0.5 group ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <div className="p-6">
        <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-500/[0.08] border border-emerald-500/[0.15] mb-4">
          <span className="text-emerald-400">{icon}</span>
        </div>
        <h3 className="text-lg font-semibold text-white mb-1.5">{title}</h3>
        <p className="text-sm text-gray-400 leading-relaxed">{desc}</p>
      </div>
      {children}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   Main Landing Page
   ═══════════════════════════════════════════════════════════════ */

export function LandingPage({ isAuthenticated = false }: { isAuthenticated?: boolean }) {
  const ctaHref = isAuthenticated ? '/dashboard' : '/login?mode=signup'
  const ctaText = isAuthenticated ? 'Go to Dashboard' : 'Start 14-Day Trial'

  useScrollAnimate()

  // Smooth scroll for anchor links
  const handleAnchorClick = useCallback((e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (href.startsWith('#')) {
      e.preventDefault()
      const el = document.querySelector(href)
      if (el) el.scrollIntoView({ behavior: 'smooth' })
    }
  }, [])

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar isAuthenticated={isAuthenticated} />

      {/* ══ Hero ══════════════════════════════════════════════ */}
      <section
        className="relative flex items-center justify-center px-4 sm:px-6"
        style={{ minHeight: 'calc(100vh - 4rem)' }}
      >
        {/* Background radial glow */}
        <div
          className="absolute inset-0 -z-10"
          style={{
            background:
              'radial-gradient(ellipse 80% 50% at 50% 40%, rgba(6,78,59,0.18) 0%, transparent 70%)',
          }}
        />
        {/* Subtle dot grid */}
        <div
          className="absolute inset-0 -z-10 opacity-[0.03]"
          style={{
            backgroundImage:
              'radial-gradient(circle, rgba(255,255,255,0.5) 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        />

        <div className="max-w-4xl mx-auto text-center py-20 sm:py-28">
          {/* Pill badge */}
          <div className="anim-hero-1 inline-flex items-center bg-white/[0.05] border border-white/[0.08] rounded-full px-4 py-1.5 mb-8">
            <span className="text-xs text-emerald-400 tracking-wider uppercase font-medium">
              Commercial Lease Intelligence
            </span>
          </div>

          {/* Headline */}
          <h1 className="anim-hero-2">
            <span className="block text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-bold tracking-tighter text-white leading-[1.05]">
              Understand your lease.
            </span>
            <span className="block text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-bold tracking-tighter text-gray-400 leading-[1.05] mt-1">
              Protect your business.
            </span>
          </h1>

          {/* Subheadline */}
          <p className="anim-hero-3 text-base sm:text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mt-8 leading-relaxed">
            AI-powered lease intelligence that reads your entire lease, scores your risk across 20 clauses, and catches billing errors — in minutes, not months.
          </p>

          {/* CTAs */}
          <div className="anim-hero-4 flex flex-wrap items-center justify-center gap-4 mt-10">
            <Link
              href={ctaHref}
              className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl px-8 py-3.5 text-base font-medium transition-colors shadow-[0_4px_24px_rgba(16,185,129,0.25)]"
            >
              {ctaText} <ArrowRight className="h-4 w-4" />
            </Link>
            {!isAuthenticated && (
              <a
                href="#how-it-works"
                onClick={(e) => handleAnchorClick(e, '#how-it-works')}
                className="inline-flex items-center gap-1.5 text-gray-400 hover:text-white px-6 py-3.5 text-base transition-colors"
              >
                See how it works
                <ChevronDown className="h-4 w-4 animate-gentle-bounce" />
              </a>
            )}
          </div>

          {/* Sub-CTA note */}
          {!isAuthenticated && (
            <p className="anim-hero-5 text-sm text-gray-600 mt-6">
              No credit card for 14 days. Cancel anytime.
            </p>
          )}
        </div>
      </section>

      {/* ══ Social Proof Bar ═════════════════════════════════ */}
      <section className="py-16 sm:py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <p className="scroll-animate text-sm text-gray-500 text-center mb-8">
            Trusted by commercial tenants managing retail, office, and industrial spaces
          </p>
          <div className="scroll-animate flex flex-wrap items-center justify-center gap-8 sm:gap-12" style={{ transitionDelay: '100ms' }}>
            {[
              { icon: <Lock className="h-4 w-4" />, label: 'Enterprise-grade security' },
              { icon: <Shield className="h-4 w-4" />, label: 'SOC 2 architecture' },
              { icon: <KeyRound className="h-4 w-4" />, label: '256-bit encryption' },
            ].map((t) => (
              <div key={t.label} className="flex items-center gap-2">
                <span className="text-gray-600">{t.icon}</span>
                <span className="text-xs text-gray-500">{t.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ Features — Bento Grid ════════════════════════════ */}
      <section id="features" className="py-24 sm:py-32">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          {/* Section heading */}
          <div className="scroll-animate mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
              Everything you need.
            </h2>
            <p className="text-lg text-gray-400 mt-3 max-w-lg">
              One platform for lease intelligence, risk analysis, and cost recovery.
            </p>
          </div>

          {/* Bento grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Large card — AI Chat (spans 2 cols on lg) */}
            <FeatureCard
              icon={<MessageSquare className="h-5 w-5" />}
              title="Ask your lease anything"
              desc="Get plain-English answers with article-level citations you can verify."
              className="lg:col-span-2"
              delay={0}
            >
              <MockChat />
            </FeatureCard>

            {/* Risk Scoring */}
            <FeatureCard
              icon={<ShieldCheck className="h-5 w-5" />}
              title="Score every clause"
              desc="20-clause analysis from 0-100 with negotiation recommendations."
              delay={80}
            >
              <MockRiskGauge />
            </FeatureCard>

            {/* CAM Audit */}
            <FeatureCard
              icon={<BarChart3 className="h-5 w-5" />}
              title="Catch billing errors"
              desc="14-rule forensic audit finds overcharges that cost tenants thousands."
              delay={160}
            >
              <MockCAMFinding />
            </FeatureCard>

            {/* Critical Dates */}
            <FeatureCard
              icon={<Calendar className="h-5 w-5" />}
              title="Never miss a deadline"
              desc="Automated alerts for renewals, escalations, and option windows."
              delay={240}
            >
              <MockCalendar />
            </FeatureCard>

            {/* Lease Comparison */}
            <FeatureCard
              icon={<GitCompareArrows className="h-5 w-5" />}
              title="Track every change"
              desc="Side-by-side amendment comparison with highlighted differences."
              delay={320}
            >
              <MockDiff />
            </FeatureCard>

            {/* Portfolio Analytics (spans 2 cols on md, 1 on lg) */}
            <FeatureCard
              icon={<PieChart className="h-5 w-5" />}
              title="See the big picture"
              desc="Portfolio-level analytics across all your lease obligations."
              className="md:col-span-2 lg:col-span-1"
              delay={400}
            >
              <MockBarChart />
            </FeatureCard>
          </div>
        </div>
      </section>

      {/* ══ How It Works ═════════════════════════════════════ */}
      <section id="how-it-works" className="py-24 sm:py-32">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="scroll-animate text-center mb-20">
            <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
              Up and running in minutes
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-8 relative">
            {/* Connector lines (desktop) */}
            <div
              className="hidden md:block absolute top-8 left-[calc(33.33%)] w-[calc(33.33%)] h-px border-t border-dashed border-white/[0.06]"
            />
            <div
              className="hidden md:block absolute top-8 left-[calc(66.66%)] w-[calc(33.33%-2rem)] h-px border-t border-dashed border-white/[0.06]"
            />

            {[
              {
                n: '01',
                icon: <Upload className="h-5 w-5" />,
                title: 'Upload',
                subtitle: 'Drop your lease PDF',
                desc: 'Drag and drop any commercial lease. We process base leases, amendments, exhibits, and addenda.',
              },
              {
                n: '02',
                icon: <Brain className="h-5 w-5" />,
                title: 'Analyze',
                subtitle: 'AI reads every clause',
                desc: 'Our AI reads your entire document, extracts key terms, identifies risks, and maps every obligation.',
              },
              {
                n: '03',
                icon: <Zap className="h-5 w-5" />,
                title: 'Act',
                subtitle: 'Get intelligence and recommendations',
                desc: 'Ask questions, run audits, compare amendments, and get negotiation strategies — all in plain English.',
              },
            ].map((step, i) => (
              <div
                key={step.n}
                className="scroll-animate text-center relative"
                style={{ transitionDelay: `${i * 120}ms` }}
              >
                {/* Watermark number */}
                <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-7xl md:text-8xl font-bold text-white/[0.03] select-none pointer-events-none">
                  {step.n}
                </span>

                {/* Icon circle */}
                <div className="relative inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-500/[0.08] border border-emerald-500/[0.15] mb-5">
                  <span className="text-emerald-400">{step.icon}</span>
                </div>

                <h3 className="font-semibold text-white text-lg mb-1">{step.title}</h3>
                <p className="text-sm text-emerald-400/70 mb-3">{step.subtitle}</p>
                <p className="text-sm text-gray-400 leading-relaxed max-w-xs mx-auto">
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ Final CTA ════════════════════════════════════════ */}
      <section className="py-24 sm:py-32">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="scroll-animate relative text-center py-20 sm:py-24">
            {/* Subtle emerald glow */}
            <div
              className="absolute inset-0 -z-10 rounded-3xl"
              style={{
                background:
                  'radial-gradient(ellipse 60% 50% at 50% 60%, rgba(16,185,129,0.06) 0%, transparent 70%)',
              }}
            />

            <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight mb-4">
              Ready to understand your lease?
            </h2>
            <p className="text-lg text-gray-400 mb-10 max-w-md mx-auto">
              Join commercial tenants who save thousands by knowing their rights.
            </p>

            <Link
              href={ctaHref}
              className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl px-8 py-4 text-lg font-medium transition-colors shadow-[0_4px_24px_rgba(16,185,129,0.25)]"
            >
              {ctaText} <ArrowRight className="h-5 w-5" />
            </Link>

            {!isAuthenticated && (
              <p className="text-sm text-gray-600 mt-6">
                14-day free trial. No commitment. Cancel anytime.
              </p>
            )}
          </div>
        </div>
      </section>

      {/* ══ Footer ═══════════════════════════════════════════ */}
      <footer className="border-t border-white/[0.04] mt-auto">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            <div>
              <h4 className="text-sm font-semibold text-white mb-4">Product</h4>
              <ul className="space-y-3">
                <li>
                  <a href="#features" className="text-sm text-gray-500 hover:text-gray-300 transition-colors">
                    Features
                  </a>
                </li>
                <li>
                  <Link href="/pricing" className="text-sm text-gray-500 hover:text-gray-300 transition-colors">
                    Pricing
                  </Link>
                </li>
                <li>
                  <span className="text-sm text-gray-500">Security</span>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-white mb-4">Company</h4>
              <ul className="space-y-3">
                <li>
                  <Link href="/about" className="text-sm text-gray-500 hover:text-gray-300 transition-colors">
                    About
                  </Link>
                </li>
                <li>
                  <span className="text-sm text-gray-500">Contact</span>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-white mb-4">Legal</h4>
              <ul className="space-y-3">
                <li>
                  <span className="text-sm text-gray-500">Privacy</span>
                </li>
                <li>
                  <span className="text-sm text-gray-500">Terms</span>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-white mb-4">Connect</h4>
              <ul className="space-y-3">
                <li>
                  <span className="text-sm text-gray-500">Twitter / X</span>
                </li>
                <li>
                  <span className="text-sm text-gray-500">LinkedIn</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="border-t border-white/[0.04] pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div
                className="w-6 h-6 rounded-md flex items-center justify-center"
                style={{
                  background: 'rgba(16,185,129,0.15)',
                  border: '1px solid rgba(16,185,129,0.20)',
                }}
              >
                <span className="text-[9px] font-extrabold text-emerald-400">PV</span>
              </div>
              <span className="text-sm font-semibold text-gray-500">Provelo</span>
            </div>
            <p className="text-xs text-gray-600">
              &copy; {new Date().getFullYear()} Provelo. Commercial Lease Intelligence.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
