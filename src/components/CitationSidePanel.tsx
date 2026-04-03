'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { X, FileText, ExternalLink, Loader2, Maximize2, RotateCcw } from 'lucide-react'
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
    .replace(/[^\x20-\x7E\n\t\r\u00A0-\u00FF\u2000-\u206F\u2018-\u201F\u2026]/g, '')
    .replace(/[.]{4,}/g, '...')
    .replace(/[-]{4,}/g, '---')
    .replace(/[ \t]{3,}/g, '  ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

const DEFAULT_WIDTH_PCT = 40
const MIN_WIDTH_PX = 300
const MAX_WIDTH_PCT = 70
const FULLSCREEN_WIDTH_PCT = 90

interface CitationSidePanelProps {
  citation: Citation | null
  onClose: () => void
}

export function CitationSidePanel({ citation, onClose }: CitationSidePanelProps) {
  const [visible, setVisible] = useState(false)
  const [displayCitation, setDisplayCitation] = useState<Citation | null>(null)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [pdfLoading, setPdfLoading] = useState(false)

  // Resizable state
  const [panelWidthPct, setPanelWidthPct] = useState(DEFAULT_WIDTH_PCT)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const isDraggingRef = useRef(false)
  const startXRef = useRef(0)
  const startWidthPctRef = useRef(DEFAULT_WIDTH_PCT)

  useEffect(() => {
    if (citation) {
      setDisplayCitation(citation)
      setPdfUrl(null)
      requestAnimationFrame(() => setVisible(true))

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

  // Drag resize handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    isDraggingRef.current = true
    startXRef.current = e.clientX
    startWidthPctRef.current = panelWidthPct
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }, [panelWidthPct])

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return
      const viewportWidth = window.innerWidth
      const deltaX = startXRef.current - e.clientX // dragging left = wider
      const deltaPct = (deltaX / viewportWidth) * 100
      const newPct = Math.min(MAX_WIDTH_PCT, Math.max((MIN_WIDTH_PX / viewportWidth) * 100, startWidthPctRef.current + deltaPct))
      setPanelWidthPct(newPct)
      setIsFullscreen(false)
    }

    const handleMouseUp = () => {
      if (isDraggingRef.current) {
        isDraggingRef.current = false
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
      }
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [])

  const handleFullscreen = useCallback(() => {
    setIsFullscreen(true)
    setPanelWidthPct(FULLSCREEN_WIDTH_PCT)
  }, [])

  const handleResetSize = useCallback(() => {
    setIsFullscreen(false)
    setPanelWidthPct(DEFAULT_WIDTH_PCT)
  }, [])

  if (!displayCitation) return null

  const cfg = getDocConfig(displayCitation.document_type)
  const fullText = cleanText(displayCitation.content ?? displayCitation.excerpt)
  const pageNum = displayCitation.page_number
  const effectiveWidthPct = isFullscreen ? FULLSCREEN_WIDTH_PCT : panelWidthPct

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
            onFullscreen={undefined}
            onResetSize={undefined}
            isFullscreen={false}
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

      {/* Desktop: resizable right side panel */}
      <div
        className="hidden md:flex flex-col border-l border-white/[0.08] overflow-hidden transition-[opacity] duration-300 ease-out relative"
        style={{
          background: 'rgba(10,12,18,0.95)',
          width: visible ? `${effectiveWidthPct}%` : '0%',
          minWidth: visible ? `${MIN_WIDTH_PX}px` : '0px',
          opacity: visible ? 1 : 0,
        }}
      >
        {/* Drag handle on left edge */}
        <div
          onMouseDown={handleMouseDown}
          className="absolute left-0 top-0 bottom-0 w-[5px] z-10 cursor-col-resize group hover:bg-emerald-500/20 transition-colors"
          style={{ background: 'transparent' }}
        >
          {/* Grip indicator */}
          <div className="absolute left-[1px] top-1/2 -translate-y-1/2 w-[3px] h-8 rounded-full bg-white/[0.12] group-hover:bg-emerald-400/50 transition-colors" />
        </div>

        <PanelHeader
          citation={displayCitation}
          cfg={cfg}
          pdfUrl={pdfUrl}
          onClose={onClose}
          onFullscreen={handleFullscreen}
          onResetSize={handleResetSize}
          isFullscreen={isFullscreen}
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
  onFullscreen,
  onResetSize,
  isFullscreen,
}: {
  citation: Citation
  cfg: { label: string; pillCls: string }
  pdfUrl: string | null
  onClose: () => void
  onFullscreen: (() => void) | undefined
  onResetSize: (() => void) | undefined
  isFullscreen: boolean
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
        {/* Fullscreen / Reset buttons (desktop only) */}
        {onFullscreen && !isFullscreen && (
          <button
            onClick={onFullscreen}
            className="p-1.5 rounded-lg text-muted-foreground/50 hover:text-foreground hover:bg-white/[0.06] transition-colors"
            title="Full screen"
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </button>
        )}
        {onResetSize && isFullscreen && (
          <button
            onClick={onResetSize}
            className="p-1.5 rounded-lg text-muted-foreground/50 hover:text-foreground hover:bg-white/[0.06] transition-colors"
            title="Reset size"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        )}
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
