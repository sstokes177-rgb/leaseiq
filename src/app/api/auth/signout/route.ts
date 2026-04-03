import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    await supabase.auth.signOut()
    return NextResponse.redirect(new URL('/login', request.url))
  } catch (error) {
    console.error('[Auth] Signout error:', error)
    return NextResponse.json({ error: 'Sign out failed' }, { status: 500 })
  }
}
