import { NextRequest, NextResponse } from 'next/server'
import { generateText } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: storeId } = await params
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Verify store ownership
  const { data: store } = await supabase
    .from('stores')
    .select('id, store_name')
    .eq('id', storeId)
    .eq('tenant_id', user.id)
    .maybeSingle()

  if (!store) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const admin = createAdminSupabaseClient()

  // Fetch a sample of chunks to determine asset class
  const { data: chunks } = await admin
    .from('document_chunks')
    .select('content, metadata')
    .eq('store_id', storeId)
    .eq('tenant_id', user.id)
    .limit(15)

  if (!chunks || chunks.length === 0) {
    return NextResponse.json({ error: 'No documents found for this location' }, { status: 400 })
  }

  const sampleText = chunks.map(c => c.content).join('\n---\n').slice(0, 8000)

  try {
    const { text } = await generateText({
      model: anthropic('claude-haiku-4-5-20251001'),
      maxOutputTokens: 20,
      messages: [{
        role: 'user',
        content: `Based on these lease document excerpts, what type of commercial property is this? Return ONLY one of these exact values: Retail, Office, Industrial, Mixed-Use, Medical, Restaurant, Grocery, Other\n\n${sampleText}`,
      }],
    })

    const assetClass = text.trim()
    const valid = ['Retail', 'Office', 'Industrial', 'Mixed-Use', 'Medical', 'Restaurant', 'Grocery', 'Other']
    const normalized = valid.find(v => v.toLowerCase() === assetClass.toLowerCase()) ?? 'Other'

    await admin
      .from('stores')
      .update({ asset_class: normalized })
      .eq('id', storeId)

    return NextResponse.json({ asset_class: normalized })
  } catch (err) {
    console.error('[DetectAssetClass] Failed:', err)
    return NextResponse.json({ error: 'Detection failed' }, { status: 500 })
  }
}
