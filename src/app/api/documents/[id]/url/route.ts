import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Verify ownership
  const { data: doc } = await supabase
    .from('documents')
    .select('id, file_name, file_path')
    .eq('id', id)
    .eq('tenant_id', user.id)
    .maybeSingle()

  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  try {
    const admin = createAdminSupabaseClient()
    const { data: urlData, error } = await admin.storage
      .from('leases')
      .createSignedUrl(doc.file_path, 3600)

    if (error || !urlData) {
      return NextResponse.json({ error: 'Could not generate URL' }, { status: 500 })
    }

    return NextResponse.json({
      url: urlData.signedUrl,
      file_name: doc.file_name,
    })
  } catch (error) {
    console.error('[Documents] URL generation error:', error)
    return NextResponse.json({ error: 'Could not generate URL' }, { status: 500 })
  }
}
