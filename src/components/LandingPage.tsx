'use client'

import Link from 'next/link'
import {
  FileSearch, MessageSquare, FileStack, Scale, Calendar,
  BookOpen, Upload, ArrowRight, CheckCircle, Zap, Building2,
  ChevronRight, Sparkles,
} from 'lucide-react'

/* ─── Data ───────────────────────────────────────────────────── */

const FEATURES = [
  {
    icon: <MessageSquare className="h-5 w-5" />,
    title: 'AI-Powered Lease Q&A',
    desc: 'Ask anything in plain language. Get answers grounded word-for-word in your actual lease — not generic legal summaries.',
    anim: 'anim-feat-1',
  },
  {
    icon: <FileStack className="h-5 w-5" />,
    title: 'Understands Amendments',
    desc: 'Upload your base lease, amendments, and commencement letters. The AI reads them together, and amendments always override.',
    anim: 'anim-feat-2',
  },
  {
    icon: <Scale className="h-5 w-5" />,
    title: 'Instant Obligation Clarity',
    desc: 'Instantly see what\'s your responsibility vs. the landlord\'s — HVAC, repairs, CAM, insurance, and more.',
    anim: 'anim-feat-3',
  },
  {
    icon: <Calendar className="h-5 w-5" />,
    title: 'Critical Date Tracking',
    desc: 'Never miss a renewal deadline, rent escalation date, notice period, or option exercise window.',
    anim: 'anim-feat-4',
  },
  {
    icon: <Zap className="h-5 w-5" />,
    title: 'Plain Language, Not Legal Jargon',
    desc: 'Complex lease terms explained simply. Know what "triple net," "CAM reconciliation," and "holdover provisions" actually mean for you.',
    anim: 'anim-feat-5',
  },
  {
    icon: <BookOpen className="h-5 w-5" />,
    title: 'Exact Citations Every Time',
    desc: 'Every answer references the specific Article, Section, and page number from your lease. No guessing, no hallucinations.',
    anim: 'anim-feat-6',
  },
]

const QUESTIONS = [
  'Who is responsible for HVAC repairs?',
  'Can I sublease part of my space?',
  'What are my options for early termination?',
  'When is my next rent increase and by how much?',
  'Am I allowed to put tables outside?',
  "What happens if I'm late on rent?",
  'Do I have a right of first refusal on adjacent space?',
  'What does my personal guarantee cover?',
  'Can the landlord enter my space without notice?',
  'What\'s included in my CAM charges?',
]

const STEPS = [
  {
    icon: <Upload className="h-6 w-6" />,
    n: '1',
    title: 'Upload your lease',
    desc: 'Drop in your PDF — base lease, amendments, exhibits. Any format, any length.',
  },
  {
    icon: <MessageSquare className="h-6 w-6" />,
    n: '2',
    title: 'Ask any question',
    desc: 'Type your question in plain English. No legal training needed.',
  },
  {
    icon: <CheckCircle className="h-6 w-6" />,
    n: '3',
    title: 'Get cited answers',
    desc: 'Receive clear answers with exact Article, Section, and page citations from your document.',
  },
]

/* ─── Sub-components ─────────────────────────────────────────── */

function GlowButton({ href, children, variant = 'primary' }: { href: string; children: React.ReactNode; variant?: 'primary' | 'ghost' }) {
  const base = 'inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all duration-200'
  const styles = variant === 'primary'
    ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-[0_2px_16px_rgba(16,185,129,0.35)] hover:from-emerald-400 hover:to-teal-400 hover:shadow-[0_4px_24px_rgba(16,185,129,0.55)] active:scale-[0.98]'
    : 'border border-white/10 bg-white/[0.04] backdrop-blur-sm text-foreground/90 hover:bg-white/[0.08] hover:text-foreground'
  return <Link href={href} className={`${base} ${styles}`}>{children}</Link>
}

function FeatureCard({ icon, title, desc, anim }: typeof FEATURES[0]) {
  return (
    <div className={`glass-card glass-card-lift rounded-2xl p-6 ${anim}`}>
      <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl mb-4"
        style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.20)' }}>
        <span className="text-emerald-400">{icon}</span>
      </div>
      <h3 className="font-semibold text-base mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed font-light">{desc}</p>
    </div>
  )
}

