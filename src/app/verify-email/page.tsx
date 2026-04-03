'use client'

import { useState } from 'react'
import { createBrowserSupabaseClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { FileSearch, Mail, Loader2, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function VerifyEmailPage() {
  const [resending, setResending] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const supabase = createBrowserSupabaseClient()

  const handleResend = async () => {
    setResending(true)
    setMessage(null)

    // Get email from the last signup attempt stored in sessionStorage
    const email = sessionStorage.getItem('verify-email')
    if (!email) {
      setMessage({ type: 'error', text: 'Please go back and sign up again.' })
      setResending(false)
      return
    }

    const { error } = await supabase.auth.resend({ type: 'signup', email })
    setResending(false)

    if (error) {
      setMessage({ type: 'error', text: 'Unable to resend. Please try again later.' })
    } else {
      setMessage({ type: 'success', text: 'Verification email resent. Check your inbox.' })
    }
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
            <Mail className="h-7 w-7 text-emerald-400" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Check your email</h1>
          <p className="text-sm text-muted-foreground mt-1.5 font-light">
            We sent you a verification link. Click it to activate your account.
          </p>
        </div>

        <div className="glass-card rounded-2xl p-7 space-y-5">
          <div className="text-center space-y-3">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl mx-auto"
              style={{ background: 'rgba(16,185,129,0.10)', border: '1px solid rgba(16,185,129,0.18)' }}>
              <FileSearch className="h-6 w-6 text-emerald-400" />
            </div>
            <p className="text-sm text-muted-foreground/80">
              Didn&apos;t receive the email? Check your spam folder, or resend it below.
            </p>
          </div>

          {message && (
            <p className={`text-xs text-center ${message.type === 'error' ? 'text-red-400' : 'text-emerald-400'}`}>
              {message.text}
            </p>
          )}

          <Button
            onClick={handleResend}
            disabled={resending}
            variant="outline"
            className="w-full h-10"
          >
            {resending
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : 'Resend verification email'}
          </Button>
        </div>

        <p className="text-center text-xs text-muted-foreground/65 px-4 leading-relaxed">
          Provelo provides informational summaries only. Not a substitute for legal advice.
        </p>
      </div>
    </div>
  )
}
