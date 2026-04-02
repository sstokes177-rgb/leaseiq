'use client'

import { useEffect, useState } from 'react'
import { X, FileText } from 'lucide-react'
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

interface CitationSidePanelProps {
  citation: Citation | null
  onClose: () => void
}

export function CitationSidePanel({ citation, onClose }: CitationSidePanelProps) {
  const [visible, setVisible] = useState(false)
  const [displayCitation, setDisplayCitation] = useState<Citation | null>(null)

  useEffect(() => {
    if (citation) {
      setDisplayCitation(citation)
      // Trigger slide-in on next frame
      requestAnimationFrame(() => setVisible(true))
    } else {
      setVisible(false)
      // Keep content visible during slide-out
      const timer = setTimeout(() => setDisplayCitation(null), 300)
      return () => clearTimeout(timer)
    }
  }, [citation])

  if (!displayCitation) return null

  const cfg = getDocConfig(displayCitation.document_type)
  const fullText = displayCitation.content ?? displayCitation.excerpt

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
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-white/[0.08]">
            <p className="text-sm font-semibold">Source Document</p>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/[0.06] transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-4">
            <PanelContent citation={displayCitation} cfg={cfg} fullText={fullText} />
          </div>
        </div>
      </div>

      {/* Desktop: right side panel (slides alongside chat) */}
      <div
        className="hidden md:flex flex-col border-l border-white/[0.08] overflow-hidden transition-all duration-300 ease-out"
        style={{
          background: 'rgba(10,12,18,0.95)',
          width: visible ? '40%' : '0%',
          minWidth: visible ? '280px' : '0px',
          maxWidth: visible ? '480px' : '0px',
          opacity: visible ? 1 : 0,
        }}
      >
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-white/[0.08] shrink-0">
          <p className="text-sm font-semibold">Source Document</p>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/[0.06] transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4">
          <PanelContent citation={displayCitation} cfg={cfg} fullText={fullText} />
        </div>
      </div>
    </>
  )
}

function PanelContent({ citation, cfg, fullText }: { citation: Citation; cfg: { label: string; pillCls: string }; fullText: string }) {
  return (
    <div className="space-y-4">
      {/* Doc type + name */}
      <div className="space-y-1.5">
        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border ${cfg.pillCls}`}>
          {cfg.label}
        </span>
        <div className="flex items-start gap-1.5">
          <FileText className="h-3.5 w-3.5 text-white/35 shrink-0 mt-0.5" />
          <p className="text-xs text-white/60 leading-relaxed">{citation.document_name}</p>
        </div>
      </div>

      {/* Section + page */}
      {(citation.section_heading || citation.page_number) && (
        <div className="flex flex-wrap gap-2">
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

      {/* Full text */}
      <div
        className="rounded-xl px-4 py-3"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        <p className="text-[10px] font-semibold text-white/30 uppercase tracking-widest mb-2">
          Full Source Text
        </p>
        <p className="text-sm text-white/80 leading-relaxed whitespace-pre-wrap">
          {fullText}
        </p>
      </div>
    </div>
  )
}
