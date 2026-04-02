'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useState, useRef, useCallback, createContext, useContext } from 'react'
import { CitationCard } from './CitationCard'
import type { Citation } from '@/types'
import { cn } from '@/lib/utils'
import type { ReactNode, ComponentPropsWithoutRef } from 'react'

interface ChatMessageProps {
  role: 'user' | 'assistant'
  content: string
  citations?: Citation[]
  isStreaming?: boolean
  timestamp?: Date
  onCitationClick?: (citation: Citation) => void
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}

// ── Citation context for inline references ──────────────────────────────────

interface CitationCtx {
  citations: Citation[]
  onArticleClick: (citation: Citation) => void
}

const CitationContext = createContext<CitationCtx | null>(null)

// ── Inline content tokenizer ──────────────────────────────────────────────────

type Token =
  | { t: 'text'; v: string }
  | { t: 'bold'; v: string }
  | { t: 'article'; v: string }
  | { t: 'doc-tag'; v: string; docType: string }

const DOC_TAG_TYPES: Record<string, string> = {
  'base lease': 'base_lease',
  amendment: 'amendment',
  exhibit: 'exhibit',
  'side letter': 'side_letter',
  'commencement letter': 'commencement_letter',
}

const DOC_TAG_STYLES: Record<string, string> = {
  base_lease: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
  amendment: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  exhibit: 'bg-violet-500/20 text-violet-300 border-violet-500/30',
  side_letter: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  commencement_letter: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
}

// Combined regex: **bold**, [Doc Type tags], Article/Section references
const INLINE_RE =
  /(\*\*[^*\n]{1,120}\*\*|\[[^\]\n]{1,80}\]|(?:(?:Per|Under|per|under)\s+)?(?:Article|Section|Paragraph|Clause)\s+\d+(?:\.\d+)*[a-zA-Z]?(?:\([a-z\d]+\))?)/g

function tokenize(text: string): Token[] {
  const tokens: Token[] = []
  let last = 0
  const re = new RegExp(INLINE_RE.source, 'g')
  let m: RegExpExecArray | null

  while ((m = re.exec(text)) !== null) {
    if (m.index > last) tokens.push({ t: 'text', v: text.slice(last, m.index) })
    const raw = m[0]

    if (raw.startsWith('**') && raw.endsWith('**')) {
      tokens.push({ t: 'bold', v: raw.slice(2, -2) })
    } else if (raw.startsWith('[') && raw.endsWith(']')) {
      const inner = raw.slice(1, -1)
      const lower = inner.toLowerCase()
      const matchedKey = Object.keys(DOC_TAG_TYPES).find(k => lower.startsWith(k))
      if (matchedKey) {
        tokens.push({ t: 'doc-tag', v: inner, docType: DOC_TAG_TYPES[matchedKey] })
      } else {
        tokens.push({ t: 'text', v: raw })
      }
    } else {
      tokens.push({ t: 'article', v: raw })
    }

    last = re.lastIndex
  }

  if (last < text.length) tokens.push({ t: 'text', v: text.slice(last) })
  return tokens
}

// ── Match article reference to citation ─────────────────────────────────────

/** Extract the numeric part from "Section 5.1" or "Article 23" etc. */
function extractArticleNumber(ref: string): string | null {
  const m = ref.match(/(?:Article|Section|Paragraph|Clause)\s+(\d+(?:\.\d+)*[a-zA-Z]?(?:\([a-z\d]+\))?)/i)
  return m ? m[1] : null
}

function findMatchingCitation(articleRef: string, citations: Citation[]): Citation | null {
  const num = extractArticleNumber(articleRef)
  if (!num) return null
  const numLower = num.toLowerCase()

  // Try matching against section_heading first, then content
  for (const c of citations) {
    if (c.section_heading) {
      const heading = c.section_heading.toLowerCase()
      if (heading.includes(numLower) || heading.includes(`article ${numLower}`) || heading.includes(`section ${numLower}`)) {
        return c
      }
    }
  }

  // Fallback: search content for the article/section reference
  for (const c of citations) {
    const content = (c.content ?? c.excerpt).toLowerCase()
    if (content.includes(`article ${numLower}`) || content.includes(`section ${numLower}`)) {
      return c
    }
  }

  // Last resort: return first citation if we have any
  return citations.length > 0 ? citations[0] : null
}

// ── Article tooltip component ───────────────────────────────────────────────

