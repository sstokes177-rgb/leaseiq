'use client'

import { useState, useRef, useEffect, Suspense } from 'react'
import { useChat } from '@ai-sdk/react'
import { isTextUIPart, DefaultChatTransport, type UIMessage } from 'ai'
import { useSearchParams } from 'next/navigation'
import type { Citation } from '@/types'
import { ChatMessage } from '@/components/ChatMessage'
import { TypingIndicator } from '@/components/TypingIndicator'
import { ChatInput } from '@/components/ChatInput'
import { CitationSidePanel } from '@/components/CitationSidePanel'
import { ChatSidebar } from '@/components/ChatSidebar'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ArrowLeft, FileText, ShieldAlert, ChevronDown, PanelLeft, Download } from 'lucide-react'
import { exportChatHistory } from '@/lib/pdfExport'
import { useLanguage } from '@/components/LanguageProvider'

const EXAMPLE_QUESTIONS = [
  'Who is responsible for HVAC repairs?',
  'Can I sublease part of my space?',
  'What are my options for early termination?',
  'When is my next rent increase and by how much?',
  'Can I put a sign on my storefront?',
  "What happens if I'm late on rent?",
]

const EXAMPLE_QUESTIONS_ES = [
  '\u00bfQui\u00e9n es responsable de las reparaciones de HVAC?',
  '\u00bfPuedo subarrendar parte de mi espacio?',
  '\u00bfCu\u00e1les son mis opciones de terminaci\u00f3n anticipada?',
  '\u00bfCu\u00e1ndo es mi pr\u00f3ximo aumento de renta y por cu\u00e1nto?',
  '\u00bfPuedo poner un letrero en mi fachada?',
  '\u00bfQu\u00e9 pasa si me atraso en la renta?',
]

interface StoreInfo {
  id: string
  store_name: string
  shopping_center_name: string | null
  suite_number: string | null
}

interface DbMessage {
  id: string
  role: string
  content: string
  citations: Citation[] | null
}

function dbMessagesToUIMessages(dbMessages: DbMessage[]): UIMessage[] {
  return dbMessages.map(msg => ({
    id: msg.id,
    role: msg.role as 'user' | 'assistant',
    parts: [{ type: 'text' as const, text: msg.content }],
    ...(msg.role === 'assistant' && msg.citations?.length
      ? { metadata: { citations: msg.citations } }
      : {}),
  }))
}

// ── Inner chat interface ───────────────────────────────────────────────────────

interface ChatInterfaceProps {
  storeId: string | null
  store: StoreInfo | null
  conversationId: string
  initialMessages?: UIMessage[]
  onCitationClick?: (citation: Citation) => void
  onChatComplete?: () => void
  messagesRef?: React.MutableRefObject<UIMessage[]>
}

