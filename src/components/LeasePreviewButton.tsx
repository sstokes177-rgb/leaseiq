'use client'

import { useState, useRef, useEffect } from 'react'
import { Eye, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FloatingLeaseViewer } from '@/components/FloatingLeaseViewer'

interface DocItem {
  id: string
  file_name: string
  display_name: string | null
}

interface LeasePreviewButtonProps {
  storeId: string
  documents: DocItem[]
}

export function LeasePreviewButton({ storeId: _storeId, documents }: LeasePreviewButtonProps) {
  const [viewerOpen, setViewerOpen] = useState(false)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [activeName, setActiveName] = useState('')
  const [loading, setLoading] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown on outside click
  useEffect(() => {
    if (!dropdownOpen) return
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [dropdownOpen])

  async function openDocument(doc: DocItem) {
    setLoading(true)
    setDropdownOpen(false)
    try {
      const res = await fetch(`/api/documents/${doc.id}/url`)
      if (!res.ok) throw new Error('Failed to get URL')
      const data = await res.json()
      if (data?.url) {
        setPdfUrl(data.url)
        setActiveName(doc.display_name || doc.file_name)
        setViewerOpen(true)
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }

  function handleClick() {
    if (viewerOpen) {
      // Close the viewer
      setViewerOpen(false)
      setPdfUrl(null)
      return
    }

    if (documents.length === 1) {
      openDocument(documents[0])
    } else if (documents.length > 1) {
      setDropdownOpen(prev => !prev)
    }
  }

  if (documents.length === 0) return null

  return (
    <>
      <div className="relative" ref={dropdownRef}>
        <Button
          variant="outline"
          className="gap-2 px-5 py-2.5 text-sm font-medium"
          onClick={handleClick}
          disabled={loading}
        >
          <Eye className="h-4 w-4" />
          {loading ? 'Loading...' : 'Preview Lease'}
          {documents.length > 1 && <ChevronDown className="h-3 w-3 ml-0.5" />}
        </Button>

        {/* Dropdown for multiple documents */}
        {dropdownOpen && documents.length > 1 && (
          <div className="absolute top-full left-0 mt-1.5 w-64 rounded-lg border border-white/10 bg-gray-900 shadow-xl z-50 py-1">
            {documents.map((doc) => (
              <button
                key={doc.id}
                onClick={() => openDocument(doc)}
                className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-white/[0.06] transition-colors truncate"
              >
                {doc.display_name || doc.file_name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Floating viewer — rendered when open */}
      {viewerOpen && pdfUrl && (
        <FloatingLeaseViewer
          pdfUrl={pdfUrl}
          documentName={activeName}
          onClose={() => {
            setViewerOpen(false)
            setPdfUrl(null)
          }}
        />
      )}
    </>
  )
}