function ArticleRef({ text }: { text: string }) {
  const ctx = useContext(CitationContext)
  const [showTooltip, setShowTooltip] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const refEl = useRef<HTMLButtonElement>(null)

  const matched = ctx ? findMatchingCitation(text, ctx.citations) : null

  const handleMouseEnter = useCallback(() => {
    timeoutRef.current = setTimeout(() => setShowTooltip(true), 300)
  }, [])

  const handleMouseLeave = useCallback(() => {
    clearTimeout(timeoutRef.current)
    setShowTooltip(false)
  }, [])

  const handleClick = useCallback(() => {
    clearTimeout(timeoutRef.current)
    setShowTooltip(false)
    if (matched && ctx) ctx.onArticleClick(matched)
  }, [matched, ctx])

  if (!matched || !ctx) {
    // No citation match — render as non-clickable badge
    return (
      <span
        className="inline-flex items-center mx-0.5 px-2 py-0.5 rounded-md text-[11px] font-semibold leading-tight"
        style={{
          background: 'rgba(16,185,129,0.15)',
          border: '1px solid rgba(16,185,129,0.32)',
          color: 'rgb(52,211,153)',
        }}
      >
        {text}
      </span>
    )
  }

  const tooltipExcerpt = (matched.content ?? matched.excerpt).slice(0, 200)

  return (
    <span className="relative inline-flex">
      <button
        ref={refEl}
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="inline-flex items-center mx-0.5 px-2 py-0.5 rounded-md text-[11px] font-semibold leading-tight cursor-pointer transition-all hover:scale-105"
        style={{
          background: 'rgba(16,185,129,0.15)',
          border: '1px solid rgba(16,185,129,0.32)',
          color: 'rgb(52,211,153)',
        }}
      >
        {text}
      </button>

      {/* Tooltip */}
      {showTooltip && (
        <div
          className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 p-3 rounded-xl text-xs text-white/80 leading-relaxed pointer-events-none"
          style={{
            background: 'rgba(10,12,18,0.97)',
            border: '1px solid rgba(255,255,255,0.12)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
            animation: 'fade-in 0.15s ease-out both',
          }}
        >
          <p className="text-[10px] font-semibold text-emerald-400/80 uppercase tracking-widest mb-1.5">
            {matched.document_name}
          </p>
          <p className="italic text-white/65">
            &ldquo;{tooltipExcerpt}{(matched.content ?? matched.excerpt).length > 200 ? '...' : ''}&rdquo;
          </p>
        </div>
      )}
    </span>
  )
}

function InlineTokens({ tokens }: { tokens: Token[] }) {
  return (
    <>
      {tokens.map((tok, i) => {
        if (tok.t === 'text') return <span key={i}>{tok.v}</span>

        if (tok.t === 'bold')
          return (
            <strong key={i} className="font-semibold text-emerald-400">
              {tok.v}
            </strong>
          )

        if (tok.t === 'article')
          return <ArticleRef key={i} text={tok.v} />

        if (tok.t === 'doc-tag') {
          const cls = DOC_TAG_STYLES[tok.docType] ?? 'bg-white/[0.07] text-white/70 border-white/15'
          return (
            <span
              key={i}
              className={`inline-flex items-center mx-0.5 px-2 py-0.5 rounded-md text-[11px] font-medium leading-tight border ${cls}`}
            >
              {tok.v}
            </span>
          )
        }

        return null
      })}
    </>
  )
}

// Apply tokenizer to a string child, preserving non-string nodes as-is
function processText(text: string) {
  return <InlineTokens tokens={tokenize(text)} />
}

// Recursively process React children — apply tokenizer to text nodes
function processChildren(children: ReactNode): ReactNode {
  if (typeof children === 'string') return processText(children)
  if (Array.isArray(children)) return children.map((child, i) => {
    if (typeof child === 'string') return <span key={i}>{processText(child)}</span>
    return child
  })
  return children
}

// Extract plain text from React children for pattern detection
function getTextContent(children: ReactNode): string {
  if (typeof children === 'string') return children
  if (Array.isArray(children)) return children.map(getTextContent).join('')
  return ''
}

const SUMMARY_RE = /^(in short[:\s]|bottom line[:\s]|summary[:\s])/i

// ── React-markdown custom components ─────────────────────────────────────────

function mdP({ children }: ComponentPropsWithoutRef<'p'>) {
  const text = getTextContent(children)
  const isSummary = SUMMARY_RE.test(text)

  if (isSummary) {
    return (
      <div
        className="rounded-xl px-4 py-3 my-2"
        style={{
          background: 'rgba(16,185,129,0.08)',
          border: '1px solid rgba(16,185,129,0.22)',
        }}
      >
        <p className="text-sm leading-[1.7] font-medium text-emerald-100/90">
          {processChildren(children)}
        </p>
      </div>
    )
  }

  return (
    <p className="text-sm leading-[1.7] text-white/90 mb-3 last:mb-0">
      {processChildren(children)}
    </p>
  )
}

