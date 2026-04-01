'use client'

import { useState, useRef, useEffect, Suspense } from 'react'
import { useChat } from '@ai-sdk/react'
import { isTextUIPart, DefaultChatTransport } from 'ai'
import { useSearchParams } from 'next/navigation'
import type { Citation } from '@/types'
import { ChatMessage } from '@/components/ChatMessage'
import { TypingIndicator } from '@/components/TypingIndicator'
import { ChatInput } from '@/components/ChatInput'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ArrowLeft, FileText, ShieldAlert, ChevronDown } from 'lucide-react'

const EXAMPLE_QUESTIONS = [
  'Who is responsible for HVAC repairs?',
  'Can I sublease part of my space?',
  'What are my options for early termination?',
  'When is my next rent increase and by how much?',
  'Can I put a sign on my storefront?',
  "What happens if I'm late on rent?",
]

interface StoreInfo {
  id: string
  store_name: string
  shopping_center_name: string | null
  suite_number: string | null
}

// ── Inner chat interface ───────────────────────────────────────────────────────
// Keyed on storeId in the parent so it fully remounts (new conversation) when
// the user switches stores. This ensures the transport always uses the correct
// store_id and messages from one store don't bleed into another.

interface ChatInterfaceProps {
  storeId: string | null
  store: StoreInfo | null
  uploadHref: string
}

function ChatInterface({ storeId, store, uploadHref }: ChatInterfaceProps) {
  const [input, setInput] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)
  const [conversationId] = useState(() => crypto.randomUUID())
  const timestampsRef = useRef<Map<string, Date>>(new Map())

  const { messages, sendMessage, status, error, clearError } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/chat',
      body: { id: conversationId, store_id: storeId },
    }),
  })

  const isLoading = status === 'streaming' || status === 'submitted'
  const showTypingIndicator = status === 'submitted'

  useEffect(() => {
    for (const msg of messages) {
      if (!timestampsRef.current.has(msg.id)) {
        timestampsRef.current.set(msg.id, new Date())
      }
    }
  }, [messages])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, showTypingIndicator])

  const handleSubmit = () => {
    if (!input.trim() || isLoading) return
    sendMessage({ text: input })
    setInput('')
  }

  return (
    <>
      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-3">
          {messages.length === 0 ? (
            <div className="space-y-10 py-4">
              <div className="text-center py-10">
                <div
                  className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-5"
                  style={{
                    background: 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(20,184,166,0.10))',
                    border: '1px solid rgba(16,185,129,0.20)',
                  }}
                >
                  <FileText className="h-8 w-8 text-emerald-400" />
                </div>
                <h2 className="font-bold text-xl">Ask anything about your lease</h2>
                <p className="text-sm text-muted-foreground mt-2 max-w-xs mx-auto font-light leading-relaxed">
                  {store
                    ? `Answers are grounded in documents for ${store.store_name}.`
                    : 'Questions are answered using the exact language from your uploaded documents.'}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground/75 uppercase tracking-widest mb-3">
                  Example questions
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {EXAMPLE_QUESTIONS.map((q) => (
                    <button
                      key={q}
                      onClick={() => { sendMessage({ text: q }) }}
                      disabled={isLoading}
                      className="text-left text-sm px-4 py-3 rounded-xl glass-card glass-card-lift text-foreground/90 hover:text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <>
              {messages.map((message, i) => {
                const text = message.parts.filter(isTextUIPart).map((p) => p.text).join('')
                const citations = (message.metadata as { citations?: Citation[] } | undefined)?.citations
                return (
                  <ChatMessage
                    key={message.id}
                    role={message.role as 'user' | 'assistant'}
                    content={text}
                    citations={citations}
                    isStreaming={isLoading && i === messages.length - 1 && message.role === 'assistant'}
                    timestamp={timestampsRef.current.get(message.id)}
                  />
                )
              })}
              {showTypingIndicator && <TypingIndicator />}
            </>
          )}
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="shrink-0 flex items-center justify-between gap-3 px-4 py-2.5 border-t border-red-500/20 bg-red-500/10">
          <p className="text-sm text-red-300/90">
            {/overload|high demand|529/i.test(error.message ?? '')
              ? 'Our AI is experiencing high demand. Please try again in a moment.'
              : (error.message ?? 'Something went wrong. Please try again.')}
          </p>
          <button onClick={clearError} className="text-xs text-red-400/70 hover:text-red-300 shrink-0">Dismiss</button>
        </div>
      )}

      {/* Input */}
      <div className="glass border-t border-white/[0.07] px-4 py-4 shrink-0">
        <div className="max-w-2xl mx-auto">
          <ChatInput value={input} onChange={setInput} onSubmit={handleSubmit} isLoading={isLoading} />
          <p className="text-xs text-muted-foreground/65 text-center mt-2">
            {store
              ? `Grounded in documents for ${store.store_name}`
              : 'Grounded in your uploaded lease documents'}
          </p>
        </div>
      </div>
    </>
  )
}

