'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  MapPin, Upload, MessageSquare, FileText, ShieldCheck,
  CheckCircle2, Circle, X, PartyPopper,
} from 'lucide-react'

interface OnboardingSteps {
  add_location: boolean
  upload_document: boolean
  ask_question: boolean
  review_summary: boolean
  check_risk: boolean
}

interface OnboardingData {
  steps: OnboardingSteps
  completed: number
  total: number
  all_done: boolean
  onboarding_completed: boolean
}

const STEP_CONFIG = [
  {
    key: 'add_location' as const,
    label: 'Add your first location',
    description: 'Create a location for your commercial space',
    icon: MapPin,
    action: 'modal', // special: opens AddStoreModal
  },
  {
    key: 'upload_document' as const,
    label: 'Upload a lease document',
    description: 'Upload your lease PDF to unlock AI analysis',
    icon: Upload,
    href: '/upload',
  },
  {
    key: 'ask_question' as const,
    label: 'Ask your lease a question',
    description: 'Try asking a question in plain English',
    icon: MessageSquare,
    href: '/chat',
  },
  {
    key: 'review_summary' as const,
    label: 'Review your lease summary',
    description: 'See AI-extracted details from your lease',
    icon: FileText,
    href: 'first-location',
  },
  {
    key: 'check_risk' as const,
    label: 'Check your risk score',
    description: 'Analyze lease clauses for potential risks',
    icon: ShieldCheck,
    href: 'first-location-risk',
  },
]

interface OnboardingChecklistProps {
  onAddLocation?: () => void
  firstStoreId?: string | null
}

export function OnboardingChecklist({ onAddLocation, firstStoreId }: OnboardingChecklistProps) {
  const router = useRouter()
  const [data, setData] = useState<OnboardingData | null>(null)
  const [dismissed, setDismissed] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/onboarding')
      .then(r => r.json())
      .then((d: OnboardingData) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading || !data || data.onboarding_completed || dismissed) return null

  const handleStepClick = (step: typeof STEP_CONFIG[number]) => {
    if (step.action === 'modal') {
      onAddLocation?.()
      return
    }
    if (step.href === 'first-location' && firstStoreId) {
      router.push(`/location/${firstStoreId}`)
    } else if (step.href === 'first-location-risk' && firstStoreId) {
      router.push(`/location/${firstStoreId}#risk-score`)
    } else if (step.href) {
      router.push(step.href)
    }
  }

  const handleDismiss = async () => {
    setDismissed(true)
    try {
      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ onboarding_completed: true }),
      })
    } catch {
      // Fail silently
    }
  }

  const progress = data.total > 0 ? (data.completed / data.total) * 100 : 0

  return (
    <div
      className="rounded-xl p-5 sm:p-6 space-y-5"
      style={{
        background: 'linear-gradient(135deg, rgba(16,185,129,0.08), rgba(17,19,27,0.6))',
        border: '1px solid rgba(16,185,129,0.15)',
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          {data.all_done ? (
            <div className="flex items-center gap-2 mb-1">
              <PartyPopper className="h-5 w-5 text-emerald-400" />
              <h3 className="font-bold text-base text-emerald-400">You&apos;re all set!</h3>
            </div>
          ) : (
            <h3 className="font-bold text-base">Get Started with Provelo</h3>
          )}
          <p className="text-xs text-muted-foreground/70 mt-0.5">
            {data.all_done
              ? 'You\'ve completed all the getting started steps.'
              : `${data.completed} of ${data.total} complete`}
          </p>
        </div>
        {data.all_done && (
          <button
            onClick={handleDismiss}
            className="text-xs text-muted-foreground/60 hover:text-foreground transition-colors flex items-center gap-1"
          >
            <X className="h-3.5 w-3.5" /> Dismiss
          </button>
        )}
      </div>

      {/* Progress bar */}
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{
            width: `${progress}%`,
            background: 'linear-gradient(90deg, #10b981, #14b8a6)',
          }}
        />
      </div>

      {/* Steps */}
      {!data.all_done && (
        <div className="space-y-1.5">
          {STEP_CONFIG.map((step) => {
            const done = data.steps[step.key]
            const Icon = step.icon
            return (
              <button
                key={step.key}
                onClick={() => !done && handleStepClick(step)}
                disabled={done}
                className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${
                  done
                    ? 'opacity-60 cursor-default'
                    : 'hover:bg-white/[0.04] cursor-pointer'
                }`}
              >
                {done ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
                ) : (
                  <Circle className="h-5 w-5 text-white/20 shrink-0" />
                )}
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <Icon className={`h-4 w-4 shrink-0 ${done ? 'text-emerald-400/50' : 'text-muted-foreground/60'}`} />
                  <div className="min-w-0">
                    <p className={`text-sm font-medium ${done ? 'line-through text-white/40' : ''}`}>
                      {step.label}
                    </p>
                    <p className="text-xs text-muted-foreground/50 hidden sm:block">{step.description}</p>
                  </div>
                </div>
                {!done && (
                  <span className="text-xs text-emerald-400/70 shrink-0">&rarr;</span>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
