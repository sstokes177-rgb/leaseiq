'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  LayoutDashboard, PieChart, Settings, MapPin,
  MessageSquare, Upload, ShieldAlert, FileSearch,
  Search, MessagesSquare, Command,
} from 'lucide-react'

interface CommandItem {
  id: string
  label: string
  icon: React.ReactNode
  shortcut?: string
  action: () => void
  section: 'navigation' | 'actions' | 'search'
}

interface Store {
  id: string
  store_name: string
}

interface CommandPaletteProps {
  open: boolean
  onClose: () => void
}

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [stores, setStores] = useState<Store[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // Fetch stores when palette opens
  useEffect(() => {
    if (!open) return
    setQuery('')
    setSelectedIndex(0)
    fetch('/api/stores')
      .then(r => r.json())
      .then(data => setStores(data.stores ?? []))
      .catch(() => {})
  }, [open])

  // Autofocus input
  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }, [open])

  const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.userAgent)
  const mod = isMac ? '\u2318' : 'Ctrl+'

  const execute = (action: () => void) => {
    onClose()
    action()
  }

  const commands = useMemo<CommandItem[]>(() => {
    const nav: CommandItem[] = [
      { id: 'nav-dashboard', label: 'Go to Dashboard', icon: <LayoutDashboard className="h-4 w-4" />, action: () => router.push('/dashboard'), section: 'navigation' },
      { id: 'nav-portfolio', label: 'Go to Portfolio', icon: <PieChart className="h-4 w-4" />, action: () => router.push('/portfolio'), section: 'navigation' },
      { id: 'nav-settings', label: 'Go to Settings', icon: <Settings className="h-4 w-4" />, shortcut: undefined, action: () => router.push('/settings'), section: 'navigation' },
    ]

    for (const store of stores) {
      nav.push({
        id: `nav-store-${store.id}`,
        label: `Go to ${store.store_name}`,
        icon: <MapPin className="h-4 w-4" />,
        action: () => router.push(`/location/${store.id}`),
        section: 'navigation',
      })
    }

    const actions: CommandItem[] = [
      { id: 'act-new-chat', label: 'New Chat', icon: <MessageSquare className="h-4 w-4" />, shortcut: `${mod}N`, action: () => router.push('/chat'), section: 'actions' },
      { id: 'act-upload', label: 'Upload Document', icon: <Upload className="h-4 w-4" />, shortcut: `${mod}U`, action: () => router.push('/upload'), section: 'actions' },
      { id: 'act-risk', label: 'Analyze Risk Score', icon: <ShieldAlert className="h-4 w-4" />, action: () => router.push('/dashboard'), section: 'actions' },
    ]

    const search: CommandItem[] = [
      { id: 'search-docs', label: 'Search documents...', icon: <FileSearch className="h-4 w-4" />, action: () => router.push('/dashboard'), section: 'search' },
      { id: 'search-convos', label: 'Search conversations...', icon: <MessagesSquare className="h-4 w-4" />, action: () => router.push('/chat'), section: 'search' },
    ]

    return [...nav, ...actions, ...search]
  }, [stores, router, mod])

  // Fuzzy filter
  const filtered = useMemo(() => {
    if (!query.trim()) return commands
    const q = query.toLowerCase()
    return commands.filter(c => c.label.toLowerCase().includes(q)).slice(0, 8)
  }, [commands, query])

  // Reset selection when filter changes
  useEffect(() => {
    setSelectedIndex(0)
  }, [filtered.length, query])

  // Scroll selected item into view
  useEffect(() => {
    if (!listRef.current) return
    const items = listRef.current.querySelectorAll('[data-command-item]')
    items[selectedIndex]?.scrollIntoView({ block: 'nearest' })
  }, [selectedIndex])

  // Keyboard nav within palette
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex(i => (i + 1) % filtered.length)
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex(i => (i - 1 + filtered.length) % filtered.length)
      } else if (e.key === 'Enter') {
        e.preventDefault()
        const item = filtered[selectedIndex]
        if (item) execute(item.action)
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, filtered, selectedIndex])

  if (!open) return null

  // Group filtered items by section
  const sections: { key: string; label: string; items: CommandItem[] }[] = []
  const grouped: Record<string, CommandItem[]> = {}
  for (const item of filtered) {
    if (!grouped[item.section]) grouped[item.section] = []
    grouped[item.section].push(item)
  }
  const sectionOrder = ['navigation', 'actions', 'search'] as const
  const sectionLabels: Record<string, string> = { navigation: 'Navigation', actions: 'Actions', search: 'Search' }
  for (const key of sectionOrder) {
    if (grouped[key]?.length) {
      sections.push({ key, label: sectionLabels[key], items: grouped[key] })
    }
  }

  // Flat index for keyboard navigation
  let flatIndex = 0

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
      onClick={onClose}
      style={{ animation: 'cmd-overlay-in 150ms ease-out both' }}
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Card */}
      <div
        className="relative max-w-[600px] w-full mx-4 rounded-xl shadow-2xl overflow-hidden"
        style={{
          background: 'rgba(17,19,27,0.95)',
          border: '1px solid rgba(255,255,255,0.10)',
          animation: 'cmd-card-in 150ms ease-out both',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-5 border-b border-white/[0.08]">
          <Search className="h-4 w-4 text-muted-foreground/60 shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Type a command or search..."
            className="w-full bg-transparent text-white text-lg py-4 outline-none placeholder:text-muted-foreground/40"
          />
          <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] text-muted-foreground/50 border border-white/[0.08] bg-white/[0.04] shrink-0">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[400px] overflow-y-auto py-2">
          {sections.map(section => (
            <div key={section.key}>
              <p className="px-5 py-2 text-xs uppercase tracking-wider text-gray-500 font-medium">
                {section.label}
              </p>
              {section.items.map(item => {
                const idx = flatIndex++
                return (
                  <button
                    key={item.id}
                    data-command-item
                    onClick={() => execute(item.action)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`w-full px-4 py-3 flex items-center gap-3 cursor-pointer rounded-lg mx-2 text-left transition-colors ${
                      idx === selectedIndex ? 'bg-white/[0.06]' : 'hover:bg-white/[0.04]'
                    }`}
                    style={{ width: 'calc(100% - 16px)' }}
                  >
                    <span className="text-muted-foreground/70">{item.icon}</span>
                    <span className="flex-1 text-sm text-white/90">{item.label}</span>
                    {item.shortcut && (
                      <kbd className="text-[10px] text-muted-foreground/50 border border-white/[0.08] bg-white/[0.04] px-1.5 py-0.5 rounded">
                        {item.shortcut}
                      </kbd>
                    )}
                  </button>
                )
              })}
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="px-5 py-8 text-center">
              <Command className="h-6 w-6 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground/50">No results found</p>
            </div>
          )}
        </div>

        {/* Footer hints */}
        <div className="px-5 py-2.5 border-t border-white/[0.06] flex items-center gap-4 text-[10px] text-muted-foreground/40">
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 rounded border border-white/[0.08] bg-white/[0.04]">&uarr;</kbd>
            <kbd className="px-1 py-0.5 rounded border border-white/[0.08] bg-white/[0.04]">&darr;</kbd>
            navigate
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded border border-white/[0.08] bg-white/[0.04]">&crarr;</kbd>
            select
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 rounded border border-white/[0.08] bg-white/[0.04]">esc</kbd>
            close
          </span>
        </div>
      </div>
    </div>
  )
}
