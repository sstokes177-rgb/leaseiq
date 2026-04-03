'use client'

import { useState } from 'react'
import { createBrowserSupabaseClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { KeyRound, Loader2, ArrowLeft, CheckCircle, Eye, EyeOff } from 'lucide-react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { PasswordStrengthMeter } from '@/components/PasswordStrengthMeter'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null)
  const router = useRouter()
  const supabase = createBrowserSupabaseClient()

  const handleReset = async () => {
    if (password.length < 8) {
      setMessage({ type: 'error', text: 'Password must be at least 8 characters.' })
      return
    }
    if (password !== confirm) {
      setMessage({ type: 'error', text: 'Passwords do not match.' })
      return
    }

    setLoading(true)
    setMessage(null)

    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)

    if (error) {
      setMessage({ type: 'error', text: 'Unable to reset password. The link may have expired.' })
    } else {
      setMessage({ type: 'success', text: 'Password updated successfully. Redirecting...' })
      setTimeout(() => router.push('/dashboard'), 1500)
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
            <KeyRound className="h-7 w-7 text-emerald-400" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Set new password</h1>
          <p className="text-sm text-muted-foreground mt-1.5 font-light">
            Choose a new password for your account.
          </p>
        </div>

        <div className="glass-card p-7 space-y-5">
          <div className="space-y-3">
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="New password (min 8 characters)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl px-4 py-2.5 pr-10 text-sm placeholder:text-muted-foreground/55 focus:outline-none transition-all"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)' }}
                onFocus={(e) => { e.target.style.borderColor = 'rgba(16,185,129,0.45)'; e.target.style.boxShadow = '0 0 0 3px rgba(16,185,129,0.10)' }}
                onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.09)'; e.target.style.boxShadow = 'none' }}
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            <PasswordStrengthMeter password={password} />

            <input
              type="password"
              placeholder="Confirm new password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleReset()}
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
            onClick={handleReset}
            disabled={loading || !password || !confirm}
            className="w-full h-10"
          >
            {loading
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : 'Update password'}
          </Button>
        </div>

        <p className="text-center text-xs text-muted-foreground/65 px-4 leading-relaxed">
          Provelo provides informational summaries only. Not a substitute for legal advice.
        </p>
      </div>
    </div>
  )
}
