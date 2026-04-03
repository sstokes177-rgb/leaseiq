'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { BatchFileUpload } from '@/components/BatchFileUpload'
import { LeaseDocList } from '@/components/LeaseDocList'
import Link from 'next/link'
import { MessageSquare, Upload, FileText, ChevronDown } from 'lucide-react'
import type { Store } from '@/types'

interface UploadPageClientProps {
  stores: Store[]
  activeStoreId: string | null
  isTenantAdmin: boolean
}

export function UploadPageClient({ stores, activeStoreId, isTenantAdmin }: UploadPageClientProps) {
  const [currentStoreId, setCurrentStoreId] = useState<string | null>(activeStoreId)
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const router = useRouter()

  useEffect(() => {
    setCurrentStoreId(activeStoreId)
  }, [activeStoreId])

  const handleStoreChange = useCallback((storeId: string) => {
    setCurrentStoreId(storeId)
    router.push(`/upload?store=${storeId}`)
  }, [router])

  const handleChangeStore = useCallback(() => {
    document.getElementById('store-selector')?.focus()
  }, [])

  const handleUploadComplete = useCallback(() => {
    setRefreshTrigger((n) => n + 1)
    // Fire-and-forget: trigger summary and obligation matrix generation
    if (currentStoreId) {
      const body = JSON.stringify({ store_id: currentStoreId })
      const headers = { 'Content-Type': 'application/json' }
      fetch('/api/lease-summary/generate', { method: 'POST', headers, body }).catch(() => null)
      fetch('/api/obligations/generate', { method: 'POST', headers, body }).catch(() => null)
    }
  }, [currentStoreId])

  const activeStore = stores.find((s) => s.id === currentStoreId) ?? stores[0] ?? null

  return (
    <div className="space-y-6">
      {/* Store selector for tenant_admin with multiple stores */}
      {isTenantAdmin && stores.length > 1 && (
        <div className="glass-card p-5">
          <label className="text-xs font-medium text-muted-foreground/90 mb-2 block">
            Uploading to store
          </label>
          <div className="relative">
            <select
              id="store-selector"
              value={currentStoreId ?? ''}
              onChange={(e) => handleStoreChange(e.target.value)}
              className="w-full rounded-xl px-4 py-2.5 text-sm appearance-none focus:outline-none pr-10 cursor-pointer"
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.09)',
              }}
            >
              {stores.map((store) => (
                <option key={store.id} value={store.id} style={{ background: '#0c0e14' }}>
                  {store.store_name}
                  {store.shopping_center_name ? ` — ${store.shopping_center_name}` : ''}
                  {store.suite_number ? `, Suite ${store.suite_number}` : ''}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          </div>
        </div>
      )}

      {/* Upload area */}
      <div className="glass-card p-6">
        <div className="flex items-center gap-3 mb-5">
          <div
            className="flex items-center justify-center w-9 h-9 rounded-xl shrink-0"
            style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.18)' }}
          >
            <Upload className="h-4 w-4 text-emerald-400" />
          </div>
          <div>
            <h2 className="font-semibold text-sm">Upload Lease Documents</h2>
            <p className="text-xs text-muted-foreground/90">PDF, Word (.doc, .docx) · Multiple files supported</p>
          </div>
        </div>
        <BatchFileUpload
          storeId={currentStoreId}
          onUploadComplete={handleUploadComplete}
          onChangeStore={isTenantAdmin && stores.length > 1 ? handleChangeStore : undefined}
        />
      </div>

      {/* Document list for this store */}
      <div className="glass-card p-6">
        <div className="flex items-center gap-3 mb-5">
          <div
            className="flex items-center justify-center w-9 h-9 rounded-xl shrink-0"
            style={{ background: 'rgba(20,184,166,0.12)', border: '1px solid rgba(20,184,166,0.18)' }}
          >
            <FileText className="h-4 w-4 text-teal-400" />
          </div>
          <div>
            <h2 className="font-semibold text-sm">Documents for This Store</h2>
            <p className="text-xs text-muted-foreground/90">Processed and indexed</p>
          </div>
        </div>
        <LeaseDocList refreshTrigger={refreshTrigger} storeId={currentStoreId} />
      </div>

      {/* CTA to chat */}
      <div className="text-center pt-2">
        <Link href={activeStore ? `/chat?store=${activeStore.id}` : '/chat'}>
          <Button className="gap-2 px-6 h-11 w-full sm:w-auto">
            <MessageSquare className="h-4 w-4" />
            Ask questions about this store
          </Button>
        </Link>
      </div>
    </div>
  )
}
