'use client'

import { useState, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { FileText, Trash2, Loader2, RefreshCw, Check } from 'lucide-react'
import type { Document } from '@/types'

const typeLabels: Record<string, string> = {
  base_lease: 'Base Lease',
  amendment: 'Amendment',
  commencement_letter: 'Commencement Letter',
  exhibit: 'Exhibit / Addendum',
  side_letter: 'Side Letter',
}

interface LeaseDocListProps {
  refreshTrigger?: number
  storeId?: string | null
}

export function LeaseDocList({ refreshTrigger, storeId }: LeaseDocListProps) {
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [reprocessingId, setReprocessingId] = useState<string | null>(null)
  const [reprocessedId, setReprocessedId] = useState<string | null>(null)

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

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    await fetch(`/api/documents?id=${id}`, { method: 'DELETE' })
    setDocuments((prev) => prev.filter((d) => d.id !== id))
    setDeletingId(null)
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

  if (documents.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4">
        No lease documents uploaded yet.
      </p>
    )
  }

  return (
    <div className="space-y-2">
      {documents.map((doc) => (
        <div
          key={doc.id}
          className="flex items-center gap-3 p-3 rounded-xl border border-border/60 bg-background/50"
        >
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 shrink-0">
            <FileText className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              {doc.display_name ?? doc.file_name}
            </p>
            {doc.display_name && (
              <p className="text-xs text-muted-foreground truncate">{doc.file_name}</p>
            )}
            {!doc.display_name && (
              <p className="text-xs text-muted-foreground">
                {new Date(doc.uploaded_at).toLocaleDateString()}
              </p>
            )}
          </div>
          <Badge variant="secondary" className="text-xs shrink-0">
            {typeLabels[doc.document_type] ?? doc.document_type}
          </Badge>

          {/* Re-process button */}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0 text-muted-foreground hover:text-emerald-400 transition-colors"
            onClick={() => handleReprocess(doc.id)}
            disabled={reprocessingId === doc.id || deletingId === doc.id}
            title="Re-process document (rebuild search index)"
            aria-label="Re-process document"
          >
            {reprocessingId === doc.id ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : reprocessedId === doc.id ? (
              <Check className="h-3.5 w-3.5 text-emerald-400" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
          </Button>

          {/* Delete button */}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
            onClick={() => handleDelete(doc.id)}
            disabled={deletingId === doc.id || reprocessingId === doc.id}
            aria-label="Delete document"
          >
            {deletingId === doc.id ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Trash2 className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
      ))}
    </div>
  )
}
