import { CitationCard } from './CitationCard'
import type { Citation } from '@/types'
import { cn } from '@/lib/utils'

interface ChatMessageProps {
  role: 'user' | 'assistant'
  content: string
  citations?: Citation[]
  isStreaming?: boolean
  timestamp?: Date
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}

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

function InlineTokens({ tokens }: { tokens: Token[] }) {
  return (
    <>
      {tokens.map((tok, i) => {
        if (tok.t === 'text') return <span key={i}>{tok.v}</span>

        if (tok.t === 'bold')
          return (
            <strong key={i} className="font-semibold text-white/95">
              {tok.v}
            </strong>
          )

        if (tok.t === 'article')
          return (
            <span
              key={i}
              className="inline-flex items-center mx-0.5 px-2 py-0.5 rounded-md text-[11px] font-semibold leading-tight"
              style={{
                background: 'rgba(16,185,129,0.15)',
                border: '1px solid rgba(16,185,129,0.32)',
                color: 'rgb(52,211,153)',
              }}
            >
              {tok.v}
            </span>
          )

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

// ── Response content renderer ─────────────────────────────────────────────────

const SUMMARY_RE = /^(in short[:\s]|bottom line[:\s]|summary[:\s])/i

function LeaseResponseContent({
  content,
  isStreaming,
}: {
  content: string
  isStreaming?: boolean
}) {
  const paragraphs = content.split(/\n\n+/).filter(p => p.trim().length > 0)

  if (paragraphs.length === 0) {
    return (
      <span className="inline-block w-1.5 h-[1.1em] align-middle bg-current opacity-60 animate-pulse rounded-sm" />
    )
  }

  return (
    <div className="space-y-3">
      {paragraphs.map((para, i) => {
        const trimmed = para.trim()
        const isSummary = SUMMARY_RE.test(trimmed)
        const isLast = i === paragraphs.length - 1
        const lines = trimmed.split('\n')

        const renderLines = () =>
          lines.map((line, j) => (
            <span key={j}>
              {j > 0 && <br />}
              <InlineTokens tokens={tokenize(line)} />
            </span>
          ))

        if (isSummary) {
          return (
            <div
              key={i}
              className="rounded-xl px-4 py-3"
              style={{
                background: 'rgba(16,185,129,0.08)',
                border: '1px solid rgba(16,185,129,0.22)',
              }}
            >
              <p className="text-sm leading-[1.65] font-medium text-emerald-100/90">
                {renderLines()}
                {isStreaming && isLast && (
                  <span className="inline-block w-1.5 h-[1.1em] ml-0.5 align-middle bg-current opacity-60 animate-pulse rounded-sm" />
                )}
              </p>
            </div>
          )
        }

        return (
          <p key={i} className="text-sm leading-[1.65] text-white/90">
            {renderLines()}
            {isStreaming && isLast && (
              <span className="inline-block w-1.5 h-[1.1em] ml-0.5 align-middle bg-current opacity-60 animate-pulse rounded-sm" />
            )}
          </p>
        )
      })}
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
}: ChatMessageProps) {
  const isUser = role === 'user'

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
          <LeaseResponseContent content={content} isStreaming={isStreaming} />
        )}

        {!isUser && citations && citations.length > 0 && (
          <CitationCard citations={citations} />
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
