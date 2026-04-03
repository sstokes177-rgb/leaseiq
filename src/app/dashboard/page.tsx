export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase'
import Link from 'next/link'
import {
  Sparkles, Building2,
} from 'lucide-react'
import { AddStoreButton } from './AddStoreModal'
import { DashboardGrid } from '@/components/DashboardGrid'
import { NotificationCenter } from '@/components/NotificationCenter'
import { DashboardOnboarding } from './DashboardOnboarding'
import { CrossLocationDates } from '@/components/CrossLocationDates'
import { AppLayout } from '@/components/AppLayout'

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  let profile: { company_name: string | null } | null = null
  let stores: {
    id: string; store_name: string; shopping_center_name: string | null;
    suite_number: string | null; address: string | null;
    asset_class: string | null; created_at: string
  }[] | null = null
  let storeCountRows: { store_id: string | null }[] | null = null
  let leaseSummaries: { store_id: string; summary_data: { lease_end_date?: string | null } }[] = []

  try {
    const [profileRes, storesRes, countsRes] = await Promise.all([
      supabase.from('tenant_profiles').select('*').eq('id', user.id).maybeSingle(),
      supabase.from('stores').select('id, store_name, shopping_center_name, suite_number, address, asset_class, created_at').eq('tenant_id', user.id).order('created_at', { ascending: true }),
      supabase.from('documents').select('store_id').eq('tenant_id', user.id).not('store_id', 'is', null),
    ])
    profile = profileRes.data
    stores = storesRes.data
    storeCountRows = countsRes.data

    // lease_summaries table may not exist yet — gracefully degrade
    try {
      const summaryRes = await supabase.from('lease_summaries').select('store_id, summary_data').eq('tenant_id', user.id)
      if (summaryRes.data) {
        leaseSummaries = summaryRes.data as typeof leaseSummaries
      }
    } catch {
      // Table doesn't exist yet
    }
  } catch {
    // Gracefully degrade
  }

  if (!profile) redirect('/onboarding')
  const userName = profile.company_name ?? user.email?.split('@')[0] ?? 'there'
  const storeList = stores ?? []

  const docCountsByStore: Record<string, number> = {}
  if (storeCountRows) {
    for (const row of storeCountRows) {
      if (row.store_id) {
        docCountsByStore[row.store_id] = (docCountsByStore[row.store_id] ?? 0) + 1
      }
    }
  }

  const expiryByStore: Record<string, string | null> = {}
  if (leaseSummaries.length > 0) {
    for (const ls of leaseSummaries) {
      const endDate = ls.summary_data?.lease_end_date
      if (endDate) expiryByStore[ls.store_id] = endDate
    }
  }

  const storesWithCounts = storeList.map(store => ({
    ...store,
    asset_class: store.asset_class ?? null,
    doc_count: docCountsByStore[store.id] ?? 0,
    lease_expiry: expiryByStore[store.id] ?? null,
  }))

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8 sm:space-y-10">
        {/* Top bar with notification + sign out (desktop) */}
        <div className="hidden lg:flex items-center justify-end gap-3 -mt-4 mb-2">
          <span data-tour-step="4"><NotificationCenter /></span>
          <form action="/api/auth/signout" method="POST">
            <button className="text-sm text-gray-500 hover:text-white transition-colors">
              Sign out
            </button>
          </form>
        </div>

        {/* Welcome */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="h-4 w-4 text-emerald-400/60" />
              <span className="text-xs font-medium text-emerald-400/70 uppercase tracking-widest">
                Dashboard
              </span>
            </div>
            <h1 className="text-3xl font-semibold text-white tracking-tight" style={{ letterSpacing: '-0.025em' }}>Welcome back, {userName}.</h1>
            <p className="text-gray-300 text-sm mt-1.5">
              {storeList.length > 0
                ? `${storeList.length} location${storeList.length !== 1 ? 's' : ''} in your portfolio`
                : 'Get started by adding your first location.'}
            </p>
          </div>
          <span data-tour-step="3"><AddStoreButton /></span>
        </div>

        {/* Onboarding checklist + Welcome tour */}
        <DashboardOnboarding firstStoreId={storeList[0]?.id ?? null} />

        {/* Location grid with search/filters */}
        {storeList.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4">
              Your Locations
            </p>
            <DashboardGrid stores={storesWithCounts} />
          </div>
        )}

        {/* Cross-location critical dates */}
        {storeList.length > 0 && <CrossLocationDates />}

        {/* Empty state */}
        {storeList.length === 0 && (
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-sm p-12 text-center">
            <div className="mb-6">
              <svg className="mx-auto h-20 w-20 text-emerald-400/30" fill="none" viewBox="0 0 80 80" stroke="currentColor" strokeWidth="1.5">
                <rect x="10" y="30" width="25" height="40" rx="2" />
                <rect x="45" y="15" width="25" height="55" rx="2" />
                <path d="M22 42h8M22 50h8M22 58h8M57 27h8M57 35h8M57 43h8M57 51h8M57 59h8" strokeLinecap="round" />
                <path d="M35 65h10" strokeDasharray="3 3" />
              </svg>
            </div>
            <p className="font-semibold text-white text-xl tracking-tight mb-2">Welcome to Provelo!</p>
            <p className="text-sm text-gray-300 mb-6 max-w-sm mx-auto">
              Add your first commercial location to get started with AI-powered lease intelligence.
            </p>
            <AddStoreButton />
            <p className="text-xs text-gray-500 mt-6 max-w-xs mx-auto leading-relaxed">
              Provelo helps you understand your lease, catch billing errors, and never miss a critical date.
            </p>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
