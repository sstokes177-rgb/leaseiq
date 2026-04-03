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
      .from('obligation_matrices')
      .select('*')
      .eq('store_id', storeId)
      .eq('tenant_id', user.id)
      .maybeSingle()

    if (error) {
      return NextResponse.json({ matrix: null })
    }

    return NextResponse.json({ matrix: data ?? null })
  } catch (error) {
    console.error('[Obligations] GET error:', error)
    return NextResponse.json({ matrix: null })
  }
}