function mdStrong({ children }: ComponentPropsWithoutRef<'strong'>) {
  return (
    <strong className="font-semibold text-emerald-400">
      {processChildren(children)}
    </strong>
  )
}

function mdH1({ children }: ComponentPropsWithoutRef<'h1'>) {
  return <h1 className="text-base font-bold text-white/95 mt-4 mb-2 first:mt-0">{processChildren(children)}</h1>
}
function mdH2({ children }: ComponentPropsWithoutRef<'h2'>) {
  return <h2 className="text-sm font-bold text-white/90 mt-3 mb-1.5 first:mt-0">{processChildren(children)}</h2>
}
function mdH3({ children }: ComponentPropsWithoutRef<'h3'>) {
  return <h3 className="text-sm font-semibold text-white/85 mt-2 mb-1 first:mt-0">{processChildren(children)}</h3>
}

function mdUl({ children }: ComponentPropsWithoutRef<'ul'>) {
  return <ul className="list-disc list-outside pl-5 my-2 space-y-1 text-sm text-white/90">{children}</ul>
}
function mdOl({ children }: ComponentPropsWithoutRef<'ol'>) {
  return <ol className="list-decimal list-outside pl-5 my-2 space-y-1 text-sm text-white/90">{children}</ol>
}
function mdLi({ children }: ComponentPropsWithoutRef<'li'>) {
  return <li className="leading-[1.65]">{processChildren(children)}</li>
}

function mdHr() {
  return <hr className="my-3 border-white/[0.10]" />
}

const MD_COMPONENTS = {
  p: mdP,
  strong: mdStrong,
  h1: mdH1,
  h2: mdH2,
  h3: mdH3,
  ul: mdUl,
  ol: mdOl,
  li: mdLi,
  hr: mdHr,
}

// ── Response content renderer ─────────────────────────────────────────────────

function LeaseResponseContent({
  content,
  isStreaming,
}: {
  content: string
  isStreaming?: boolean
}) {
  if (!content.trim()) {
    return (
      <span className="inline-block w-1.5 h-[1.1em] align-middle bg-current opacity-60 animate-pulse rounded-sm" />
    )
  }

  return (
    <div className="streaming-content">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={MD_COMPONENTS}>
        {content}
      </ReactMarkdown>
      {isStreaming && (
        <span className="inline-block w-1.5 h-[1.1em] ml-0.5 align-middle bg-white/60 opacity-60 animate-pulse rounded-sm" />
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function ChatMessage({
  role,
  content,
  citations,
  isStreaming,
  timestamp,
  onCitationClick,
}: ChatMessageProps) {
  const isUser = role === 'user'

  const citationCtx: CitationCtx | null = (citations && citations.length > 0 && onCitationClick)
    ? { citations, onArticleClick: onCitationClick }
    : null

  return (
    <div className={cn('flex flex-col message-in', isUser ? 'items-end' : 'items-start')}>
      <div
        className={cn(
          'max-w-[82%] px-4 py-3',
          isUser
            ? [
                'text-white',
                'rounded-[18px] rounded-br-[4px]',
                'bg-gradient-to-br from-emerald-500/90 to-teal-600/90',
                'shadow-[0_4px_20px_rgba(16,185,129,0.28)]',
              ]
            : ['text-foreground', 'rounded-[18px] rounded-bl-[4px]', 'glass-card']
        )}
      >
        {isUser ? (
          <div className="whitespace-pre-wrap text-sm leading-relaxed">{content}</div>
        ) : (
          <CitationContext.Provider value={citationCtx}>
            <LeaseResponseContent content={content} isStreaming={isStreaming} />
          </CitationContext.Provider>
        )}

        {!isUser && citations && citations.length > 0 && (
          <CitationCard citations={citations} onCitationClick={onCitationClick} />
        )}

        {!isUser && !isStreaming && (
          <p className="mt-2.5 pt-2.5 border-t border-white/[0.07] text-[11px] text-white/40 italic leading-relaxed">
            Informational summary based on your uploaded documents — not legal advice. Consult an
            attorney for legal interpretation.
          </p>
        )}
      </div>

      {timestamp && (
        <p className="text-[10px] text-muted-foreground/50 mt-1 px-1">
          {formatTime(timestamp)}
        </p>
      )}
    </div>
  )
}