function ChatMockup() {
  return (
    <div className="relative">
      {/* Glow behind mockup */}
      <div className="absolute inset-0 -z-10 translate-y-4 scale-90 blur-3xl rounded-3xl"
        style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.18) 0%, transparent 70%)' }} />

      <div className="glass-card rounded-2xl overflow-hidden shadow-2xl"
        style={{ transform: 'perspective(1000px) rotateY(-2deg) rotateX(1.5deg)' }}>
        {/* Header */}
        <div className="border-b border-white/[0.07] px-4 py-3 flex items-center gap-3"
          style={{ background: 'rgba(255,255,255,0.03)' }}>
          <div className="flex gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/60" />
          </div>
          <div className="flex items-center gap-2 flex-1">
            <div className="w-5 h-5 rounded-md flex items-center justify-center"
              style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.20)' }}>
              <FileSearch className="h-3 w-3 text-emerald-400" />
            </div>
            <p className="text-xs font-semibold truncate">Sunrise Bakery — Oakridge Town Center</p>
          </div>
        </div>

        {/* Messages */}
        <div className="p-4 space-y-3 text-sm">
          {/* User */}
          <div className="flex justify-end anim-chat-user">
            <div className="rounded-[14px] rounded-br-[4px] px-4 py-2.5 max-w-[78%] text-white text-xs leading-relaxed"
              style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.9), rgba(13,148,136,0.9))' }}>
              Who is responsible for HVAC repairs?
            </div>
          </div>

          {/* AI */}
          <div className="flex justify-start anim-chat-ai">
            <div className="glass-card rounded-[14px] rounded-bl-[4px] px-4 py-3 max-w-[88%]">
              <p className="text-xs leading-relaxed text-foreground/90">
                Based on{' '}
                <span className="font-semibold text-emerald-400">Section 12.3</span>
                {' '}of your lease (p. 18), HVAC maintenance is the{' '}
                <strong>Landlord&apos;s responsibility</strong>
                {' '}for systems serving the premises, except repairs caused by Tenant&apos;s negligence.
              </p>
              {/* Citation badge */}
              <div className="anim-chat-cite mt-2.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs"
                style={{ background: 'rgba(16,185,129,0.10)', border: '1px solid rgba(16,185,129,0.18)' }}>
                <BookOpen className="h-3 w-3 text-emerald-400" />
                <span className="text-emerald-400/80 font-medium">Article 12 · Section 12.3 · p. 18</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─── Main component ─────────────────────────────────────────── */

