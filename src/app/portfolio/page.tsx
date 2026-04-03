export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase'
import { PortfolioClient } from './PortfolioClient'

export default async function PortfolioPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  let profile: { company_name: string | null; role: string } | null = null
  try {
    const { data } = await supabase.from('tenant_profiles').select('company_name, role').eq('id', user.id).maybeSingle()
    profile = data
  } catch {
    // gracefully degrade
  }

  if (!profile) redirect('/onboarding')
  if (profile.role === 'property_manager') redirect('/pm-dashboard')

  return <PortfolioClient userName={profile.company_name ?? user.email?.split('@')[0] ?? 'there'} />
}
