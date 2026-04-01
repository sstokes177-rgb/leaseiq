'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Trash2, MessageSquare, Loader2 } from 'lucide-react'

interface ConversationItem {
  id: string
  title: string | null
  created_at: string
  store_id: string | null
}

interface ChatSidebarProps {
  storeId: string | null
  activeConversationId: string | null
  onNewChat: () => void
  onSelectConversation: (id: string) => void
  refreshSignal?: number
}

function relativeDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function ChatSidebar({
  storeId,
  activeConversationId,
  onNewChat,
  onSelectConversation,
  refreshSignal,
}: ChatSidebarProps) {
  const [conversations, setConversations] = useState<ConversationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const fetchConversations = useCallback(async () => {
    const url = storeId
      ? `/api/conversations?store_id=${storeId}`
      : '/api/conversations'
    try {
      const res = await fetch(url)
      if (res.ok) {
        const data = await res.json()
        setConversations(data.conversations ?? [])
      }
    } catch {
      // Fail silently
    } finally {
      setLoading(false)
    }
  }, [storeId])

  useEffect(() => {
    setLoading(true)
    fetchConversations()
  }, [fetchConversations, refreshSignal])

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    setDeletingId(id)
    try {
      await fetch(`/api/conversations?id=${id}`, { method: 'DELETE' })
      setConversations(prev => prev.filter(c => c.id !== id))
      if (activeConversationId === id) onNewChat()
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-3 py-3 border-b border-white/[0.07]">
        <button
          onClick={onNewChat}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors hover:bg-white/[0.07]"
          style={{ border: '1px solid rgba(255,255,255,0.09)' }}
        >
          <Plus className="h-3.5 w-3.5 text-emerald-400" />
          New Chat
        </button>
      </div>

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto py-2">
        {loading ? (
          <div className="flex items-center justify-center py-6 text-muted-foreground/60">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        ) : conversations.length === 0 ? (
          <div className="px-4 py-6 text-center">
            <MessageSquare className="h-6 w-6 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-xs text-muted-foreground/50">No conversations yet</p>
          </div>
        ) : (
          <div className="space-y-0.5 px-2">
            {conversations.map((conv) => {
              const isActive = conv.id === activeConversationId
              const title = conv.title ?? 'Untitled conversation'
              const date = relativeDate(conv.created_at)

              return (
                <div
                  key={conv.id}
                  onClick={() => onSelectConversation(conv.id)}
                  className={`group relative flex items-start gap-2 px-2 py-2 rounded-lg cursor-pointer transition-colors ${
                    isActive
                      ? 'bg-emerald-500/10 border border-emerald-500/20'
                      : 'hover:bg-white/[0.05] border border-transparent'
                  }`}
                >
                  <MessageSquare className={`h-3.5 w-3.5 shrink-0 mt-0.5 ${isActive ? 'text-emerald-400' : 'text-muted-foreground/40'}`} />
                  <div className="flex-1 min-w-0 pr-5">
                    <p className={`text-xs leading-snug truncate ${isActive ? 'text-white/90 font-medium' : 'text-white/70'}`}>
                      {title}
                    </p>
                    <p className="text-[10px] text-muted-foreground/45 mt-0.5">{date}</p>
                  </div>
                  <button
                    onClick={(e) => handleDelete(e, conv.id)}
                    disabled={deletingId === conv.id}
                    className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1 rounded text-muted-foreground/50 hover:text-red-400 transition-all disabled:opacity-30"
                  >
                    {deletingId === conv.id
                      ? <Loader2 className="h-3 w-3 animate-spin" />
                      : <Trash2 className="h-3 w-3" />}
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