export function LandingPage({ isAuthenticated = false }: { isAuthenticated?: boolean }) {
  return (
    <div className="min-h-screen flex flex-col">
      {/* ── Nav ─────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 border-b border-white/[0.06]"
        style={{ background: 'rgba(26,29,37,0.80)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-7 h-7 rounded-lg"
              style={{ background: 'linear-gradient(135deg,rgba(16,185,129,0.25),rgba(20,184,166,0.15))', border: '1px solid rgba(16,185,129,0.25)' }}>
              <span className="text-[10px] font-extrabold text-emerald-400">PV</span>
            </div>
            <span className="font-bold text-sm tracking-tight">Provelo</span>
          </div>
          <div className="flex items-center gap-2">
            {isAuthenticated ? (
              <GlowButton href="/dashboard">
                Go to Dashboard <ArrowRight className="h-3.5 w-3.5" />
              </GlowButton>
            ) : (
              <>
                <Link href="/login"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5">
                  Sign in
                </Link>
                <GlowButton href="/login?mode=signup">
                  Get started <ArrowRight className="h-3.5 w-3.5" />
                </GlowButton>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-20 pb-24 sm:pt-28 sm:pb-32 grid lg:grid-cols-2 gap-14 lg:gap-20 items-center">
        <div className="space-y-8">
          {/* Badge */}
          <div className="anim-hero-1 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium"
            style={{ background: 'rgba(16,185,129,0.10)', border: '1px solid rgba(16,185,129,0.20)' }}>
            <Sparkles className="h-3 w-3 text-emerald-400" />
            <span className="text-emerald-300/80">AI-powered lease intelligence</span>
          </div>

          {/* Headline */}
          <h1 className="anim-hero-2 text-3xl sm:text-5xl lg:text-[3.4rem] font-extrabold leading-[1.10] tracking-tight">
            Your lease,<br />
            <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
              finally explained.
            </span>
          </h1>

          {/* Subtext */}
          <p className="anim-hero-3 text-base sm:text-lg text-muted-foreground leading-relaxed font-light max-w-lg">
            Upload your commercial lease and ask anything — who pays for HVAC, can you sublease, what&apos;s your CAM cap.
            Get instant, cited answers in plain English.
          </p>

          {/* CTAs */}
          <div className="anim-hero-4 flex flex-wrap gap-3">
            {isAuthenticated ? (
              <GlowButton href="/dashboard">
                Go to Dashboard <ArrowRight className="h-4 w-4" />
              </GlowButton>
            ) : (
              <>
                <GlowButton href="/login?mode=signup">
                  Start for free <ArrowRight className="h-4 w-4" />
                </GlowButton>
                <GlowButton href="/login" variant="ghost">
                  Sign in
                </GlowButton>
              </>
            )}
          </div>

          {!isAuthenticated && (
            <p className="anim-hero-4 text-xs text-muted-foreground/75">
              No credit card required · Answers in seconds
            </p>
          )}
        </div>

        {/* Chat mockup */}
        <div className="hidden lg:block">
          <ChatMockup />
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────── */}
      <section id="features" className="border-t border-white/[0.06] py-24 sm:py-32">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <p className="text-xs font-semibold text-emerald-400/70 uppercase tracking-widest mb-3">Features</p>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">Everything you need to understand your lease</h2>
            <p className="text-muted-foreground mt-3 font-light max-w-xl mx-auto">
              Built specifically for retail tenants — the people who actually have to live with the terms.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((f) => <FeatureCard key={f.title} {...f} />)}
          </div>
        </div>
      </section>

      {/* ── How It Works ─────────────────────────────────────── */}
      <section className="border-t border-white/[0.06] py-24 sm:py-32">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <p className="text-xs font-semibold text-emerald-400/70 uppercase tracking-widest mb-3">How it works</p>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">Up and running in minutes</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
            {/* Connector line (desktop only) */}
            <div className="hidden md:block absolute top-12 left-[calc(33.33%+1rem)] right-[calc(33.33%+1rem)] h-px"
              style={{ background: 'linear-gradient(90deg, transparent, rgba(16,185,129,0.3), transparent)' }} />

            {STEPS.map((s) => (
              <div key={s.n} className="glass-card rounded-2xl p-7 text-center relative">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl mb-5"
                  style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.20)' }}>
                  <span className="text-emerald-400">{s.icon}</span>
                </div>
                <div className="absolute top-4 right-4 text-xs font-bold text-emerald-500/30">0{s.n}</div>
                <h3 className="font-semibold text-base mb-2">{s.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed font-light">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Example Questions ────────────────────────────────── */}
      <section className="border-t border-white/[0.06] py-24 sm:py-32">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <p className="text-xs font-semibold text-emerald-400/70 uppercase tracking-widest mb-3">Real questions</p>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">Ask what you actually need to know</h2>
            <p className="text-muted-foreground mt-3 font-light max-w-lg mx-auto">
              Tenants ask hundreds of questions. Provelo answers every one, grounded in the language of your specific document.
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-2.5">
            {QUESTIONS.map((q) => (
              <div key={q}
                className="px-4 py-2.5 rounded-xl text-sm font-light text-foreground/90 glass-card transition-colors hover:text-foreground cursor-default"
                style={{ background: 'rgba(255,255,255,0.03)' }}>
                {q}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Banner ───────────────────────────────────────── */}
      <section className="border-t border-white/[0.06] py-24 sm:py-32">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <div className="glass-card rounded-3xl px-5 py-10 sm:px-8 sm:py-14 relative overflow-hidden">
            {/* BG glow */}
            <div className="absolute inset-0 -z-10"
              style={{ background: 'radial-gradient(ellipse at 50% 80%, rgba(16,185,129,0.07) 0%, transparent 60%)' }} />

            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-6"
              style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.20)' }}>
              <Building2 className="h-7 w-7 text-emerald-400" />
            </div>

            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-4">
              Know your lease.<br />
              <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                Protect your business.
              </span>
            </h2>

            <p className="text-muted-foreground mb-8 font-light text-lg max-w-md mx-auto">
              Join retail tenants who use Provelo to understand their obligations, rights, and deadlines.
            </p>

            {isAuthenticated ? (
              <GlowButton href="/dashboard">
                Go to Dashboard <ChevronRight className="h-4 w-4" />
              </GlowButton>
            ) : (
              <GlowButton href="/login?mode=signup">
                Get started — it&apos;s free <ChevronRight className="h-4 w-4" />
              </GlowButton>
            )}
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────── */}
      <footer className="border-t border-white/[0.06] py-10 mt-auto">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md flex items-center justify-center"
              style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.20)' }}>
              <span className="text-[9px] font-extrabold text-emerald-400">PV</span>
            </div>
            <span className="text-sm font-bold text-foreground/80">Provelo</span>
          </div>
          <p className="text-xs text-muted-foreground/75 text-center max-w-xl leading-relaxed">
            Provelo provides informational summaries based on uploaded lease documents.
            It is not a substitute for legal advice. Always consult a licensed attorney for legal matters.
          </p>
          <p className="text-xs text-muted-foreground/60">© {new Date().getFullYear()} Provelo</p>
        </div>
      </footer>
    </div>
  )
}
