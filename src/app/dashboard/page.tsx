export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import {
  MessageSquare, Upload, FileText, ArrowRight, Sparkles,
  Calendar, AlertTriangle, AlertCircle, MapPin, Building2,
} from 'lucide-react'
import { AddStoreButton } from './AddStoreModal'

function daysUntil(dateStr: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const d = new Date(dateStr + 'T00:00:00')
  return Math.round((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
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
        {days}d
      </span>
    )
  }
  if (days <= 90) {
    return (
      <span className="shrink-0 inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-400 border border-amber-500/25">
        <AlertTriangle className="h-3 w-3" />
        {days}d
      </span>
    )
  }
  return (
    <span className="shrink-0 inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-md bg-emerald-500/12 text-emerald-400/80 border border-emerald-500/20">
      <Calendar className="h-3 w-3" />
      {days}d
    </span>
  )
}

const DOC_TYPE_LABELS: Record<string, string> = {
  base_lease: 'Base Lease',
  amendment: 'Amendment',
  commencement_letter: 'Commencement Letter',
  exhibit: 'Exhibit / Addendum',
  side_letter: 'Side Letter',
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ store?: string }>
}) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const resolvedParams = await searchParams

  // Use select('*') so query succeeds even if migration 002 hasn't added the role column yet.
  // Narrowing the column list to names that don't exist causes Supabase to return data:null
  // which would incorrectly redirect authenticated users to /onboarding in a loop.
  let profile: { company_name: string | null; role?: string } | null = null
  let stores: { id: string; store_name: string; shopping_center_name: string | null; suite_number: string | null; address: string | null; created_at: string }[] | null = null

  try {
    const [profileRes, storesRes] = await Promise.all([
      supabase.from('tenant_profiles').select('*').eq('id', user.id).maybeSingle(),
      supabase.from('stores').select('*').eq('tenant_id', user.id).order('created_at', { ascending: true }),
    ])
    profile = profileRes.data
    stores = storesRes.data
  } catch {
    // Network or config error — show the dashboard shell rather than crash
  }

  if (!profile) redirect('/onboarding')

  const userName = profile.company_name ?? user.email?.split('@')[0] ?? 'there'
  const storeList = stores ?? []

  const selectedStoreId = resolvedParams.store ?? storeList[0]?.id ?? null
  const selectedStore = storeList.find((s) => s.id === selectedStoreId) ?? storeList[0] ?? null

  // Fetch data for the selected/active store and doc counts for the grid
  let documents: { id: string; file_name: string; document_type: string; display_name: string | null; store_id: string | null; uploaded_at: string }[] | null = []
  let criticalDates: { id: string; date_type: string; date_value: string | null; description: string; store_id: string | null }[] | null = []
  let storeCountRows: { store_id: string | null }[] | null = null

  try {
    const [docsRes, datesRes, countsRes] = await Promise.all([
      selectedStoreId
        ? supabase
            .from('documents')
            .select('id, file_name, document_type, display_name, store_id, uploaded_at')
            .eq('tenant_id', user.id)
            .eq('store_id', selectedStoreId)
            .order('uploaded_at', { ascending: false })
            .limit(3)
        : Promise.resolve({ data: [] as typeof documents, error: null }),
      selectedStoreId
        ? supabase
            .from('critical_dates')
            .select('id, date_type, date_value, description, store_id')
            .eq('tenant_id', user.id)
            .eq('store_id', selectedStoreId)
            .not('date_value', 'is', null)
            .order('date_value', { ascending: true })
            .limit(8)
        : Promise.resolve({ data: [] as typeof criticalDates, error: null }),
      supabase
        .from('documents')
        .select('store_id')
        .eq('tenant_id', user.id)
        .not('store_id', 'is', null),
    ])
    documents = docsRes.data ?? []
    criticalDates = datesRes.data ?? []
    storeCountRows = countsRes.data
  } catch {
    // Gracefully degrade — show empty state rather than crash
  }

  const hasDocuments = documents && documents.length > 0
  const allDates = (criticalDates ?? []).map((d) => ({
    ...d,
    days: daysUntil(d.date_value!),
  }))
  // Sort: nearest upcoming first, past dates at the bottom (most recent past first)
  const upcomingDates = [...allDates].sort((a, b) => {
    if (a.days >= 0 && b.days >= 0) return a.days - b.days   // both future: nearest first
    if (a.days < 0 && b.days < 0) return b.days - a.days     // both past: most recent first
    return a.days >= 0 ? -1 : 1                               // future before past
  })
  const hasDanger = upcomingDates.some((d) => d.days >= 0 && d.days <= 30)

  // Build per-store doc counts for the location grid
  const docCountsByStore: Record<string, number> = {}
  if (storeCountRows) {
    for (const row of storeCountRows) {
      if (row.store_id) {
        docCountsByStore[row.store_id] = (docCountsByStore[row.store_id] ?? 0) + 1
      }
    }
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="glass border-b border-white/[0.07] px-4 sm:px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-5">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div
              className="flex items-center justify-center w-8 h-8 rounded-xl transition-opacity group-hover:opacity-80"
              style={{
                background: 'linear-gradient(135deg, rgba(16,185,129,0.25), rgba(20,184,166,0.15))',
                border: '1px solid rgba(16,185,129,0.2)',
              }}
            >
              <FileText className="h-4 w-4 text-emerald-400" />
            </div>
            <span className="font-bold text-base tracking-tight">LeaseIQ</span>
          </Link>
          <nav className="hidden sm:flex items-center gap-1">
            <Link href="/dashboard" className="text-sm text-foreground/90 font-medium px-3 py-1.5 rounded-lg bg-white/[0.06]">
              Dashboard
            </Link>
            <Link href="/#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5">
              Features
            </Link>
          </nav>
        </div>
        <form action="/api/auth/signout" method="POST">
          <button className="text-sm text-muted-foreground/85 hover:text-foreground transition-colors">
            Sign out
          </button>
        </form>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-10">
        {/* Welcome */}
        <div className="flex items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="h-4 w-4 text-emerald-400/60" />
              <span className="text-xs font-medium text-emerald-400/70 uppercase tracking-widest">
                Dashboard
              </span>
            </div>
            <h1 className="text-3xl font-bold">Welcome back, {userName}.</h1>
            <p className="text-muted-foreground text-sm mt-1.5 font-light">
              {storeList.length > 0
                ? `${storeList.length} location${storeList.length !== 1 ? 's' : ''} in your portfolio`
                : 'Get started by adding your first location.'}
            </p>
          </div>
          <AddStoreButton />
        </div>

        {/* ── Location grid ────────────────────────────────────────────────── */}
        {storeList.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground/80 uppercase tracking-widest mb-4">
              Your Locations
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {storeList.map((store) => {
                const count = docCountsByStore[store.id] ?? 0
                const isActive = store.id === selectedStoreId
                return (
                  <Link
                    key={store.id}
                    href={`/dashboard?store=${store.id}`}
                    className={`glass-card glass-card-lift rounded-2xl p-5 block transition-all ${
                      isActive ? 'ring-1 ring-emerald-500/40' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3 mb-3">
                      <div
                        className="flex items-center justify-center w-9 h-9 rounded-xl shrink-0"
                        style={{
                          background: isActive
                            ? 'rgba(16,185,129,0.15)'
                            : 'rgba(255,255,255,0.06)',
                          border: isActive
                            ? '1px solid rgba(16,185,129,0.25)'
                            : '1px solid rgba(255,255,255,0.09)',
                        }}
                      >
                        <Building2 className={`h-4 w-4 ${isActive ? 'text-emerald-400' : 'text-muted-foreground'}`} />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-sm truncate">{store.store_name}</p>
                        {store.shopping_center_name && (
                          <p className="text-xs text-muted-foreground/70 truncate mt-0.5 flex items-center gap-1">
                            <MapPin className="h-3 w-3 shrink-0" />
                            {store.shopping_center_name}
                            {store.suite_number && `, Suite ${store.suite_number}`}
                          </p>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground/70">
                      {count === 0
                        ? 'No documents yet'
                        : `${count} document${count !== 1 ? 's' : ''}`}
                    </p>
                  </Link>
                )
              })}
            </div>
          </div>
        )}

        {/* ── Empty state ──────────────────────────────────────────────────── */}
        {storeList.length === 0 && (
          <div className="glass-card rounded-2xl p-12 text-center">
            <div
              className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-5"
              style={{
                background: 'rgba(16,185,129,0.10)',
                border: '1px solid rgba(16,185,129,0.18)',
              }}
            >
              <Building2 className="h-7 w-7 text-emerald-400" />
            </div>
            <p className="font-semibold text-base mb-2">Get started by adding your first location</p>
            <p className="text-sm text-muted-foreground/80 mb-6 font-light max-w-xs mx-auto">
              Each location has its own lease documents and Q&amp;A history.
            </p>
            <AddStoreButton />
          </div>
        )}

        {/* ── Selected location detail ─────────────────────────────────────── */}
        {selectedStore && (
          <>
            {/* Location header */}
            <div className="flex items-center gap-3 pb-1 border-b border-border/30">
              <div
                className="flex items-center justify-center w-9 h-9 rounded-xl shrink-0"
                style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.20)' }}
              >
                <Building2 className="h-4 w-4 text-emerald-400" />
              </div>
              <div>
                <p className="font-semibold text-base">{selectedStore.store_name}</p>
                {selectedStore.shopping_center_name && (
                  <p className="text-xs text-muted-foreground/70 flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {selectedStore.shopping_center_name}
                    {selectedStore.suite_number && `, Suite ${selectedStore.suite_number}`}
                  </p>
                )}
              </div>
            </div>

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
                <Link href={`/upload?store=${selectedStore.id}`}>
                  <Button variant={hasDocuments ? 'outline' : 'default'} size="sm" className="w-full">
                    Upload documents <ArrowRight className="h-3.5 w-3.5 ml-1" />
                  </Button>
                </Link>
              </div>

              <div
                className={`glass-card glass-card-lift rounded-2xl p-6 ${hasDocuments ? 'ring-1 ring-emerald-500/25' : 'opacity-50'}`}
              >
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
                <Link href={`/chat?store=${selectedStore.id}`}>
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
                    const isHealthy = date.days > 90

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
                  {documents!.map((doc) => (
                    <div
                      key={doc.id}
                      className="glass-card rounded-xl px-5 py-4 flex items-center gap-4"
                    >
                      <div
                        className="flex items-center justify-center w-9 h-9 rounded-lg shrink-0"
                        style={{
                          background: 'rgba(16,185,129,0.10)',
                          border: '1px solid rgba(16,185,129,0.15)',
                        }}
                      >
                        <FileText className="h-4 w-4 text-emerald-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {doc.display_name ?? doc.file_name}
                        </p>
                        {doc.display_name && (
                          <p className="text-xs text-muted-foreground/75 truncate mt-0.5">
                            {doc.file_name}
                          </p>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground/70 shrink-0 bg-white/[0.04] px-2 py-1 rounded-md">
                        {DOC_TYPE_LABELS[doc.document_type] ?? doc.document_type.replace(/_/g, ' ')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