// ── Page shell with store selector ────────────────────────────────────────────

function ChatPageInner() {
  const searchParams = useSearchParams()
  const storeParam = searchParams.get('store')

  const [stores, setStores] = useState<StoreInfo[]>([])
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(storeParam)
  const [storesLoaded, setStoresLoaded] = useState(false)

  useEffect(() => {
    fetch('/api/stores')
      .then((r) => r.json())
      .then((data) => {
        const list: StoreInfo[] = data.stores ?? []
        setStores(list)
        // If no store selected yet, default to the first one
        if (!selectedStoreId && list.length > 0) {
          setSelectedStoreId(list[0].id)
        }
        setStoresLoaded(true)
      })
      .catch(() => setStoresLoaded(true))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const selectedStore = stores.find((s) => s.id === selectedStoreId) ?? stores[0] ?? null
  const backHref = selectedStoreId ? `/dashboard?store=${selectedStoreId}` : '/dashboard'
  const uploadHref = selectedStoreId ? `/upload?store=${selectedStoreId}` : '/upload'

  return (
    <div className="flex flex-col h-[100dvh]">
      {/* Header */}
      <header className="glass border-b border-white/[0.07] px-4 py-0 flex items-center gap-3 shrink-0">
        <Link
          href={backHref}
          className="text-muted-foreground/80 hover:text-foreground transition-colors p-4"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>

        <div className="flex-1 py-4 min-w-0">
          {selectedStore ? (
            <>
              <p className="font-bold text-sm leading-tight truncate">{selectedStore.store_name}</p>
              <p className="text-xs text-muted-foreground/80 leading-tight mt-0.5">
                {selectedStore.shopping_center_name
                  ? `${selectedStore.shopping_center_name}${selectedStore.suite_number ? `, Suite ${selectedStore.suite_number}` : ''} · Lease Q&A`
                  : 'Lease Q&A'}
              </p>
            </>
          ) : (
            <p className="font-semibold text-sm">Ask Your Lease</p>
          )}
        </div>

        {/* Store switcher — only shown when multiple stores exist */}
        {storesLoaded && stores.length > 1 && (
          <div className="relative py-2 shrink-0">
            <select
              value={selectedStoreId ?? ''}
              onChange={(e) => setSelectedStoreId(e.target.value)}
              className="appearance-none text-xs rounded-lg pl-3 pr-7 py-1.5 focus:outline-none cursor-pointer"
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.09)',
              }}
            >
              {stores.map((s) => (
                <option key={s.id} value={s.id} style={{ background: '#0c0e14' }}>
                  {s.store_name}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none" />
          </div>
        )}

        <div className="flex items-center gap-2 py-4 shrink-0">
          <Link href="/" className="flex items-center justify-center w-7 h-7 rounded-lg hover:opacity-80 transition-opacity"
            style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.18)' }}
          >
            <FileText className="h-3.5 w-3.5 text-emerald-400" />
          </Link>
          <Link href={uploadHref}>
            <Button variant="ghost" size="sm" className="text-xs text-muted-foreground/85">
              Docs
            </Button>
          </Link>
        </div>
      </header>

      {/* Legal disclaimer */}
      <div
        className="shrink-0 flex items-center gap-2 px-4 py-2 border-b border-white/[0.05]"
        style={{ background: 'rgba(245,158,11,0.06)' }}
      >
        <ShieldAlert className="h-3.5 w-3.5 text-amber-400/80 shrink-0" />
        <p className="text-xs text-amber-200/60 leading-tight">
          LeaseIQ provides informational summaries only — not legal advice. Consult a licensed attorney for legal interpretation.
        </p>
      </div>

      {/* Chat interface — keyed on selectedStoreId so it remounts (fresh conversation) on store change */}
      <ChatInterface
        key={selectedStoreId ?? 'no-store'}
        storeId={selectedStoreId}
        store={selectedStore}
        uploadHref={uploadHref}
      />
    </div>
  )
}

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen text-muted-foreground text-sm">Loading…</div>}>
      <ChatPageInner />
    </Suspense>
  )
}
