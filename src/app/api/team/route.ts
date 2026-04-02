import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase'

export async function GET() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminSupabaseClient()
  const { data, error } = await admin
    .from('team_invitations')
    .select('*')
    .eq('tenant_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ invitations: [] })
  return NextResponse.json({ invitations: data ?? [] })
}

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const { email, role } = body
  if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 })

  const validRoles = ['admin', 'member', 'viewer']
  const inviteRole = validRoles.includes(role) ? role : 'member'

  const admin = createAdminSupabaseClient()

  // Check for existing invitation to this email
  const { data: existing } = await admin
    .from('team_invitations')
    .select('id, status')
    .eq('tenant_id', user.id)
    .eq('email', email.toLowerCase())
    .in('status', ['pending', 'accepted'])
    .maybeSingle()

  if (existing) {
    return NextResponse.json({
      error: existing.status === 'accepted'
        ? 'This person is already on your team'
        : 'An invitation is already pending for this email',
    }, { status: 409 })
  }

  const { error } = await admin.from('team_invitations').insert({
    tenant_id: user.id,
    email: email.toLowerCase(),
    role: inviteRole,
  })

  if (error) {
    return NextResponse.json({ error: 'Failed to send invitation' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

export async function DELETE(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const id = new URL(request.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const admin = createAdminSupabaseClient()
  await admin
    .from('team_invitations')
    .update({ status: 'revoked' })
    .eq('id', id)
    .eq('tenant_id', user.id)

  return NextResponse.json({ success: true })
}
