'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, FileText } from 'lucide-react'
import type { Citation } from '@/types'

interface CitationCardProps {
  citations: Citation[]
  onCitationClick?: (citation: Citation) => void
}

const DOC_TYPE_CONFIG: Record<string, { label: string; pillCls: string }> = {
  amendment: {
    label: 'Amendment',
    pillCls: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  },
  side_letter: {
    label: 'Side Letter',
    pillCls: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  },
  commencement_letter: {
    label: 'Commencement Letter',
    pillCls: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
  },
  exhibit: {
    label: 'Exhibit',
    pillCls: 'bg-violet-500/20 text-violet-300 border-violet-500/30',
  },
  base_lease: {
    label: 'Base Lease',
    pillCls: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
  },
}

function getDocConfig(docType?: string) {
  return (
    DOC_TYPE_CONFIG[docType ?? ''] ?? {
      label: docType?.replace(/_/g, ' ') ?? 'Document',
      pillCls: 'bg-white/[0.07] text-white/65 border-white/15',
    }
  )
}

// ── Individual citation pill ──────────────────────────────────────────────────

function CitationPill({
  citation,
  onCitationClick,
}: {
  citation: Citation
  onCitationClick?: (citation: Citation) => void
}) {
  const [open, setOpen] = useState(false)
  const cfg = getDocConfig(citation.document_type)

  const sectionLabel = citation.section_heading ?? null
  const pageLabel = citation.page_number ? `p.${citation.page_number}` : null
  const detailLabel = [sectionLabel, pageLabel].filter(Boolean).join(' · ')
  const pillText = detailLabel || cfg.label

  if (onCitationClick) {
    return (
      <button
        onClick={() => onCitationClick(citation)}
        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-opacity hover:opacity-90 ${cfg.pillCls}`}
      >
        <span className="truncate max-w-[200px]">{pillText}</span>
      </button>
    )
  }

  return (
    <div className="inline-block">
      <button
        onClick={() => setOpen(o => !o)}
        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-opacity hover:opacity-90 ${cfg.pillCls}`}
      >
        <span className="truncate max-w-[200px]">{pillText}</span>
        <span className="shrink-0 opacity-70">
          {open ? <ChevronUp className="h-2.5 w-2.5" /> : <ChevronDown className="h-2.5 w-2.5" />}
        </span>
      </button>

      {open && (
        <div
          className="mt-1.5 rounded-lg px-3 py-2.5"
          style={{
            background: 'rgba(0,0,0,0.28)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <div className="flex items-center gap-1.5 mb-1.5">
            <FileText className="h-3 w-3 text-white/35 shrink-0" />
            <span className="text-[10px] text-white/45 truncate">{citation.document_name}</span>
          </div>
          <p className="text-xs text-white/70 italic leading-relaxed">
            &ldquo;{citation.excerpt}&rdquo;
          </p>
        </div>
      )}
    </div>
  )
}

// ── Group citations by document ───────────────────────────────────────────────

interface DocGroup {
  docName: string
  docType: string | undefined
  citations: Citation[]
}

function groupCitations(citations: Citation[]): DocGroup[] {
  const map = new Map<string, DocGroup>()
  for (const c of citations) {
    if (!map.has(c.document_name)) {
      map.set(c.document_name, { docName: c.document_name, docType: c.document_type, citations: [] })
    }
    map.get(c.document_name)!.citations.push(c)
  }
  const priority: Record<string, number> = {
    amendment: 0, side_letter: 1, commencement_letter: 2, exhibit: 3, base_lease: 4,
  }
  return [...map.values()].sort(
    (a, b) => (priority[a.docType ?? ''] ?? 5) - (priority[b.docType ?? ''] ?? 5)
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function CitationCard({ citations, onCitationClick }: CitationCardProps) {
  if (citations.length === 0) return null

  const groups = groupCitations(citations)

  return (
    <div className="mt-3 pt-3 border-t border-white/[0.07]">
      <p className="text-[10px] font-semibold text-white/35 uppercase tracking-widest mb-2">
        Referenced sections
      </p>
      <div className="space-y-3">
        {groups.map(group => {
          const cfg = getDocConfig(group.docType)
          return (
            <div key={group.docName}>
              <div className="flex items-center gap-1.5 mb-1.5">
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold border ${cfg.pillCls}`}
                >
                  {cfg.label}
                </span>
                <span className="text-[10px] text-white/40 truncate">{group.docName}</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {group.citations.map((c, i) => (
                  <CitationPill key={i} citation={c} onCitationClick={onCitationClick} />
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