function ChatInterface({
  storeId,
  store,
  conversationId,
  initialMessages,
  onCitationClick,
  onChatComplete,
  messagesRef,
}: ChatInterfaceProps) {
  const [input, setInput] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)
  const timestampsRef = useRef<Map<string, Date>>(new Map())
  const prevStatusRef = useRef<string>('ready')
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const { lang, t } = useLanguage()
  const exampleQuestions = lang === 'es' ? EXAMPLE_QUESTIONS_ES : EXAMPLE_QUESTIONS

  const { messages, sendMessage, status, error, clearError } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/chat',
      body: { id: conversationId, store_id: storeId },
    }),
    messages: initialMessages,
  })

  const isLoading = status === 'streaming' || status === 'submitted'
  const showTypingIndicator = status === 'submitted'

  useEffect(() => {
    for (const msg of messages) {
      if (!timestampsRef.current.has(msg.id)) {
        timestampsRef.current.set(msg.id, new Date())
      }
    }
    if (messagesRef) messagesRef.current = messages
  }, [messages, messagesRef])

  useEffect(() => {
    if (scrollRef.current) {
      clearTimeout(scrollTimeoutRef.current)
      scrollTimeoutRef.current = setTimeout(() => {
        const el = scrollRef.current
        if (!el) return
        const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 150
        if (isNearBottom) {
          el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
        }
      }, 80)
    }
  }, [messages, showTypingIndicator])

  // Notify parent when a chat turn completes (for sidebar refresh)
  // Also refresh when submitted (user message was pre-saved server-side)
  useEffect(() => {
    if (prevStatusRef.current !== status) {
      if (status === 'submitted' || (prevStatusRef.current !== 'ready' && status === 'ready')) {
        onChatComplete?.()
      }
    }
    prevStatusRef.current = status
  }, [status, onChatComplete])

  const handleSubmit = () => {
    if (!input.trim() || isLoading) return
    sendMessage({ text: input })
    setInput('')
  }

  return (
    <>
      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto scroll-smooth">
        <div className="max-w-2xl mx-auto px-3 sm:px-4 py-6 space-y-3">
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
                <h2 className="font-bold text-xl">{t('chat.askAnything')}</h2>
                <p className="text-sm text-muted-foreground mt-2 max-w-xs mx-auto font-light leading-relaxed">
                  {store
                    ? `${t('chat.groundedIn')} ${store.store_name}.`
                    : t('chat.groundedGeneral')}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground/75 uppercase tracking-widest mb-3">
                  {t('chat.exampleQuestions')}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {exampleQuestions.map((q) => (
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
                    onCitationClick={onCitationClick}
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
      <div className="glass border-t border-white/[0.07] px-4 py-4 shrink-0 pb-safe">
        <div className="max-w-2xl mx-auto">
          <ChatInput value={input} onChange={setInput} onSubmit={handleSubmit} isLoading={isLoading} />
          <p className="text-xs text-muted-foreground/65 text-center mt-2">
            {store
              ? `${t('chat.groundedIn')} ${store.store_name}`
              : t('chat.groundedGeneral')}
          </p>
        </div>
      </div>
    </>
  )
}

// ── Page shell ────────────────────────────────────────────────────────────────

function ChatPageInner() {
  const searchParams = useSearchParams()
  const storeParam = searchParams.get('store')
  const { t } = useLanguage()

  const [stores, setStores] = useState<StoreInfo[]>([])
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(storeParam)
  const [storesLoaded, setStoresLoaded] = useState(false)
  const [activeCitation, setActiveCitation] = useState<Citation | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  // Conversation management
  const [activeConversationId, setActiveConversationId] = useState<string>(() => crypto.randomUUID())
  const [initialMessages, setInitialMessages] = useState<UIMessage[] | undefined>(undefined)
  const [chatKey, setChatKey] = useState(0)
  const [sidebarRefresh, setSidebarRefresh] = useState(0)
  const chatMessagesRef = useRef<UIMessage[]>([])

  useEffect(() => {
    fetch('/api/stores')
      .then((r) => r.json())
      .then((data) => {
        const list: StoreInfo[] = data.stores ?? []
        setStores(list)
        if (!selectedStoreId && list.length > 0) {
          setSelectedStoreId(list[0].id)
        }
        setStoresLoaded(true)
      })
      .catch(() => setStoresLoaded(true))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const selectedStore = stores.find((s) => s.id === selectedStoreId) ?? stores[0] ?? null
  const backHref = selectedStoreId ? `/location/${selectedStoreId}` : '/dashboard'
  const uploadHref = selectedStoreId ? `/upload?store=${selectedStoreId}` : '/upload'

  const handleCitationClick = (citation: Citation) => {
    setActiveCitation(prev =>
      prev?.chunk_id === citation.chunk_id && prev?.articleNumber === citation.articleNumber
        ? null
        : citation
    )
  }

  const handleNewChat = () => {
    setActiveConversationId(crypto.randomUUID())
    setInitialMessages(undefined)
    setChatKey(k => k + 1)
    setActiveCitation(null)
    setSidebarOpen(false)
  }

  const handleSelectConversation = async (id: string) => {
    if (id === activeConversationId) { setSidebarOpen(false); return }
    try {
      const res = await fetch(`/api/conversations/${id}`)
      if (res.ok) {
        const data = await res.json()
        const uiMessages = dbMessagesToUIMessages(data.messages ?? [])
        setInitialMessages(uiMessages)
        setActiveConversationId(id)
        setChatKey(k => k + 1)
        setActiveCitation(null)
        setSidebarOpen(false)
      }
    } catch {
      // Fail silently — user can try again
    }
  }

  const handleChatComplete = () => {
    setSidebarRefresh(s => s + 1)
  }

  return (
    <div className="flex h-[100dvh]">
      {/* Desktop sidebar */}
      <div className="hidden md:flex flex-col w-56 shrink-0 border-r border-white/[0.07]"
        style={{ background: 'rgba(8,10,16,0.95)' }}
      >
        <ChatSidebar
          storeId={selectedStoreId}
          activeConversationId={activeConversationId}
          onNewChat={handleNewChat}
          onSelectConversation={handleSelectConversation}
          refreshSignal={sidebarRefresh}
        />
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-30 flex">
          <div
            className="w-64 flex flex-col border-r border-white/[0.07]"
            style={{ background: 'rgba(8,10,16,0.98)' }}
          >
            <ChatSidebar
              storeId={selectedStoreId}
              activeConversationId={activeConversationId}
              onNewChat={handleNewChat}
              onSelectConversation={handleSelectConversation}
              refreshSignal={sidebarRefresh}
            />
          </div>
          <div className="flex-1" onClick={() => setSidebarOpen(false)} />
        </div>
      )}

      {/* Main area */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Header */}
        <header className="glass border-b border-white/[0.07] px-3 py-0 flex items-center gap-2 shrink-0">
          {/* Mobile sidebar toggle */}
          <button
            onClick={() => setSidebarOpen(o => !o)}
            className="md:hidden p-3 text-muted-foreground/70 hover:text-foreground transition-colors"
          >
            <PanelLeft className="h-4 w-4" />
          </button>

          <Link
            href={backHref}
            className="text-muted-foreground/80 hover:text-foreground transition-colors p-3"
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

          {/* Store switcher */}
          {storesLoaded && stores.length > 1 && (
            <div className="relative py-2 shrink-0">
              <select
                value={selectedStoreId ?? ''}
                onChange={(e) => {
                  setSelectedStoreId(e.target.value)
                  // Reset conversation when switching stores
                  setActiveConversationId(crypto.randomUUID())
                  setInitialMessages(undefined)
                  setChatKey(k => k + 1)
                  setActiveCitation(null)
                  setSidebarRefresh(s => s + 1)
                }}
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
            <button
              onClick={() => {
                const msgs = chatMessagesRef.current
                if (msgs.length === 0) return
                const chatMessages = msgs.map(m => ({
                  role: m.role,
                  content: m.parts.filter(isTextUIPart).map(p => p.text).join(''),
                }))
                exportChatHistory(chatMessages, selectedStore?.store_name ?? 'Lease')
              }}
              title="Download chat as PDF"
              className="text-muted-foreground/50 hover:text-emerald-400 transition-colors p-2"
            >
              <Download className="h-4 w-4" />
            </button>
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
            {t('chat.disclaimer')}
          </p>
        </div>

        {/* Body: chat + optional citation panel */}
        <div className="flex flex-1 min-h-0">
          <div className="flex flex-col flex-1 min-w-0 min-h-0">
            <ChatInterface
              key={`${selectedStoreId ?? 'no-store'}-${chatKey}`}
              storeId={selectedStoreId}
              store={selectedStore}
              conversationId={activeConversationId}
              initialMessages={initialMessages}
              messagesRef={chatMessagesRef}
              onCitationClick={handleCitationClick}
              onChatComplete={handleChatComplete}
            />
          </div>
          <CitationSidePanel
            citation={activeCitation}
            onClose={() => setActiveCitation(null)}
          />
        </div>
      </div>
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
