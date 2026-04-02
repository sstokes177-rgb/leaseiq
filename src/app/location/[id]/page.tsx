export const dynamic = 'force-dynamic'

import { redirect, notFound } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import {
  MessageSquare, Upload, FileText, ArrowRight, ArrowLeft,
  Calendar, AlertTriangle, AlertCircle, MapPin, Building2,
} from 'lucide-react'
import { LeaseSummaryCard } from '@/components/LeaseSummaryCard'
import { ObligationMatrixCard } from '@/components/ObligationMatrixCard'
import { CamAnalysisCard } from '@/components/CamAnalysisCard'
import { CamReconciliationCard } from '@/components/CamReconciliationCard'
import { PercentageRentCard } from '@/components/PercentageRentCard'
import { OccupancyCostCard } from '@/components/OccupancyCostCard'
import { RentEscalationTimeline } from '@/components/RentEscalationTimeline'
import { LeaseClauseCard } from '@/components/LeaseClauseCard'
import { DocumentListItem } from '@/components/DocumentListItem'

function daysUntil(dateStr: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const d = new Date(dateStr + 'T00:00:00')
  return Math.round((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

function formatCountdown(days: number): string {
  if (days === 1) return 'tomorrow'
  if (days <= 30) return `in ${days} day${days !== 1 ? 's' : ''}`
  if (days < 60) return `in ${Math.round(days / 7)} weeks`
  if (days < 365) return `in ${Math.round(days / 30)} month${Math.round(days / 30) !== 1 ? 's' : ''}`
  const years = days / 365
  return `in ${Math.round(years * 10) / 10}yr`
}

function urgencyBadge(days: number) {
  if (days < 0) {
    return (
      <span className="shrink-0 text-xs font-medium px-2 py-0.5 rounded-md bg-white/[0.05] text-muted-foreground/50 border border-white/[0.07]">
        Passed
      </span>
    )
  }
  if (days === 0) {
    return (
      <span className="shrink-0 inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-md bg-red-500/20 text-red-400 border border-red-500/35">
        <AlertCircle className="h-3 w-3" />
        Today
      </span>
    )
  }
  if (days <= 30) {
    return (
      <span className="shrink-0 inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-md bg-red-500/15 text-red-400 border border-red-500/25">
        <AlertCircle className="h-3 w-3" />
        {formatCountdown(days)}
      </span>
    )
  }
  if (days <= 90) {
    return (
      <span className="shrink-0 inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-400 border border-amber-500/25">
        <AlertTriangle className="h-3 w-3" />
        {formatCountdown(days)}
      </span>
    )
  }
  return (
    <span className="shrink-0 inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-md bg-emerald-500/12 text-emerald-400/80 border border-emerald-500/20">
      <Calendar className="h-3 w-3" />
      {formatCountdown(days)}
    </span>
  )
}

export default async function LocationPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Verify store belongs to this user
  const { data: store } = await supabase
    .from('stores')
    .select('*')
    .eq('id', id)
    .eq('tenant_id', user.id)
    .maybeSingle()

  if (!store) notFound()

  let documents: { id: string; file_name: string; document_type: string; display_name: string | null; store_id: string | null; uploaded_at: string }[] = []
  let criticalDates: { id: string; date_type: string; date_value: string | null; description: string; store_id: string | null; alert_days_before: number }[] = []

  try {
    const [docsRes, datesRes] = await Promise.all([
      supabase
        .from('documents')
        .select('id, file_name, document_type, display_name, store_id, uploaded_at')
        .eq('tenant_id', user.id)
        .eq('store_id', id)
        .order('uploaded_at', { ascending: false })
        .limit(5),
      supabase
        .from('critical_dates')
        .select('id, date_type, date_value, description, store_id, alert_days_before')
        .eq('tenant_id', user.id)
        .eq('store_id', id)
        .not('date_value', 'is', null)
        .order('date_value', { ascending: true })
        .limit(12),
    ])
    documents = docsRes.data ?? []
    criticalDates = datesRes.data ?? []
  } catch {
    // Gracefully degrade
  }

  const hasDocuments = documents.length > 0

  const allDates = criticalDates.map((d) => ({ ...d, days: daysUntil(d.date_value!) }))
  const upcomingDates = [...allDates].sort((a, b) => {
    if (a.days >= 0 && b.days >= 0) return a.days - b.days
    if (a.days < 0 && b.days < 0) return b.days - a.days
    return a.days >= 0 ? -1 : 1
  })
  const hasDanger = upcomingDates.some((d) => d.days >= 0 && d.days <= 30)

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="glass border-b border-white/[0.07] px-4 sm:px-6 py-4 flex items-center gap-4">
        <Link
          href="/dashboard"
          className="text-muted-foreground/80 hover:text-foreground transition-colors -ml-1"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <div
            className="flex items-center justify-center w-8 h-8 rounded-xl shrink-0"
            style={{
              background: 'linear-gradient(135deg, rgba(16,185,129,0.25), rgba(20,184,166,0.15))',
              border: '1px solid rgba(16,185,129,0.2)',
            }}
          >
            <FileText className="h-4 w-4 text-emerald-400" />
          </div>
          <span className="font-bold text-base tracking-tight">LeaseIQ</span>
        </div>
        <form action="/api/auth/signout" method="POST">
          <button className="text-sm text-muted-foreground/85 hover:text-foreground transition-colors">
            Sign out
          </button>
        </form>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-8">
        {/* Location header */}
        <div>
          <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground/70 hover:text-foreground transition-colors mb-4">
            <ArrowLeft className="h-3 w-3" /> All locations
          </Link>
          <div className="flex items-center gap-3">
            <div
              className="flex items-center justify-center w-10 h-10 rounded-xl shrink-0"
              style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.20)' }}
            >
              <Building2 className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <h1 className="font-bold text-2xl">{store.store_name}</h1>
              {store.shopping_center_name && (
                <p className="text-sm text-muted-foreground/70 flex items-center gap-1 mt-0.5">
                  <MapPin className="h-3.5 w-3.5" />
                  {store.shopping_center_name}
                  {store.suite_number && `, Suite ${store.suite_number}`}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Lease Summary */}
        {hasDocuments && <LeaseSummaryCard storeId={id} />}

        {/* Obligation Matrix */}
        {hasDocuments && <ObligationMatrixCard storeId={id} />}

        {/* CAM Intelligence */}
        {hasDocuments && <CamAnalysisCard storeId={id} />}
        {hasDocuments && <CamReconciliationCard storeId={id} />}

        {/* Financial Tools */}
        {hasDocuments && <OccupancyCostCard storeId={id} />}
        {hasDocuments && <RentEscalationTimeline storeId={id} />}
        {hasDocuments && <PercentageRentCard storeId={id} />}

        {/* Monitoring */}
        {hasDocuments && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <LeaseClauseCard storeId={id} clauseType="co-tenancy" />
            <LeaseClauseCard storeId={id} clauseType="exclusive-use" />
          </div>
        )}

        {/* Action cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className={`glass-card glass-card-lift rounded-2xl p-6 ${!hasDocuments ? 'ring-1 ring-emerald-500/25' : ''}`}>
            <div className="flex items-center gap-3 mb-4">
              <div
                className="flex items-center justify-center w-10 h-10 rounded-xl"
                style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.18)' }}
              >
                <Upload className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <h2 className="font-semibold text-sm">Upload Documents</h2>
                <p className="text-xs text-muted-foreground">PDF or Word</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-5 leading-relaxed font-light">
              Upload your lease, amendments, and addenda. We&apos;ll extract and index them for Q&amp;A.
            </p>
            <Link href={`/upload?store=${id}`}>
              <Button variant={hasDocuments ? 'outline' : 'default'} size="sm" className="w-full">
                Upload documents <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </Link>
          </div>

          <div className={`glass-card glass-card-lift rounded-2xl p-6 ${hasDocuments ? 'ring-1 ring-emerald-500/25' : 'opacity-50'}`}>
            <div className="flex items-center gap-3 mb-4">
              <div
                className="flex items-center justify-center w-10 h-10 rounded-xl"
                style={{ background: 'rgba(20,184,166,0.12)', border: '1px solid rgba(20,184,166,0.18)' }}
              >
                <MessageSquare className="h-5 w-5 text-teal-400" />
              </div>
              <div>
                <h2 className="font-semibold text-sm">Ask Your Lease</h2>
                <p className="text-xs text-muted-foreground">AI-powered Q&amp;A</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-5 leading-relaxed font-light">
              Ask anything in plain language. Get cited answers from your actual lease text.
            </p>
            <Link href={`/chat?store=${id}`}>
              <Button
                variant={hasDocuments ? 'default' : 'outline'}
                size="sm"
                className="w-full"
                disabled={!hasDocuments}
              >
                {hasDocuments ? (
                  <>Start chatting <ArrowRight className="h-3.5 w-3.5 ml-1" /></>
                ) : (
                  'Upload a lease first'
                )}
              </Button>
            </Link>
          </div>
        </div>

        {/* Critical Dates */}
        {upcomingDates.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <p className="text-xs font-semibold text-muted-foreground/80 uppercase tracking-widest">
                Critical Dates
              </p>
              {hasDanger && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/25">
                  <AlertCircle className="h-3 w-3" /> Action needed
                </span>
              )}
            </div>
            <div className="space-y-2.5">
              {upcomingDates.map((date) => {
                const isPast = date.days < 0
                const isUrgent = date.days >= 0 && date.days <= 30
                const isWarning = date.days >= 0 && date.days > 30 && date.days <= 90

                const iconBg = isPast
                  ? 'rgba(255,255,255,0.04)'
                  : isUrgent
                  ? 'rgba(239,68,68,0.10)'
                  : isWarning
                  ? 'rgba(245,158,11,0.10)'
                  : 'rgba(16,185,129,0.10)'

                const iconBorder = isPast
                  ? '1px solid rgba(255,255,255,0.07)'
                  : isUrgent
                  ? '1px solid rgba(239,68,68,0.22)'
                  : isWarning
                  ? '1px solid rgba(245,158,11,0.22)'
                  : '1px solid rgba(16,185,129,0.18)'

                const iconColor = isPast
                  ? 'text-muted-foreground/40'
                  : isUrgent
                  ? 'text-red-400'
                  : isWarning
                  ? 'text-amber-400'
                  : 'text-emerald-400'

                return (
                  <div
                    key={date.id}
                    className={`glass-card rounded-xl px-5 py-4 flex items-start gap-4 transition-opacity ${isPast ? 'opacity-55' : ''}`}
                  >
                    <div
                      className="flex items-center justify-center w-9 h-9 rounded-lg shrink-0 mt-0.5"
                      style={{ background: iconBg, border: iconBorder }}
                    >
                      <Calendar className={`h-4 w-4 ${iconColor}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className={`text-sm font-semibold ${isPast ? 'text-muted-foreground/70' : ''}`}>
                          {date.date_type}
                        </p>
                        {date.date_value && (
                          <span className={`text-xs ${isPast ? 'text-muted-foreground/40' : 'text-muted-foreground/70'}`}>
                            {new Date(date.date_value + 'T00:00:00').toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </span>
                        )}
                      </div>
                      <p className={`text-xs mt-0.5 leading-relaxed ${isPast ? 'text-muted-foreground/40' : 'text-muted-foreground'}`}>
                        {date.description}
                      </p>
                    </div>
                    {urgencyBadge(date.days)}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Recent documents */}
        {hasDocuments && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground/80 uppercase tracking-widest mb-4">
              Recent Documents
            </p>
            <div className="space-y-2.5">
              {documents.map((doc) => (
                <DocumentListItem key={doc.id} doc={doc} />
              ))}
            </div>
          </div>
        )}

        {/* No documents yet */}
        {!hasDocuments && (
          <div className="glass-card rounded-2xl p-10 text-center">
            <div
              className="inline-flex items-center justify-center w-12 h-12 rounded-2xl mb-4"
              style={{ background: 'rgba(16,185,129,0.10)', border: '1px solid rgba(16,185,129,0.18)' }}
            >
              <FileText className="h-6 w-6 text-emerald-400/80" />
            </div>
            <p className="font-semibold text-sm mb-1">No documents yet</p>
            <p className="text-xs text-muted-foreground/70 mb-5">
              Upload your lease to unlock AI-powered analysis and Q&amp;A.
            </p>
            <Link href={`/upload?store=${id}`}>
              <Button size="sm">
                Upload your lease <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </Link>
          </div>
        )}
      </main>
    </div>
  )
}
