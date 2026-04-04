import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { classifyDocument } from '@/lib/classifyDocument'
import { isRateLimited } from '@/lib/rateLimit'

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (isRateLimited(user.id, 'upload')) {
    return NextResponse.json({ error: 'Too many requests.' }, { status: 429 })
  }

  const body = await request.json()
  const { text } = body

  if (!text || typeof text !== 'string') {
    return NextResponse.json({ error: 'Text is required' }, { status: 400 })
  }

  const classification = await classifyDocument(text)
  return NextResponse.json(classification)
}
