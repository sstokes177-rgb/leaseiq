import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase'

export async function GET() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { data } = await supabase
      .from('team_invitations')
      .select('*')
      .eq('tenant_id', user.id)
      .order('created_at', { ascending: false })

    return NextResponse.json({ invitations: data ?? [] })
  } catch {
    return NextResponse.json({ invitations: [] })
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const email = (body?.email as string)?.trim().toLowerCase()
  const role = body?.role as string

  if (!email || !role) {
    return NextResponse.json({ error: 'email and role required' }, { status: 400 })
  }

  if (!['admin', 'member', 'viewer'].includes(role)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
  }

  // Basic email validation
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Invalid email' }, { status: 400 })
  }

  const admin = createAdminSupabaseClient()

  // Check for existing invitation
  const { data: existing } = await admin
    .from('team_invitations')
    .select('id, status')
    .eq('tenant_id', user.id)
    .eq('email', email)
    .eq('status', 'pending')
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ error: 'Invitation already pending for this email' }, { status: 409 })
  }

  const { error } = await admin.from('team_invitations').insert({
    tenant_id: user.id,
    email,
    role,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

export async function DELETE(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const id = request.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const admin = createAdminSupabaseClient()
  const { error } = await admin
    .from('team_invitations')
    .update({ status: 'revoked' })
    .eq('id', id)
    .eq('tenant_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
