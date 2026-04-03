import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const storeId = new URL(request.url).searchParams.get('store_id')

  let query = supabase
    .from('critical_dates')
    .select('id, date_type, date_value, description, alert_days_before, store_id, reminder_days')
    .eq('tenant_id', user.id)
    .not('date_value', 'is', null)
    .order('date_value', { ascending: true })
    .limit(50)

  if (storeId) {
    query = query.eq('store_id', storeId)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ dates: [] })

  // If cross-location, attach store names
  if (!storeId && data && data.length > 0) {
    const storeIds = [...new Set(data.map(d => d.store_id).filter(Boolean))]
    if (storeIds.length > 0) {
      const { data: stores } = await supabase
        .from('stores')
        .select('id, store_name')
        .in('id', storeIds)
      const nameMap: Record<string, string> = {}
      for (const s of stores ?? []) nameMap[s.id] = s.store_name
      const enriched = data.map(d => ({ ...d, store_name: d.store_id ? nameMap[d.store_id] ?? null : null }))
      return NextResponse.json({ dates: enriched })
    }
  }

  return NextResponse.json({ dates: data ?? [] })
}

export async function PATCH(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { id, reminder_days } = body as { id?: string; reminder_days?: number[] }

  if (!id || !Array.isArray(reminder_days)) {
    return NextResponse.json({ error: 'id and reminder_days[] required' }, { status: 400 })
  }

  // Validate values
  const valid = reminder_days.every(d => Number.isInteger(d) && d > 0 && d <= 730)
  if (!valid) {
    return NextResponse.json({ error: 'Invalid reminder_days values' }, { status: 400 })
  }

  const sorted = [...new Set(reminder_days)].sort((a, b) => a - b)

  const { error } = await supabase
    .from('critical_dates')
    .update({ reminder_days: sorted })
    .eq('id', id)
    .eq('tenant_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, reminder_days: sorted })
}
