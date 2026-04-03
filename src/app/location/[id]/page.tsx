export const dynamic = 'force-dynamic'

import { redirect, notFound } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import {
  MessageSquare, Upload, ArrowLeft,
  MapPin, Building2,
} from 'lucide-react'
import { AppLayout } from '@/components/AppLayout'
import { LocationTabs } from '@/components/LocationTabs'

export default async function LocationPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Verify store belongs to this user
  const { data: store } = await supabase
    .from('stores')
    .select('*')
    .eq('id', id)
    .eq('tenant_id', user.id)
    .maybeSingle()

  if (!store) notFound()

  let documents: { id: string; file_name: string; document_type: string; display_name: string | null; store_id: string | null; uploaded_at: string }[] = []

  try {
    const docsRes = await supabase
      .from('documents')
      .select('id, file_name, document_type, display_name, store_id, uploaded_at')
      .eq('tenant_id', user.id)
      .eq('store_id', id)
      .order('uploaded_at', { ascending: false })
      .limit(5)
    documents = docsRes.data ?? []
  } catch {
    // Gracefully degrade
  }

  const hasDocuments = documents.length > 0

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-3">
        {/* Location header */}
        <div>
          <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors mb-3">
            <ArrowLeft className="h-3 w-3" /> All locations
          </Link>
          <div className="flex items-center gap-3">
            <div
              className="flex items-center justify-center w-10 h-10 rounded-xl shrink-0"
              style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.20)' }}
            >
              <Building2 className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-white tracking-tight">{store.store_name}</h1>
              {store.shopping_center_name && (
                <p className="text-sm text-gray-400 flex items-center gap-1 mt-0.5">
                  <MapPin className="h-3.5 w-3.5" />
                  {store.shopping_center_name}
                  {store.suite_number && `, Suite ${store.suite_number}`}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Primary action buttons */}
        <div className="flex flex-wrap gap-3">
          <Link href={`/chat?store=${id}`}>
            <Button
              className="gap-2 text-white px-5 py-2.5 text-sm font-medium"
              disabled={!hasDocuments}
            >
              <MessageSquare className="h-4 w-4" />
              {hasDocuments ? 'Ask Your Lease' : 'Upload a lease first'}
            </Button>
          </Link>
          <Link href={`/upload?store=${id}`}>
            <Button
              variant="outline"
              className="gap-2 px-5 py-2.5 text-sm font-medium"
            >
              <Upload className="h-4 w-4" />
              Upload Documents
            </Button>
          </Link>
        </div>

        {/* Tabbed content */}
        <LocationTabs
          storeId={id}
          storeName={store.store_name}
          hasDocuments={hasDocuments}
          documents={documents}
        />

        {/* No documents yet — empty state */}
        {!hasDocuments && (
          <div className="flex items-center justify-center min-h-[50vh]">
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-10 text-center max-w-lg w-full">
              <div className="mb-5">
                <Upload className="h-12 w-12 text-emerald-400/30 mx-auto" />
              </div>
              <p className="font-semibold text-white text-lg tracking-tight mb-2">Upload your lease to unlock AI intelligence</p>
              <p className="text-sm text-gray-300 mb-6 max-w-sm mx-auto">
                Supported: PDF files. Upload your base lease, amendments, exhibits, and any other lease documents.
              </p>
              <Link href={`/upload?store=${id}`}>
                <Button className="gap-2 text-white px-5 py-2.5 text-sm font-medium">
                  <Upload className="h-4 w-4" />
                  Upload Documents
                </Button>
              </Link>
              <p className="text-xs text-gray-500 mt-5 max-w-xs mx-auto leading-relaxed">
                Your documents are processed securely and encrypted at rest.
              </p>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
