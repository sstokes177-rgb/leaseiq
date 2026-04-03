'use client'

import { useState } from 'react'
import { createBrowserSupabaseClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { KeyRound, Loader2, ArrowLeft, CheckCircle } from 'lucide-react'
import Link from 'next/link'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const supabase = createBrowserSupabaseClient()

  const handleSubmit = async () => {
    setLoading(true)
    // Always show success to prevent user enumeration (NIST SP 800-63B)
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    setLoading(false)
    setSent(true)
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-8">
        <Link href="/login" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground/80 hover:text-foreground transition-colors">
          <ArrowLeft className="h-3 w-3" />
          Back to sign in
        </Link>

        <div className="text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4"
            style={{ background: 'linear-gradient(135deg,rgba(16,185,129,0.18),rgba(20,184,166,0.12))', border: '1px solid rgba(16,185,129,0.22)' }}>
            <KeyRound className="h-7 w-7 text-emerald-400" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Reset password</h1>
          <p className="text-sm text-muted-foreground mt-1.5 font-light">
            Enter your email and we&apos;ll send you a reset link.
          </p>
        </div>

        <div className="glass-card p-7 space-y-5">
          {sent ? (
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl mx-auto"
                style={{ background: 'rgba(16,185,129,0.10)', border: '1px solid rgba(16,185,129,0.18)' }}>
                <CheckCircle className="h-6 w-6 text-emerald-400" />
              </div>
              <p className="text-sm text-muted-foreground/80">
                If an account exists for that email, we&apos;ve sent a password reset link.
              </p>
              <Link href="/login" className="inline-block text-xs text-emerald-400/80 hover:text-emerald-400 transition-colors">
                Return to sign in
              </Link>
            </div>
          ) : (
            <>
              <div>
                <input
                  type="email"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && email && handleSubmit()}
                  className="w-full rounded-xl px-4 py-2.5 text-sm placeholder:text-muted-foreground/55 focus:outline-none transition-all"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)' }}
                  onFocus={(e) => { e.target.style.borderColor = 'rgba(16,185,129,0.45)'; e.target.style.boxShadow = '0 0 0 3px rgba(16,185,129,0.10)' }}
                  onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.09)'; e.target.style.boxShadow = 'none' }}
                  autoFocus
                />
              </div>

              <Button
                onClick={handleSubmit}
                disabled={loading || !email}
                className="w-full h-10"
              >
                {loading
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : 'Send reset link'}
              </Button>
            </>
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground/65 px-4 leading-relaxed">
          Provelo provides informational summaries only. Not a substitute for legal advice.
        </p>
      </div>
    </div>
  )
}
