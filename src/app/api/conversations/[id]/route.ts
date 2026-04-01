import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Verify conversation belongs to user
  const { data: conv } = await supabase
    .from('conversations')
    .select('id, title, store_id')
    .eq('id', id)
    .eq('tenant_id', user.id)
    .maybeSingle()

  if (!conv) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: messages } = await supabase
    .from('messages')
    .select('id, role, content, citations, created_at')
    .eq('conversation_id', id)
    .order('created_at', { ascending: true })

  return NextResponse.json({ conversation: conv, messages: messages ?? [] })
}
