export const dynamic = 'force-dynamic'

import { createServerSupabaseClient } from '@/lib/supabase'
import { LandingPage } from '@/components/LandingPage'

export default async function HomePage() {
  let isAuthenticated = false
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    isAuthenticated = !!user
  } catch {
    // If auth check fails, show landing page as unauthenticated
  }
  return <LandingPage isAuthenticated={isAuthenticated} />
}
