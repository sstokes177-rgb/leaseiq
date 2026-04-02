import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const storeId = new URL(request.url).searchParams.get('store_id')

  let query = supabase
    .from('conversations')
    .select('id, title, created_at, updated_at, store_id')
    .eq('tenant_id', user.id)
    .order('updated_at', { ascending: false })
    .limit(30)

  if (storeId) {
    query = query.eq('store_id', storeId)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ conversations: [] })
  return NextResponse.json({ conversations: data ?? [] })
}

export async function PATCH(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const { id, title } = body as { id?: string; title?: string }
  if (!id || !title?.trim()) return NextResponse.json({ error: 'id and title required' }, { status: 400 })

  const { error } = await supabase
    .from('conversations')
    .update({ title: title.trim() })
    .eq('id', id)
    .eq('tenant_id', user.id)

  if (error) {
    console.error('[Conversations] PATCH error:', error.message)
    return NextResponse.json({ error: 'Failed to update conversation' }, { status: 500 })
  }
  return NextResponse.json({ success: true })
}

export async function DELETE(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const id = new URL(request.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const { error } = await supabase
    .from('conversations')
    .delete()
    .eq('id', id)
    .eq('tenant_id', user.id)

  if (error) {
    console.error('[Conversations] DELETE error:', error.message)
    return NextResponse.json({ error: 'Failed to delete conversation' }, { status: 500 })
  }
  return NextResponse.json({ success: true })
}
