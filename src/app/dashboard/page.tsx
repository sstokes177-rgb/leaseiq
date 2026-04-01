export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase'
import Link from 'next/link'
import {
  FileText, Sparkles, Building2, MapPin,
} from 'lucide-react'
import { AddStoreButton } from './AddStoreModal'

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  let profile: { company_name: string | null } | null = null
  let stores: { id: string; store_name: string; shopping_center_name: string | null; suite_number: string | null; created_at: string }[] | null = null
  let storeCountRows: { store_id: string | null }[] | null = null

  try {
    const [profileRes, storesRes, countsRes] = await Promise.all([
      supabase.from('tenant_profiles').select('*').eq('id', user.id).maybeSingle(),
      supabase.from('stores').select('*').eq('tenant_id', user.id).order('created_at', { ascending: true }),
      supabase.from('documents').select('store_id').eq('tenant_id', user.id).not('store_id', 'is', null),
    ])
    profile = profileRes.data
    stores = storesRes.data
    storeCountRows = countsRes.data
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

        {/* Location grid */}
        {storeList.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground/80 uppercase tracking-widest mb-4">
              Your Locations
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {storeList.map((store) => {
                const count = docCountsByStore[store.id] ?? 0
                return (
                  <Link
                    key={store.id}
                    href={`/location/${store.id}`}
                    className="glass-card glass-card-lift rounded-2xl p-5 block transition-all"
                  >
                    <div className="flex items-start gap-3 mb-3">
                      <div
                        className="flex items-center justify-center w-9 h-9 rounded-xl shrink-0"
                        style={{
                          background: 'rgba(255,255,255,0.06)',
                          border: '1px solid rgba(255,255,255,0.09)',
                        }}
                      >
                        <Building2 className="h-4 w-4 text-muted-foreground" />
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
