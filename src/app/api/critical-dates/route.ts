import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const storeId = new URL(request.url).searchParams.get('store_id')
  if (!storeId) return NextResponse.json({ error: 'store_id required' }, { status: 400 })

  const { data, error } = await supabase
    .from('critical_dates')
    .select('id, date_type, date_value, description, alert_days_before, store_id')
    .eq('tenant_id', user.id)
    .eq('store_id', storeId)
    .not('date_value', 'is', null)
    .order('date_value', { ascending: true })
    .limit(20)

  if (error) return NextResponse.json({ dates: [] })
  return NextResponse.json({ dates: data ?? [] })
}
