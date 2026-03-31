'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, BookOpen, FileText } from 'lucide-react'
import type { Citation } from '@/types'

interface CitationCardProps {
  citations: Citation[]
}

const DOC_TYPE_CONFIG: Record<string, { label: string; cls: string }> = {
  amendment: {
    label: 'Amendment',
    cls: 'bg-amber-500/15 text-amber-300 border border-amber-500/25',
  },
  side_letter: {
    label: 'Side Letter',
    cls: 'bg-amber-500/15 text-amber-300 border border-amber-500/25',
  },
  commencement_letter: {
    label: 'Commencement Letter',
    cls: 'bg-sky-500/15 text-sky-300 border border-sky-500/25',
  },
  exhibit: {
    label: 'Exhibit',
    cls: 'bg-violet-500/15 text-violet-300 border border-violet-500/25',
  },
  base_lease: {
    label: 'Base Lease',
    cls: 'bg-slate-500/15 text-slate-300 border border-slate-500/25',
  },
}

function DocTypeBadge({ docType }: { docType?: string }) {
  const cfg = DOC_TYPE_CONFIG[docType ?? ''] ?? {
    label: docType?.replace(/_/g, ' ') ?? 'Document',
    cls: 'bg-white/[0.06] text-white/65 border border-white/12',
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium shrink-0 ${cfg.cls}`}>
      {cfg.label}
    </span>
  )
}

function CitationItem({ citation }: { citation: Citation }) {
  const [open, setOpen] = useState(false)

  const sectionLabel = citation.section_heading ?? null
  const pageLabel = citation.page_number ? `p. ${citation.page_number}` : null
  const label = [sectionLabel, pageLabel].filter(Boolean).join(' · ') || 'View excerpt'

  return (
    <div
      className="rounded-lg overflow-hidden transition-colors"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
    >
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left hover:bg-white/[0.04] transition-colors"
      >
        <span className="text-xs text-white/75 font-medium truncate">{label}</span>
        <span className="shrink-0 flex items-center gap-1.5 text-white/40">
          {citation.page_number && !sectionLabel && (
            <span className="text-[11px]">p. {citation.page_number}</span>
          )}
          {open ? (
            <ChevronUp className="h-3 w-3" />
          ) : (
            <ChevronDown className="h-3 w-3" />
          )}
        </span>
      </button>

      {open && (
        <div
          className="px-3 py-2.5 border-t"
          style={{
            background: 'rgba(0,0,0,0.20)',
            borderColor: 'rgba(255,255,255,0.06)',
          }}
        >
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
  // Sort: amendments first, then base lease
  const priority: Record<string, number> = {
    amendment: 0, side_letter: 1, commencement_letter: 2, exhibit: 3, base_lease: 4,
  }
  return [...map.values()].sort(
    (a, b) => (priority[a.docType ?? ''] ?? 5) - (priority[b.docType ?? ''] ?? 5)
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function CitationCard({ citations }: CitationCardProps) {
  const [open, setOpen] = useState(false)
  if (citations.length === 0) return null

  const groups = groupCitations(citations)

  return (
    <div className="mt-3 pt-3 border-t border-white/[0.07]">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 text-xs text-white/55 hover:text-white/80 transition-colors"
      >
        <BookOpen className="h-3 w-3" />
        <span className="font-medium">
          {citations.length} Referenced Section{citations.length !== 1 ? 's' : ''}
        </span>
        {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </button>

      {open && (
        <div className="mt-3 space-y-5">
          {groups.map(group => (
            <div key={group.docName}>
              {/* Document header */}
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-3 w-3 text-white/35 shrink-0" />
                <DocTypeBadge docType={group.docType} />
                <span className="text-[11px] text-white/45 truncate">{group.docName}</span>
              </div>

              {/* Individual citations */}
              <div className="space-y-1.5 ml-5">
                {group.citations.map((c, i) => (
                  <CitationItem key={i} citation={c} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
