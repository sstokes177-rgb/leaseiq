'use client'

import { useState, useEffect, Suspense } from 'react'
import { createBrowserSupabaseClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2, FileSearch, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  )
}

function LoginForm() {
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null)
  const router = useRouter()
  const supabase = createBrowserSupabaseClient()

  useEffect(() => {
    if (searchParams.get('mode') === 'signup') setIsSignUp(true)
    if (searchParams.get('error') === 'auth') {
      setMessage({ type: 'error', text: 'Authentication failed. Please try again.' })
    }
  }, [searchParams])

  const handleAuth = async () => {
    setLoading(true)
    setMessage(null)

    if (isSignUp) {
      if (password.length < 8) {
        setMessage({ type: 'error', text: 'Password must be at least 8 characters.' })
        setLoading(false)
        return
      }
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      })
      setLoading(false)
      if (error) {
        setMessage({ type: 'error', text: error.message })
      } else {
        sessionStorage.setItem('verify-email', email)
        router.push('/verify-email')
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      setLoading(false)
      if (error) {
        setMessage({ type: 'error', text: 'Invalid email or password.' })
      } else {
        router.push('/dashboard')
      }
    }
  }

  const handleGoogleAuth = async () => {
    setGoogleLoading(true)
    setMessage(null)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    if (error) {
      setMessage({ type: 'error', text: 'Unable to sign in with Google. Please try again.' })
      setGoogleLoading(false)
    }
  }

  return (
    <>
      {/* Form card */}
      <div className="glass-card rounded-2xl p-7 space-y-5">
        <h2 className="text-sm font-semibold text-foreground">
          {isSignUp ? 'Sign up' : 'Sign in'}
        </h2>

        {/* Google OAuth */}
        <button
          onClick={handleGoogleAuth}
          disabled={googleLoading}
          className="w-full flex items-center justify-center gap-2.5 h-10 rounded-xl text-sm font-medium transition-all hover:bg-white/[0.08] disabled:opacity-50"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}
        >
          {googleLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleIcon />}
          Continue with Google
        </button>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
          <span className="text-[10px] text-muted-foreground/50 uppercase tracking-widest">or</span>
          <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
        </div>

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
            placeholder={isSignUp ? 'Password (min 8 characters)' : 'Password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAuth()}
            className="w-full rounded-xl px-4 py-2.5 text-sm placeholder:text-muted-foreground/55 focus:outline-none transition-all"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)' }}
            onFocus={(e) => { e.target.style.borderColor = 'rgba(16,185,129,0.45)'; e.target.style.boxShadow = '0 0 0 3px rgba(16,185,129,0.10)' }}
            onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.09)'; e.target.style.boxShadow = 'none' }}
          />
        </div>

        {!isSignUp && (
          <div className="flex justify-end">
            <Link href="/forgot-password" className="text-xs text-emerald-400/80 hover:text-emerald-400 transition-colors">
              Forgot password?
            </Link>
          </div>
        )}

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
          <h1 className="text-2xl font-bold tracking-tight">Provelo</h1>
          <p className="text-sm text-muted-foreground mt-1.5 font-light">
            Sign in to your account
          </p>
        </div>

        <Suspense fallback={<div className="glass-card rounded-2xl p-7 h-48 animate-pulse" />}>
          <LoginForm />
        </Suspense>

        <p className="text-center text-xs text-muted-foreground/65 px-4 leading-relaxed">
          Provelo provides informational summaries only. Not a substitute for legal advice.
        </p>
      </div>
    </div>
  )
}
