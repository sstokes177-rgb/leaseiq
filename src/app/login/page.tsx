'use client'

import { useState, useEffect, Suspense } from 'react'
import { createBrowserSupabaseClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2, FileSearch, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

function LoginForm() {
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null)
  const router = useRouter()
  const supabase = createBrowserSupabaseClient()

  useEffect(() => {
    if (searchParams.get('mode') === 'signup') setIsSignUp(true)
  }, [searchParams])

  const handleAuth = async () => {
    setLoading(true)
    setMessage(null)
    const { error } = isSignUp
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) {
      setMessage({ type: 'error', text: error.message })
    } else if (isSignUp) {
      router.push('/onboarding')
    } else {
      router.push('/dashboard')
    }
  }

  return (
    <>
      {/* Form card */}
      <div className="glass-card rounded-2xl p-7 space-y-5">
        <h2 className="text-sm font-semibold text-foreground">
          {isSignUp ? 'Sign up' : 'Sign in'}
        </h2>

        <div className="space-y-3">
          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl px-4 py-2.5 text-sm placeholder:text-muted-foreground/55 focus:outline-none transition-all"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)' }}
            onFocus={(e) => { e.target.style.borderColor = 'rgba(16,185,129,0.45)'; e.target.style.boxShadow = '0 0 0 3px rgba(16,185,129,0.10)' }}
            onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.09)'; e.target.style.boxShadow = 'none' }}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAuth()}
            className="w-full rounded-xl px-4 py-2.5 text-sm placeholder:text-muted-foreground/55 focus:outline-none transition-all"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)' }}
            onFocus={(e) => { e.target.style.borderColor = 'rgba(16,185,129,0.45)'; e.target.style.boxShadow = '0 0 0 3px rgba(16,185,129,0.10)' }}
            onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.09)'; e.target.style.boxShadow = 'none' }}
          />
        </div>

        {message && (
          <p className={`text-xs ${message.type === 'error' ? 'text-red-400' : 'text-emerald-400'}`}>
            {message.text}
          </p>
        )}

        <Button
          onClick={handleAuth}
          disabled={loading || !email || !password}
          className="w-full h-10"
        >
          {loading
            ? <Loader2 className="h-4 w-4 animate-spin" />
            : isSignUp ? 'Create account' : 'Sign in'}
        </Button>

        <button
          onClick={() => { setIsSignUp(!isSignUp); setMessage(null) }}
          className="w-full text-xs text-muted-foreground/80 hover:text-foreground transition-colors text-center"
        >
          {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
        </button>
      </div>
    </>
  )
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-8">
        {/* Back to landing */}
        <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground/80 hover:text-foreground transition-colors">
          <ArrowLeft className="h-3 w-3" />
          Back
        </Link>

        {/* Logo */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4"
            style={{ background: 'linear-gradient(135deg,rgba(16,185,129,0.18),rgba(20,184,166,0.12))', border: '1px solid rgba(16,185,129,0.22)' }}>
            <FileSearch className="h-7 w-7 text-emerald-400" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">LeaseIQ</h1>
          <p className="text-sm text-muted-foreground mt-1.5 font-light">
            Sign in to your account
          </p>
        </div>

        <Suspense fallback={<div className="glass-card rounded-2xl p-7 h-48 animate-pulse" />}>
          <LoginForm />
        </Suspense>

        <p className="text-center text-xs text-muted-foreground/65 px-4 leading-relaxed">
          LeaseIQ provides informational summaries only. Not a substitute for legal advice.
        </p>
      </div>
    </div>
  )
}
