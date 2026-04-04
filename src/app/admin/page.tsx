// To grant yourself super_admin access, run this SQL in Supabase:
// UPDATE tenant_profiles SET role = 'super_admin' WHERE id = 'YOUR_USER_ID';

export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase'
import { AppLayout } from '@/components/AppLayout'
import { AdminDashboardClient } from './AdminDashboardClient'

export default async function AdminPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('tenant_profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (profile?.role !== 'super_admin') {
    redirect('/dashboard')
  }

  return (
    <AppLayout>
      <AdminDashboardClient />
    </AppLayout>
  )
}
