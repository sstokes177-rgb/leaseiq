import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { generateLeaseSummary } from '@/lib/leaseSummary'

export const maxDuration = 90

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const storeId = body?.store_id as string | undefined
  if (!storeId) return NextResponse.json({ error: 'store_id required' }, { status: 400 })

  // Verify store belongs to this user
  const { data: store } = await supabase
    .from('stores')
    .select('id')
    .eq('id', storeId)
    .eq('tenant_id', user.id)
    .maybeSingle()

  if (!store) return NextResponse.json({ error: 'Store not found' }, { status: 404 })

  const summaryData = await generateLeaseSummary(storeId, user.id)
  if (!summaryData) {
    return NextResponse.json({ error: 'Could not generate summary — upload lease documents first' }, { status: 422 })
  }

  return NextResponse.json({ success: true, summary_data: summaryData })
}
