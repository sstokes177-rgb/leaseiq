export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase'
import Link from 'next/link'
import { FileText, ArrowLeft } from 'lucide-react'
import { SettingsClient } from './SettingsClient'
import { TeamManagement } from '@/components/TeamManagement'

export default async function SettingsPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

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
        <Link href="/dashboard" className="text-sm text-muted-foreground/85 hover:text-foreground transition-colors">
          Dashboard
        </Link>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-10 space-y-8">
        <div>
          <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground/70 hover:text-foreground transition-colors mb-4">
            <ArrowLeft className="h-3 w-3" /> Dashboard
          </Link>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-sm text-muted-foreground/70 mt-1">Manage your account and preferences</p>
        </div>

        <SettingsClient email={user.email ?? ''} />
        <TeamManagement />
      </main>
    </div>
  )
}
