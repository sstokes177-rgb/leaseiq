'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  FileText, Trash2, Loader2, RefreshCw, Check,
  Eye, Download, X, AlertTriangle,
} from 'lucide-react'
import type { Document } from '@/types'

const typeLabels: Record<string, string> = {
  base_lease: 'Base Lease',
  amendment: 'Amendment',
  commencement_letter: 'Commencement Letter',
  exhibit: 'Exhibit / Addendum',
  side_letter: 'Side Letter',
}

interface DocWithPath extends Document {
  file_path: string
}

interface LeaseDocListProps {
  refreshTrigger?: number
  storeId?: string | null
}

export function LeaseDocList({ refreshTrigger, storeId }: LeaseDocListProps) {
  const [documents, setDocuments] = useState<DocWithPath[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [reprocessingId, setReprocessingId] = useState<string | null>(null)
  const [reprocessedId, setReprocessedId] = useState<string | null>(null)
  const [urlLoadingId, setUrlLoadingId] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewName, setPreviewName] = useState<string>('')
  const [previewNotPdf, setPreviewNotPdf] = useState(false)
  const [showAll, setShowAll] = useState(false)

  const fetchDocuments = async () => {
    setLoading(true)
    const url = storeId ? `/api/documents?store_id=${storeId}` : '/api/documents'
    const res = await fetch(url)
    if (res.ok) {
      const data = await res.json()
      setDocuments(data.documents ?? [])
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchDocuments()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTrigger, storeId])

  const fetchSignedUrls = async (docId: string) => {
    setUrlLoadingId(docId)
    try {
      const res = await fetch(`/api/documents/signed-url?id=${docId}`)
      if (!res.ok) return null
      return await res.json() as { preview_url: string; download_url: string }
    } finally {
      setUrlLoadingId(null)
    }
  }

  const handlePreview = async (doc: DocWithPath) => {
    const isPdf = doc.file_name.toLowerCase().endsWith('.pdf')
    const urls = await fetchSignedUrls(doc.id)
    if (!urls) return
    setPreviewName(doc.display_name ?? doc.file_name)
    setPreviewNotPdf(!isPdf)
    setPreviewUrl(isPdf ? urls.preview_url : urls.download_url)
  }

  const handleDownload = async (doc: DocWithPath) => {
    const urls = await fetchSignedUrls(doc.id)
    if (!urls) return
    const a = document.createElement('a')
    a.href = urls.download_url
    a.download = doc.file_name
    a.click()
  }

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    setConfirmDeleteId(null)
    await fetch(`/api/documents?id=${id}`, { method: 'DELETE' })
    setDocuments((prev) => prev.filter((d) => d.id !== id))
    setDeletingId(null)
    // Fire-and-forget regeneration after delete
    if (storeId) {
      fetch('/api/lease-summary/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ store_id: storeId }),
      }).catch(() => {})
      fetch('/api/obligations/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ store_id: storeId }),
      }).catch(() => {})
    }
  }

  const handleReprocess = async (id: string) => {
    setReprocessingId(id)
    try {
      const res = await fetch('/api/documents/reprocess', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ document_id: id }),
      })
      if (res.ok) {
        setReprocessedId(id)
        setTimeout(() => setReprocessedId(null), 2500)
      }
    } finally {
      setReprocessingId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading documents…
      </div>
    )
  }

  const INITIAL_SHOW = 8

  if (documents.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4">
        No lease documents uploaded yet.
      </p>
    )
  }

  const visibleDocs = showAll ? documents : documents.slice(0, INITIAL_SHOW)
  const hasMore = documents.length > INITIAL_SHOW

  return (
    <>
      <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
        {visibleDocs.map((doc) => {
          const isDeleting = deletingId === doc.id
          const isProcessing = reprocessingId === doc.id
          const isLoadingUrl = urlLoadingId === doc.id
          const isBusy = isDeleting || isProcessing || isLoadingUrl
          const isConfirming = confirmDeleteId === doc.id
          const uploadDate = new Date(doc.uploaded_at).toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric',
          })

          return (
            <div
              key={doc.id}
              className="flex items-start gap-3 p-3 rounded-xl border border-white/[0.08] bg-white/[0.03]"
            >
              <div
                className="flex items-center justify-center w-8 h-8 rounded-lg shrink-0 mt-0.5"
                style={{ background: 'rgba(16,185,129,0.10)', border: '1px solid rgba(16,185,129,0.15)' }}
              >
                <FileText className="h-4 w-4 text-emerald-400" />
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate leading-tight">
                  {doc.display_name ?? doc.file_name}
                </p>
                <div className="flex items-center gap-2 flex-wrap mt-1">
                  {doc.display_name && (
                    <span className="text-[11px] text-muted-foreground/60 truncate max-w-[160px]">
                      {doc.file_name}
                    </span>
                  )}
                  <span className="text-[11px] text-muted-foreground/50">{uploadDate}</span>
                  <span
                    className="text-[11px] px-1.5 py-0.5 rounded border"
                    style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.09)', color: 'rgba(255,255,255,0.55)' }}
                  >
                    {typeLabels[doc.document_type] ?? doc.document_type.replace(/_/g, ' ')}
                  </span>
                </div>
              </div>

              {/* Actions */}
              {isConfirming ? (
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-xs text-muted-foreground/80 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3 text-amber-400" /> Delete?
                  </span>
                  <button
                    onClick={() => handleDelete(doc.id)}
                    className="text-xs font-semibold text-red-400 hover:text-red-300 px-1.5 py-0.5 rounded transition-colors"
                  >
                    Yes
                  </button>
                  <button
                    onClick={() => setConfirmDeleteId(null)}
                    className="text-xs text-muted-foreground/70 hover:text-foreground px-1.5 py-0.5 rounded transition-colors"
                  >
                    No
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-0.5 shrink-0">
                  {/* Preview */}
                  <button
                    onClick={() => handlePreview(doc)}
                    disabled={isBusy}
                    title="Preview document"
                    className="p-1.5 rounded-lg text-muted-foreground/60 hover:text-white/80 hover:bg-white/[0.06] transition-colors disabled:opacity-40"
                  >
                    {isLoadingUrl ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Eye className="h-3.5 w-3.5" />
                    )}
                  </button>

                  {/* Download */}
                  <button
                    onClick={() => handleDownload(doc)}
                    disabled={isBusy}
                    title="Download document"
                    className="p-1.5 rounded-lg text-muted-foreground/60 hover:text-white/80 hover:bg-white/[0.06] transition-colors disabled:opacity-40"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </button>

                  {/* Re-process */}
                  <button
                    onClick={() => handleReprocess(doc.id)}
                    disabled={isBusy}
                    title="Re-process document (rebuild search index)"
                    className="p-1.5 rounded-lg text-muted-foreground/60 hover:text-emerald-400 hover:bg-emerald-500/[0.08] transition-colors disabled:opacity-40"
                  >
                    {isProcessing ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : reprocessedId === doc.id ? (
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                    ) : (
                      <RefreshCw className="h-3.5 w-3.5" />
                    )}
                  </button>

                  {/* Delete */}
                  <button
                    onClick={() => setConfirmDeleteId(doc.id)}
                    disabled={isBusy}
                    title="Delete document"
                    className="p-1.5 rounded-lg text-muted-foreground/60 hover:text-red-400 hover:bg-red-500/[0.08] transition-colors disabled:opacity-40"
                  >
                    {isDeleting ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Show more/less toggle */}
      {hasMore && (
        <button
          onClick={() => setShowAll(prev => !prev)}
          className="w-full text-center text-xs text-emerald-400/80 hover:text-emerald-300 py-2 mt-1 transition-colors"
        >
          {showAll
            ? `Show fewer (${INITIAL_SHOW} of ${documents.length})`
            : `Show all ${documents.length} documents`}
        </button>
      )}

      {/* Preview modal */}
      {previewUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) { setPreviewUrl(null); setPreviewNotPdf(false) } }}
        >
          <div
            className="flex flex-col w-[90vw] h-[85vh] max-w-5xl rounded-2xl overflow-hidden"
            style={{ background: 'rgba(12,14,20,0.98)', border: '1px solid rgba(255,255,255,0.10)' }}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.08] shrink-0">
              <p className="text-sm font-medium truncate max-w-[calc(100%-3rem)]">{previewName}</p>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={() => { setPreviewUrl(null); setPreviewNotPdf(false) }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            {previewNotPdf ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6">
                <FileText className="h-12 w-12 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground/80 text-center">
                  Preview is only available for PDF files.<br />
                  Click Download to view this document.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    window.open(previewUrl, '_blank')
                    setPreviewUrl(null)
                    setPreviewNotPdf(false)
                  }}
                >
                  <Download className="h-3.5 w-3.5 mr-1.5" />
                  Download
                </Button>
              </div>
            ) : (
              <iframe
                src={previewUrl}
                className="flex-1 w-full border-0"
                title={previewName}
              />
            )}
          </div>
        </div>
      )}
    </>
  )
}
