export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase'
import { OnboardingClient } from './client'

export default async function OnboardingPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('tenant_profiles')
    .select('id')
    .eq('id', user.id)
    .maybeSingle()

  if (profile) redirect('/dashboard')

  return <OnboardingClient userId={user.id} />
}
