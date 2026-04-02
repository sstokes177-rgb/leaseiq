import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { generateCamAnalysis } from '@/lib/camAnalysis'

export const maxDuration = 90

export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const storeId = request.nextUrl.searchParams.get('store_id')
  if (!storeId) return NextResponse.json({ error: 'store_id required' }, { status: 400 })

  try {
    const { data } = await supabase
      .from('cam_analysis')
      .select('*')
      .eq('store_id', storeId)
      .eq('tenant_id', user.id)
      .maybeSingle()

    return NextResponse.json({ analysis: data })
  } catch {
    return NextResponse.json({ analysis: null })
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const storeId = body?.store_id as string | undefined
  if (!storeId) return NextResponse.json({ error: 'store_id required' }, { status: 400 })

  const { data: store } = await supabase
    .from('stores')
    .select('id')
    .eq('id', storeId)
    .eq('tenant_id', user.id)
    .maybeSingle()

  if (!store) return NextResponse.json({ error: 'Store not found' }, { status: 404 })

  const analysisData = await generateCamAnalysis(storeId, user.id)
  if (!analysisData) {
    return NextResponse.json({ error: 'Could not analyze CAM charges — upload lease documents first' }, { status: 422 })
  }

  return NextResponse.json({ success: true, analysis_data: analysisData })
}
