import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase'

export async function GET() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { data: profile } = await supabase
      .from('tenant_profiles')
      .select('company_name, role, language_preference, notification_prefs, display_theme')
      .eq('id', user.id)
      .maybeSingle()

    return NextResponse.json({
      profile: profile ?? null,
      email: user.email ?? '',
    })
  } catch {
    return NextResponse.json({ profile: null, email: user.email })
  }
}

export async function PUT(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const admin = createAdminSupabaseClient()

  const updates: Record<string, unknown> = {}
  if (body.company_name !== undefined) updates.company_name = body.company_name
  if (body.language_preference !== undefined) updates.language_preference = body.language_preference
  if (body.notification_prefs !== undefined) updates.notification_prefs = body.notification_prefs
  if (body.display_theme !== undefined) updates.display_theme = body.display_theme

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
  }

  updates.updated_at = new Date().toISOString()

  const { error } = await admin
    .from('tenant_profiles')
    .update(updates)
    .eq('id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
