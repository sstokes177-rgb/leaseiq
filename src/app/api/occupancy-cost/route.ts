import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const storeId = request.nextUrl.searchParams.get('store_id')
  if (!storeId) return NextResponse.json({ error: 'store_id required' }, { status: 400 })

  // Verify store ownership
  const { data: store } = await supabase
    .from('stores')
    .select('id')
    .eq('id', storeId)
    .eq('tenant_id', user.id)
    .maybeSingle()
  if (!store) return NextResponse.json({ error: 'Store not found' }, { status: 404 })

  const admin = createAdminSupabaseClient()

  try {
    const [summaryRes, camRes, overridesRes, pctRentRes] = await Promise.all([
      admin.from('lease_summaries').select('summary_data').eq('store_id', storeId).eq('tenant_id', user.id).maybeSingle(),
      admin.from('cam_analysis').select('analysis_data').eq('store_id', storeId).eq('tenant_id', user.id).maybeSingle(),
      admin.from('occupancy_cost_overrides').select('*').eq('store_id', storeId).eq('tenant_id', user.id).maybeSingle(),
      admin.from('percentage_rent_entries').select('gross_sales').eq('store_id', storeId).eq('tenant_id', user.id),
    ])

    return NextResponse.json({
      summary: summaryRes.data?.summary_data ?? null,
      cam: camRes.data?.analysis_data ?? null,
      overrides: overridesRes.data ?? null,
      total_sales: (pctRentRes.data ?? []).reduce((sum: number, e: { gross_sales: number }) => sum + Number(e.gross_sales), 0),
    })
  } catch {
    return NextResponse.json({ summary: null, cam: null, overrides: null, total_sales: 0 })
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const storeId = body?.store_id as string | undefined
  if (!storeId) return NextResponse.json({ error: 'store_id required' }, { status: 400 })

  // Verify store ownership
  const { data: store } = await supabase
    .from('stores').select('id').eq('id', storeId).eq('tenant_id', user.id).maybeSingle()
  if (!store) return NextResponse.json({ error: 'Store not found' }, { status: 404 })

  const admin = createAdminSupabaseClient()

  const { error } = await admin.from('occupancy_cost_overrides').upsert(
    {
      store_id: storeId,
      tenant_id: user.id,
      insurance_monthly: body.insurance_monthly ?? null,
      tax_monthly: body.tax_monthly ?? null,
      other_monthly: body.other_monthly ?? null,
      other_label: body.other_label ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'store_id,tenant_id' }
  )

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
