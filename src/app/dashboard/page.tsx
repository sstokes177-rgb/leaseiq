export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase'
import Link from 'next/link'
import {
  Sparkles, Building2, Menu,
} from 'lucide-react'
import { AddStoreButton } from './AddStoreModal'
import { DashboardGrid } from '@/components/DashboardGrid'

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
  if ((profile as any).role === 'property_manager') redirect('/pm-dashboard')

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
              <span className="text-xs font-extrabold text-emerald-400">PV</span>
            </div>
            <span className="font-bold text-base tracking-tight">Provelo</span>
          </Link>
          <nav className="hidden sm:flex items-center gap-1">
            <Link href="/dashboard" className="text-sm text-foreground/90 font-medium px-3 py-1.5 rounded-lg bg-white/[0.06]">
              Dashboard
            </Link>
            <Link href="/settings" className="text-sm text-muted-foreground/70 hover:text-foreground/90 font-medium px-3 py-1.5 rounded-lg hover:bg-white/[0.04] transition-colors">
              Settings
            </Link>
          </nav>
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
            <Link href="/dashboard" className="block px-3 py-2.5 text-sm rounded-lg bg-white/[0.06]">Dashboard</Link>
            <Link href="/settings" className="block px-3 py-2.5 text-sm rounded-lg hover:bg-white/[0.06] transition-colors">Settings</Link>
            <form action="/api/auth/signout" method="POST">
              <button className="w-full text-left px-3 py-2.5 text-sm rounded-lg hover:bg-white/[0.06] text-muted-foreground transition-colors">
                Sign out
              </button>
            </form>
          </div>
        </details>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-10">
        {/* Welcome */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
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

        {/* Location grid with search/filters */}
        {storeList.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground/80 uppercase tracking-widest mb-4">
              Your Locations
            </p>
            <DashboardGrid stores={storesWithCounts} />
          </div>
        )}

        {/* Empty state */}
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
      </main>
    </div>
  )
}
