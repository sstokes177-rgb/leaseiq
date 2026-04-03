import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const storeId = new URL(request.url).searchParams.get('store_id')
  if (!storeId) return NextResponse.json({ error: 'store_id required' }, { status: 400 })

  try {
    const { data, error } = await supabase
      .from('lease_summaries')
      .select('*')
      .eq('store_id', storeId)
      .eq('tenant_id', user.id)
      .maybeSingle()

    if (error) {
      console.error('[LeaseSummary] GET error:', error.message)
      return NextResponse.json({ summary: null })
    }

    return NextResponse.json({ summary: data ?? null })
  } catch (error) {
    console.error('[LeaseSummary] GET error:', error)
    return NextResponse.json({ summary: null })
  }
}
