'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { LanguageProvider } from './LanguageProvider'
import { CommandPalette } from './CommandPalette'

export function ClientProviders({ children }: { children: React.ReactNode }) {
  const [paletteOpen, setPaletteOpen] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey

      // Cmd+K / Ctrl+K — toggle command palette
      if (mod && e.key === 'k') {
        e.preventDefault()
        setPaletteOpen(prev => !prev)
        return
      }

      // Cmd+N / Ctrl+N — new chat
      if (mod && e.key === 'n') {
        e.preventDefault()
        // If on a location page, navigate to chat for that store
        const storeMatch = pathname.match(/^\/location\/([^/]+)/)
        if (storeMatch) {
          router.push(`/chat?store=${storeMatch[1]}`)
        } else {
          router.push('/chat')
        }
        return
      }

      // Cmd+U / Ctrl+U — upload document
      if (mod && e.key === 'u') {
        e.preventDefault()
        const storeMatch = pathname.match(/^\/location\/([^/]+)/)
        if (storeMatch) {
          router.push(`/upload?store=${storeMatch[1]}`)
        } else {
          router.push('/upload')
        }
        return
      }

      // Escape — close palette
      if (e.key === 'Escape') {
        setPaletteOpen(false)
      }
    }

    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [router, pathname])

  return (
    <LanguageProvider>
      {children}
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </LanguageProvider>
  )
}
