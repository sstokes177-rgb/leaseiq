export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { SettingsClient } from './SettingsClient'
import { TeamManagement } from '@/components/TeamManagement'
import { AppLayout } from '@/components/AppLayout'

export default async function SettingsPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <AppLayout>
      <div className="max-w-[640px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-white tracking-tight" style={{ letterSpacing: '-0.025em' }}>Settings</h1>
          <p className="text-sm text-gray-300 mt-1">Manage your account and preferences</p>
        </div>

        <SettingsClient email={user.email ?? ''} />
        <TeamManagement />
      </div>
    </AppLayout>
  )
}
