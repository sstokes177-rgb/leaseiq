'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { X, ExternalLink, Loader2, Maximize2, RotateCcw } from 'lucide-react'
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

type PanelTab = 'text' | 'pdf'

interface CitationSidePanelProps {
  citation: Citation | null
  onClose: () => void
}

export function CitationSidePanel({ citation, onClose }: CitationSidePanelProps) {
  const [visible, setVisible] = useState(false)
  const [displayCitation, setDisplayCitation] = useState<Citation | null>(null)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<PanelTab>('text')
  const [articleText, setArticleText] = useState<string | null>(null)
  const [articleLoading, setArticleLoading] = useState(false)

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
      setArticleText(null)
      setActiveTab('text')
      requestAnimationFrame(() => setVisible(true))

      // Fetch PDF signed URL
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

      // Fetch article-specific chunks when an article number is present
      if (citation.articleNumber) {
        setArticleLoading(true)
        const params = new URLSearchParams({ article: citation.articleNumber })
        if (citation.document_id) params.set('document_id', citation.document_id)
        // Fall back to store_id from URL for unmatched references
        if (!citation.document_id) {
          try {
            const urlStoreId = new URLSearchParams(window.location.search).get('store')
            if (urlStoreId) params.set('store_id', urlStoreId)
          } catch { /* ignore */ }
        }
        fetch(`/api/article-chunks?${params}`)
          .then(r => r.ok ? r.json() : null)
          .then(data => {
            if (data?.text) setArticleText(data.text)
          })
          .catch(() => {})
          .finally(() => setArticleLoading(false))
      }
    } else {
      setVisible(false)
      setPanelWidthPct(DEFAULT_WIDTH_PCT)
      setIsFullscreen(false)
      const timer = setTimeout(() => {
        setDisplayCitation(null)
        setPdfUrl(null)
        setArticleText(null)
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
  // Use article-specific text when available, otherwise fall back to single chunk content
  const rawText = articleText ?? displayCitation.content ?? displayCitation.excerpt
  const fullText = cleanText(rawText)
  const pageNum = displayCitation.page_number
  const effectiveWidthPct = isFullscreen ? FULLSCREEN_WIDTH_PCT : panelWidthPct
  const isNotDefaultSize = Math.abs(panelWidthPct - DEFAULT_WIDTH_PCT) > 0.5 || isFullscreen
  const textLoading = articleLoading

  return (
    <>
      {/* Mobile: full-screen overlay — no drag handle */}
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
            isNotDefaultSize={false}
          />
          <div className="flex-1 overflow-y-auto">
            <PanelBody
              citation={displayCitation}
              cfg={cfg}
              fullText={fullText}
              pdfUrl={pdfUrl}
              pdfLoading={pdfLoading}
              textLoading={textLoading}
              pageNum={pageNum}
              activeTab={activeTab}
              onTabChange={setActiveTab}
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
        {/* Drag handle on left edge — 6px wide */}
        <div
          onMouseDown={handleMouseDown}
          className="absolute left-0 top-0 bottom-0 w-[6px] z-10 cursor-col-resize group hover:bg-emerald-500/20 transition-colors"
          style={{ background: 'transparent' }}
        >
          {/* Grip dots indicator */}
          <div className="absolute left-[1px] top-1/2 -translate-y-1/2 flex flex-col gap-[3px] items-center">
            <div className="w-[3px] h-[3px] rounded-full bg-white/[0.15] group-hover:bg-emerald-400/60 transition-colors" />
            <div className="w-[3px] h-[3px] rounded-full bg-white/[0.15] group-hover:bg-emerald-400/60 transition-colors" />
            <div className="w-[3px] h-[3px] rounded-full bg-white/[0.15] group-hover:bg-emerald-400/60 transition-colors" />
            <div className="w-[3px] h-[3px] rounded-full bg-white/[0.15] group-hover:bg-emerald-400/60 transition-colors" />
            <div className="w-[3px] h-[3px] rounded-full bg-white/[0.15] group-hover:bg-emerald-400/60 transition-colors" />
          </div>
        </div>

        <PanelHeader
          citation={displayCitation}
          cfg={cfg}
          pdfUrl={pdfUrl}
          onClose={onClose}
          onFullscreen={handleFullscreen}
          onResetSize={handleResetSize}
          isFullscreen={isFullscreen}
          isNotDefaultSize={isNotDefaultSize}
        />
        <div className="flex-1 overflow-y-auto min-h-0">
          <PanelBody
            citation={displayCitation}
            cfg={cfg}
            fullText={fullText}
            pdfUrl={pdfUrl}
            pdfLoading={pdfLoading}
            textLoading={textLoading}
            pageNum={pageNum}
            activeTab={activeTab}
            onTabChange={setActiveTab}
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
  isNotDefaultSize,
}: {
  citation: Citation
  cfg: { label: string; pillCls: string }
  pdfUrl: string | null
  onClose: () => void
  onFullscreen: (() => void) | undefined
  onResetSize: (() => void) | undefined
  isFullscreen: boolean
  isNotDefaultSize: boolean
}) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.08] shrink-0">
      <div className="flex items-center gap-2 min-w-0">
        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border shrink-0 ${cfg.pillCls}`}>
          {cfg.label}
        </span>
        <p className="text-xs text-white/60 truncate">{citation.document_name}</p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {/* Full Screen button — hidden when already fullscreen */}
        {onFullscreen && !isFullscreen && (
          <button
            onClick={onFullscreen}
            className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-lg text-muted-foreground/50 hover:text-foreground hover:bg-white/[0.06] transition-colors"
            title="Full screen"
          >
            <Maximize2 className="h-4 w-4" />
          </button>
        )}
        {/* Reset button — shown whenever panel is not at default size */}
        {onResetSize && isNotDefaultSize && (
          <button
            onClick={onResetSize}
            className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-lg text-muted-foreground/50 hover:text-foreground hover:bg-white/[0.06] transition-colors"
            title="Reset size"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        )}
        {pdfUrl && (
          <Button
            variant="ghost"
            size="icon-xs"
            className="min-h-[44px] min-w-[44px] text-muted-foreground/60 hover:text-foreground"
            onClick={() => window.open(pdfUrl, '_blank')}
            title="Open full document in new tab"
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
        )}
        <button
          onClick={onClose}
          className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/[0.06] transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

/** Format extracted text with bold section headers and proper paragraph breaks. */
function formatExtractedText(text: string) {
  // Split into paragraphs on double newlines
  const paragraphs = text.split(/\n{2,}/)

  return paragraphs.map((para, i) => {
    const trimmed = para.trim()
    if (!trimmed) return null

    // Detect section/article headings: lines that start with ARTICLE, SECTION, EXHIBIT, or numbered sections
    const isHeading = /^(ARTICLE|SECTION|EXHIBIT|ADDENDUM|SCHEDULE|AMENDMENT)\s/i.test(trimmed)
      || /^\d+\.\d+[\s.]/.test(trimmed)
      || (/^[A-Z][A-Z\s:.\-]{4,}$/.test(trimmed.split('\n')[0]) && trimmed.split('\n')[0].length < 80)

    if (isHeading) {
      return (
        <div key={i}>
          {i > 0 && <div className="border-t border-white/[0.07] mt-6 mb-4" />}
          <p
            className="font-bold text-white/90 first:mt-0 mb-2"
            style={{ fontSize: '18px', marginTop: i > 0 ? '0' : undefined }}
          >
            {trimmed}
          </p>
        </div>
      )
    }

    // Regular paragraph — handle single newlines as line breaks within
    const lines = trimmed.split('\n')
    return (
      <p key={i} className="mb-3 last:mb-0">
        {lines.map((line, j) => (
          <span key={j}>
            {j > 0 && <br />}
            {line}
          </span>
        ))}
      </p>
    )
  })
}

function PanelBody({
  citation,
  cfg: _cfg,
  fullText,
  pdfUrl,
  pdfLoading,
  textLoading,
  pageNum,
  activeTab,
  onTabChange,
}: {
  citation: Citation
  cfg: { label: string; pillCls: string }
  fullText: string
  pdfUrl: string | null
  pdfLoading: boolean
  textLoading: boolean
  pageNum?: number
  activeTab: PanelTab
  onTabChange: (tab: PanelTab) => void
}) {
  const hasPdf = !!pdfUrl && !pdfLoading

  return (
    <div className="flex flex-col h-full">
      {/* Section + page info */}
      {(citation.section_heading || citation.page_number) && (
        <div className="flex flex-wrap gap-2 px-6 pt-3">
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

      {/* Tab toggle — only show when PDF is available */}
      {(hasPdf || pdfLoading) && (
        <div className="flex gap-1 px-6 pt-3">
          <button
            onClick={() => onTabChange('text')}
            className={`min-h-[44px] px-4 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'text'
                ? 'text-emerald-300 bg-emerald-500/10 border-b-2 border-emerald-400'
                : 'text-white/50 hover:text-white/70 hover:bg-white/[0.04]'
            }`}
          >
            Extracted Text
          </button>
          <button
            onClick={() => onTabChange('pdf')}
            className={`min-h-[44px] px-4 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'pdf'
                ? 'text-emerald-300 bg-emerald-500/10 border-b-2 border-emerald-400'
                : 'text-white/50 hover:text-white/70 hover:bg-white/[0.04]'
            }`}
          >
            Original PDF
          </button>
        </div>
      )}

      {/* Loading state */}
      {(pdfLoading || textLoading) && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground/50" />
        </div>
      )}

      {/* PDF view — only shown when "Original PDF" tab active */}
      {hasPdf && activeTab === 'pdf' && (
        <div className="px-6 pt-3 flex-1 min-h-[300px]">
          <iframe
            src={`${pdfUrl}${pageNum ? `#page=${pageNum}` : ''}`}
            className="w-full h-full min-h-[400px] rounded-lg border border-white/[0.08]"
            title={citation.document_name}
          />
        </div>
      )}

      {/* Extracted text view — shown when "Extracted Text" tab active, or always if no PDF */}
      {(activeTab === 'text' || (!hasPdf && !pdfLoading)) && !textLoading && (
        <div className="px-6 py-4">
          <div
            className="rounded-xl"
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.08)',
              padding: '24px 28px',
            }}
          >
            <p className="text-[10px] font-semibold text-white/30 uppercase tracking-widest mb-3">
              Source Text
            </p>
            <div
              className="text-white/80 mx-auto"
              style={{
                textAlign: 'justify',
                lineHeight: '1.7',
                fontSize: '16px',
                maxWidth: '72ch',
                fontFamily: "'Inter', 'Plus Jakarta Sans', -apple-system, sans-serif",
              }}
            >
              {formatExtractedText(fullText)}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
