export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { UploadPageClient } from './client'

export default async function UploadPage({
  searchParams,
}: {
  searchParams: Promise<{ store?: string }>
}) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const resolvedParams = await searchParams
  const storeIdParam = resolvedParams.store ?? null

  // Fetch profile + stores — use select('*') for resilience against pending migrations
  let profile: { role?: string } | null = null
  let storeList: { id: string; tenant_id: string; store_name: string; shopping_center_name: string | null; suite_number: string | null; address: string | null; created_at: string }[] = []

  try {
    const [profileRes, storesRes] = await Promise.all([
      supabase.from('tenant_profiles').select('*').eq('id', user.id).maybeSingle(),
      supabase.from('stores').select('*').eq('tenant_id', user.id).order('created_at', { ascending: true }),
    ])
    profile = profileRes.data
    storeList = storesRes.data ?? []
  } catch {
    // Network/config error — continue with empty state
  }

  if (!profile) redirect('/onboarding')

  // Resolve which store is active
  const activeStore =
    (storeIdParam ? storeList.find((s) => s.id === storeIdParam) : storeList[0]) ?? null

  return (
    <div className="min-h-screen">
      <header className="glass border-b border-white/[0.07] px-4 sm:px-6 py-4 flex items-center gap-3">
        <Link
          href={activeStore ? `/location/${activeStore.id}` : '/dashboard'}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1 min-w-0">
          <span className="font-semibold">Upload Documents</span>
          {activeStore && (
            <p className="text-xs text-muted-foreground truncate mt-0.5">
              {activeStore.store_name}
              {activeStore.shopping_center_name && ` · ${activeStore.shopping_center_name}`}
              {activeStore.suite_number && `, Suite ${activeStore.suite_number}`}
            </p>
          )}
        </div>
        <Link href="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors shrink-0">
          <div
            className="flex items-center justify-center w-7 h-7 rounded-lg"
            style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.18)' }}
          >
            <span className="text-[10px] font-extrabold text-emerald-400">PV</span>
          </div>
          <span className="hidden sm:block text-sm font-bold tracking-tight text-foreground/80">Provelo</span>
        </Link>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-10 space-y-8">
        <UploadPageClient
          stores={storeList}
          activeStoreId={activeStore?.id ?? null}
          isTenantAdmin={storeList.length > 1}
        />
      </main>
    </div>
  )
}
