export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase'
import Link from 'next/link'
import { FileText, Building2 } from 'lucide-react'
import { PMDashboardClient } from './client'

export default async function PMDashboardPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('tenant_profiles')
    .select('role, company_name')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile) redirect('/onboarding')
  if (profile.role !== 'property_manager') redirect('/dashboard')

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="glass border-b border-white/[0.07] px-4 sm:px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-5">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="flex items-center justify-center w-8 h-8 rounded-xl transition-opacity group-hover:opacity-80"
              style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.25), rgba(20,184,166,0.15))', border: '1px solid rgba(16,185,129,0.2)' }}>
              <FileText className="h-4 w-4 text-emerald-400" />
            </div>
            <span className="font-bold text-base tracking-tight">ClauseIQ</span>
          </Link>
          <nav className="hidden sm:flex items-center gap-1">
            <span className="text-sm text-foreground/90 font-medium px-3 py-1.5 rounded-lg bg-white/[0.06]">
              PM Dashboard
            </span>
            <Link href="/settings" className="text-sm text-muted-foreground/70 hover:text-foreground/90 font-medium px-3 py-1.5 rounded-lg hover:bg-white/[0.04] transition-colors">
              Settings
            </Link>
          </nav>
        </div>
        <form action="/api/auth/signout" method="POST">
          <button className="text-sm text-muted-foreground/85 hover:text-foreground transition-colors">Sign out</button>
        </form>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-12 space-y-10">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Building2 className="h-4 w-4 text-emerald-400/60" />
            <span className="text-xs font-medium text-emerald-400/70 uppercase tracking-widest">
              Property Manager
            </span>
          </div>
          <h1 className="text-3xl font-bold">
            {profile.company_name ? `${profile.company_name} Dashboard` : 'PM Dashboard'}
          </h1>
          <p className="text-muted-foreground text-sm mt-1.5 font-light">
            Manage your properties and tenant adoption
          </p>
        </div>

        <PMDashboardClient />
      </main>
    </div>
  )
}
