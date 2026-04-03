import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { generateObligationMatrix } from '@/lib/obligationMatrix'
import { isRateLimited } from '@/lib/rateLimit'

export const maxDuration = 90

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (isRateLimited(user.id, 'obligations')) {
    return NextResponse.json({ error: 'Please wait before generating another matrix.' }, { status: 429 })
  }

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

  try {
    const obligations = await generateObligationMatrix(storeId, user.id)
    if (!obligations) {
      return NextResponse.json({
        error: 'No obligation data could be extracted. This may be because: (1) No lease documents have been uploaded yet, (2) The uploaded documents don\'t contain standard lease obligation clauses. Upload your complete lease to enable this feature.',
      }, { status: 422 })
    }

    return NextResponse.json({ success: true, obligations })
  } catch (err) {
    console.error('[Obligations] Generation failed:', err)
    return NextResponse.json({
      error: 'Obligation matrix generation failed. Please try again.',
    }, { status: 500 })
  }
}
