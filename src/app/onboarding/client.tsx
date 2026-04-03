'use client'

import { useState } from 'react'
import { createBrowserSupabaseClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { FileSearch, ArrowRight, Loader2 } from 'lucide-react'
import { useLanguage } from '@/components/LanguageProvider'

const inputStyle = {
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.09)',
}

function GlassInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="w-full rounded-xl px-4 py-2.5 text-sm placeholder:text-muted-foreground/55 focus:outline-none transition-all"
      style={inputStyle}
      onFocus={(e) => {
        e.target.style.borderColor = 'rgba(16,185,129,0.45)'
        e.target.style.boxShadow = '0 0 0 3px rgba(16,185,129,0.10)'
      }}
      onBlur={(e) => {
        e.target.style.borderColor = 'rgba(255,255,255,0.09)'
        e.target.style.boxShadow = 'none'
      }}
    />
  )
}

export function OnboardingClient({ userId }: { userId: string }) {
  const [companyName, setCompanyName] = useState('')
  const [loading, setLoading] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createBrowserSupabaseClient()
  const { lang, setLang } = useLanguage()

  const save = async (skip = false) => {
    setLoading(true)
    setSaveError(null)
    try {
      const { error } = await supabase.from('tenant_profiles').upsert({
        id: userId,
        company_name: skip ? null : (companyName.trim() || null),
        role: 'individual',
        language_preference: lang,
      })
      if (error) {
        setSaveError('Could not save your profile. Please try again.')
        return
      }
      router.push('/dashboard')
    } catch {
      setSaveError('An unexpected error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <div
            className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4"
            style={{
              background: 'linear-gradient(135deg,rgba(16,185,129,0.18),rgba(20,184,166,0.12))',
              border: '1px solid rgba(16,185,129,0.22)',
            }}
          >
            <FileSearch className="h-7 w-7 text-emerald-400" />
          </div>
          <div className="flex gap-2 justify-center mb-6">
            <button
              onClick={() => setLang('en')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                lang === 'en' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'text-white/40 hover:text-white/60'
              }`}
            >
              {'\ud83c\uddfa\ud83c\uddf8'} English
            </button>
            <button
              onClick={() => setLang('es')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                lang === 'es' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'text-white/40 hover:text-white/60'
              }`}
            >
              {'\ud83c\uddea\ud83c\uddf8'} Español
            </button>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Welcome to Provelo</h1>
          <p className="text-sm text-muted-foreground mt-1.5 font-light">
            What should we call you or your company?
          </p>
        </div>

        <div className="glass-card rounded-2xl p-7 space-y-5">
          <div>
            <label className="text-xs text-muted-foreground/90 mb-1.5 block">
              Name or company name
            </label>
            <GlassInput
              type="text"
              placeholder="e.g. Sunrise Bakery or Jane Smith"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && companyName.trim() && save()}
              autoFocus
            />
          </div>

          {saveError && <p className="text-sm text-red-400">{saveError}</p>}

          <Button
            onClick={() => save()}
            disabled={loading || !companyName.trim()}
            className="w-full h-10"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>Continue <ArrowRight className="h-4 w-4 ml-1" /></>
            )}
          </Button>

          <button
            onClick={() => save(true)}
            disabled={loading}
            className="w-full text-xs text-muted-foreground/80 hover:text-foreground transition-colors text-center"
          >
            Skip for now
          </button>
        </div>
      </div>
    </div>
  )
}
