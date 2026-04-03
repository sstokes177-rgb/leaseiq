import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'

export async function GET() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { data: stores, error } = await supabase
      .from('stores')
      .select('*')
      .eq('tenant_id', user.id)
      .order('created_at', { ascending: true })
      .limit(100)

    if (error) {
      console.error('[Stores] GET error:', error.message)
      return NextResponse.json({ error: 'Failed to fetch stores' }, { status: 500 })
    }

    return NextResponse.json({ stores })
  } catch (error) {
    console.error('[Stores] GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch stores' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const { store_name, shopping_center_name, suite_number, address, asset_class } = body

  if (!store_name?.trim()) {
    return NextResponse.json({ error: 'Store name is required' }, { status: 400 })
  }

  const { data: store, error } = await supabase
    .from('stores')
    .insert({
      tenant_id: user.id,
      store_name: store_name.trim(),
      shopping_center_name: shopping_center_name?.trim() || null,
      suite_number: suite_number?.trim() || null,
      address: address?.trim() || null,
      asset_class: asset_class?.trim() || null,
    })
    .select()
    .single()

  if (error) {
    console.error('[Stores] POST error:', error.message)
    return NextResponse.json({ error: 'Failed to create store' }, { status: 500 })
  }

  return NextResponse.json({ store })
}

export async function DELETE(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const storeId = searchParams.get('id')

  if (!storeId) {
    return NextResponse.json({ error: 'Store ID required' }, { status: 400 })
  }

  const { error } = await supabase
    .from('stores')
    .delete()
    .eq('id', storeId)
    .eq('tenant_id', user.id)

  if (error) {
    console.error('[Stores] DELETE error:', error.message)
    return NextResponse.json({ error: 'Failed to delete store' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
