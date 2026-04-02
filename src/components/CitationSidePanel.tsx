'use client'

import { useEffect, useState } from 'react'
import { X, FileText, ExternalLink, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Citation } from '@/types'

const DOC_TYPE_CONFIG: Record<string, { label: string; pillCls: string }> = {
  amendment: { label: 'Amendment', pillCls: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
  side_letter: { label: 'Side Letter', pillCls: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
  commencement_letter: { label: 'Commencement Letter', pillCls: 'bg-sky-500/20 text-sky-300 border-sky-500/30' },
  exhibit: { label: 'Exhibit', pillCls: 'bg-violet-500/20 text-violet-300 border-violet-500/30' },
  base_lease: { label: 'Base Lease', pillCls: 'bg-slate-500/20 text-slate-300 border-slate-500/30' },
}

function getDocConfig(docType?: string) {
  return DOC_TYPE_CONFIG[docType ?? ''] ?? {
    label: docType?.replace(/_/g, ' ') ?? 'Document',
    pillCls: 'bg-white/[0.07] text-white/65 border-white/15',
  }
}

/** Strip non-printable characters and normalize whitespace for clean display */
function cleanText(text: string): string {
  return text
    // Remove non-printable chars except newlines and tabs
    .replace(/[^\x20-\x7E\n\t\r\u00A0-\u00FF\u2000-\u206F\u2018-\u201F\u2026]/g, '')
    // Collapse runs of dots/dashes used as visual separators (e.g., "....." or "-----")
    .replace(/[.]{4,}/g, '...')
    .replace(/[-]{4,}/g, '---')
    // Collapse excessive whitespace on a single line
    .replace(/[ \t]{3,}/g, '  ')
    // Normalize line breaks (collapse 3+ newlines to 2)
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

interface CitationSidePanelProps {
  citation: Citation | null
  onClose: () => void
}

export function CitationSidePanel({ citation, onClose }: CitationSidePanelProps) {
  const [visible, setVisible] = useState(false)
  const [displayCitation, setDisplayCitation] = useState<Citation | null>(null)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [pdfLoading, setPdfLoading] = useState(false)

  useEffect(() => {
    if (citation) {
      setDisplayCitation(citation)
      setPdfUrl(null)
      requestAnimationFrame(() => setVisible(true))

      // Fetch PDF URL if document_id is available
      if (citation.document_id) {
        setPdfLoading(true)
        fetch(`/api/documents/${citation.document_id}/url`)
          .then(r => r.ok ? r.json() : null)
          .then(data => {
            if (data?.url) setPdfUrl(data.url)
          })
          .catch(() => {})
          .finally(() => setPdfLoading(false))
      }
    } else {
      setVisible(false)
      const timer = setTimeout(() => {
        setDisplayCitation(null)
        setPdfUrl(null)
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [citation])

  if (!displayCitation) return null

  const cfg = getDocConfig(displayCitation.document_type)
  const fullText = cleanText(displayCitation.content ?? displayCitation.excerpt)
  const pageNum = displayCitation.page_number

  return (
    <>
      {/* Mobile: full-screen overlay */}
      <div
        className={`md:hidden fixed inset-0 z-40 transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      >
        <div
          className="absolute inset-0 flex flex-col transition-transform duration-300 ease-out"
          style={{
            background: 'rgba(12,14,20,0.98)',
            transform: visible ? 'translateX(0)' : 'translateX(100%)',
          }}
        >
          <PanelHeader
            citation={displayCitation}
            cfg={cfg}
            pdfUrl={pdfUrl}
            onClose={onClose}
          />
          <div className="flex-1 overflow-y-auto">
            <PanelBody
              citation={displayCitation}
              cfg={cfg}
              fullText={fullText}
              pdfUrl={pdfUrl}
              pdfLoading={pdfLoading}
              pageNum={pageNum}
            />
          </div>
        </div>
      </div>

      {/* Desktop: right side panel */}
      <div
        className="hidden md:flex flex-col border-l border-white/[0.08] overflow-hidden transition-all duration-300 ease-out"
        style={{
          background: 'rgba(10,12,18,0.95)',
          width: visible ? '45%' : '0%',
          minWidth: visible ? '320px' : '0px',
          maxWidth: visible ? '560px' : '0px',
          opacity: visible ? 1 : 0,
        }}
      >
        <PanelHeader
          citation={displayCitation}
          cfg={cfg}
          pdfUrl={pdfUrl}
          onClose={onClose}
        />
        <div className="flex-1 overflow-y-auto min-h-0">
          <PanelBody
            citation={displayCitation}
            cfg={cfg}
            fullText={fullText}
            pdfUrl={pdfUrl}
            pdfLoading={pdfLoading}
            pageNum={pageNum}
          />
        </div>
      </div>
    </>
  )
}

function PanelHeader({
  citation,
  cfg,
  pdfUrl,
  onClose,
}: {
  citation: Citation
  cfg: { label: string; pillCls: string }
  pdfUrl: string | null
  onClose: () => void
}) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.08] shrink-0">
      <div className="flex items-center gap-2 min-w-0">
        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold border shrink-0 ${cfg.pillCls}`}>
          {cfg.label}
        </span>
        <p className="text-xs text-white/60 truncate">{citation.document_name}</p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {pdfUrl && (
          <Button
            variant="ghost"
            size="icon-xs"
            className="text-muted-foreground/60 hover:text-foreground"
            onClick={() => window.open(pdfUrl, '_blank')}
            title="Open full document in new tab"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </Button>
        )}
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/[0.06] transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

function PanelBody({
  citation,
  cfg: _cfg,
  fullText,
  pdfUrl,
  pdfLoading,
  pageNum,
}: {
  citation: Citation
  cfg: { label: string; pillCls: string }
  fullText: string
  pdfUrl: string | null
  pdfLoading: boolean
  pageNum?: number
}) {
  return (
    <div className="flex flex-col h-full">
      {/* Section + page info */}
      {(citation.section_heading || citation.page_number) && (
        <div className="flex flex-wrap gap-2 px-4 pt-3">
          {citation.section_heading && (
            <span
              className="text-[11px] font-medium px-2 py-0.5 rounded-md"
              style={{
                background: 'rgba(16,185,129,0.12)',
                border: '1px solid rgba(16,185,129,0.25)',
                color: 'rgb(52,211,153)',
              }}
            >
              {citation.section_heading}
            </span>
          )}
          {citation.page_number && (
            <span className="text-[11px] text-white/45 px-2 py-0.5 rounded-md bg-white/[0.05] border border-white/[0.08]">
              Page {citation.page_number}
            </span>
          )}
        </div>
      )}

      {/* PDF viewer or loading */}
      {pdfLoading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground/50" />
        </div>
      )}

      {pdfUrl && !pdfLoading && (
        <div className="px-4 pt-3 flex-1 min-h-[300px]">
          <iframe
            src={`${pdfUrl}${pageNum ? `#page=${pageNum}` : ''}`}
            className="w-full h-full min-h-[400px] rounded-lg border border-white/[0.08]"
            title={citation.document_name}
          />
        </div>
      )}

      {/* Text excerpt (always shown as reference below PDF, or as primary if no PDF) */}
      <div className="px-4 py-3">
        <div
          className="rounded-xl px-4 py-3"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <p className="text-[10px] font-semibold text-white/30 uppercase tracking-widest mb-2">
            {pdfUrl ? 'Extracted Text' : 'Source Text'}
          </p>
          <p className="text-sm text-white/80 leading-relaxed whitespace-pre-wrap">
            {fullText}
          </p>
        </div>
      </div>
    </div>
  )
}
