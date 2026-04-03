export const dynamic = 'force-dynamic'

import { redirect, notFound } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import {
  MessageSquare, Upload, FileText, ArrowRight, ArrowLeft,
  MapPin, Building2, Menu,
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
import { CriticalDatesCard } from '@/components/CriticalDatesCard'
import { RiskScoreCard } from '@/components/RiskScoreCard'

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

  try {
    const docsRes = await supabase
      .from('documents')
      .select('id, file_name, document_type, display_name, store_id, uploaded_at')
      .eq('tenant_id', user.id)
      .eq('store_id', id)
      .order('uploaded_at', { ascending: false })
      .limit(5)
    documents = docsRes.data ?? []
  } catch {
    // Gracefully degrade
  }

  const hasDocuments = documents.length > 0

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
            <span className="text-xs font-extrabold text-emerald-400">PV</span>
          </div>
          <span className="font-bold text-base tracking-tight">Provelo</span>
        </div>
        <form action="/api/auth/signout" method="POST" className="hidden sm:block">
          <button className="text-sm text-muted-foreground/85 hover:text-foreground transition-colors">
            Sign out
          </button>
        </form>
        {/* Mobile hamburger menu */}
        <details className="sm:hidden relative">
          <summary className="list-none cursor-pointer p-2 text-muted-foreground">
            <Menu className="h-5 w-5" />
          </summary>
          <div className="absolute right-0 top-full mt-1 w-44 rounded-xl glass-card p-2 z-50">
            <Link href="/dashboard" className="block px-3 py-2.5 text-sm rounded-lg hover:bg-white/[0.06] transition-colors">Dashboard</Link>
            <Link href="/settings" className="block px-3 py-2.5 text-sm rounded-lg hover:bg-white/[0.06] transition-colors">Settings</Link>
            <form action="/api/auth/signout" method="POST">
              <button className="w-full text-left px-3 py-2.5 text-sm rounded-lg hover:bg-white/[0.06] text-muted-foreground transition-colors">
                Sign out
              </button>
            </form>
          </div>
        </details>
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

        {/* Primary action buttons — always visible at top */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Link href={`/chat?store=${id}`} className="sm:w-[250px]">
            <Button
              size="lg"
              className="w-full h-14 text-base font-semibold gap-2.5 text-white"
              style={{
                background: hasDocuments
                  ? 'linear-gradient(135deg, rgba(16,185,129,0.9), rgba(13,148,136,0.9))'
                  : undefined,
                border: hasDocuments ? '1px solid rgba(16,185,129,0.3)' : undefined,
              }}
              disabled={!hasDocuments}
            >
              <MessageSquare className="h-5 w-5" />
              {hasDocuments ? 'Ask Your Lease' : 'Upload a lease first'}
              {hasDocuments && <ArrowRight className="h-4 w-4 ml-1" />}
            </Button>
          </Link>
          <Link href={`/upload?store=${id}`} className="sm:w-[250px]">
            <Button
              variant="outline"
              size="lg"
              className="w-full h-14 text-base font-semibold gap-2.5 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300"
            >
              <Upload className="h-5 w-5" />
              Upload Documents
            </Button>
          </Link>
        </div>

        {/* Lease Summary */}
        {hasDocuments && <LeaseSummaryCard storeId={id} storeName={store.store_name} />}

        {/* Risk Score */}
        {hasDocuments && <RiskScoreCard storeId={id} />}

        {/* Obligation Matrix */}
        {hasDocuments && <ObligationMatrixCard storeId={id} storeName={store.store_name} />}

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

        {/* Critical Dates */}
        {hasDocuments && <CriticalDatesCard storeId={id} />}

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
