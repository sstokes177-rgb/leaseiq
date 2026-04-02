'use client'

import { useState } from 'react'
import { FileText, Eye, Loader2 } from 'lucide-react'

interface DocumentListItemProps {
  doc: {
    id: string
    file_name: string
    display_name: string | null
    document_type: string
  }
}

const DOC_TYPE_LABELS: Record<string, string> = {
  base_lease: 'Base Lease',
  amendment: 'Amendment',
  commencement_letter: 'Commencement Letter',
  exhibit: 'Exhibit / Addendum',
  side_letter: 'Side Letter',
}

export function DocumentListItem({ doc }: DocumentListItemProps) {
  const [loading, setLoading] = useState(false)

  const handlePreview = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/documents/signed-url?id=${doc.id}`)
      if (res.ok) {
        const data = await res.json()
        if (data.preview_url) {
          window.open(data.preview_url, '_blank')
        }
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="glass-card rounded-xl px-5 py-4 flex items-center gap-4 cursor-pointer hover:bg-white/[0.06] transition-colors"
      onClick={handlePreview}
    >
      <div
        className="flex items-center justify-center w-9 h-9 rounded-lg shrink-0"
        style={{ background: 'rgba(16,185,129,0.10)', border: '1px solid rgba(16,185,129,0.15)' }}
      >
        <FileText className="h-4 w-4 text-emerald-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{doc.display_name ?? doc.file_name}</p>
        {doc.display_name && (
          <p className="text-xs text-muted-foreground/75 truncate mt-0.5">{doc.file_name}</p>
        )}
      </div>
      <span className="text-xs text-muted-foreground/70 shrink-0 bg-white/[0.04] px-2 py-1 rounded-md">
        {DOC_TYPE_LABELS[doc.document_type] ?? doc.document_type.replace(/_/g, ' ')}
      </span>
      <button className="text-muted-foreground/50 hover:text-emerald-400 transition-colors shrink-0">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  )
}
