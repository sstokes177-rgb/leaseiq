import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const documentId = new URL(request.url).searchParams.get('id')
  if (!documentId) return NextResponse.json({ error: 'Document ID required' }, { status: 400 })

  // Verify ownership and get file_path
  const { data: doc } = await supabase
    .from('documents')
    .select('id, file_name, file_path')
    .eq('id', documentId)
    .eq('tenant_id', user.id)
    .maybeSingle()

  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  try {
    const admin = createAdminSupabaseClient()

    const [previewRes, downloadRes] = await Promise.all([
      admin.storage.from('leases').createSignedUrl(doc.file_path, 3600),
      admin.storage.from('leases').createSignedUrl(doc.file_path, 3600, {
        download: doc.file_name,
      }),
    ])

    if (previewRes.error || downloadRes.error) {
      return NextResponse.json({ error: 'Could not generate file URL' }, { status: 500 })
    }

    return NextResponse.json({
      preview_url: previewRes.data.signedUrl,
      download_url: downloadRes.data.signedUrl,
    })
  } catch (error) {
    console.error('[Documents] Signed URL error:', error)
    return NextResponse.json({ error: 'Could not generate file URL' }, { status: 500 })
  }
}
