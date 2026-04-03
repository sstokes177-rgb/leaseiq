'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Menu, X, Search } from 'lucide-react'
import { AppSidebar } from './AppSidebar'
import { NotificationCenter } from './NotificationCenter'

interface SidebarLocation {
  id: string
  store_name: string
  lease_expiry: string | null
}

interface AppLayoutProps {
  children: React.ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  const [locations, setLocations] = useState<SidebarLocation[]>([])
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    fetch('/api/stores')
      .then(r => r.json())
      .then(data => {
        const stores = data.stores ?? []
        // Fetch lease expiry for each store
        fetch('/api/portfolio')
          .then(r => r.json())
          .then(portfolioData => {
            const locs = portfolioData.locations ?? []
            const expiryMap: Record<string, string | null> = {}
            for (const loc of locs) {
              expiryMap[loc.id] = loc.lease_expiry ?? null
            }
            setLocations(stores.map((s: { id: string; store_name: string }) => ({
              id: s.id,
              store_name: s.store_name,
              lease_expiry: expiryMap[s.id] ?? null,
            })))
          })
          .catch(() => {
            // If portfolio fails, just use stores without expiry
            setLocations(stores.map((s: { id: string; store_name: string }) => ({
              id: s.id,
              store_name: s.store_name,
              lease_expiry: null,
            })))
          })
      })
      .catch(() => {})
  }, [])

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop sidebar - hidden below lg */}
      <div className="hidden lg:block overflow-visible">
        <AppSidebar locations={locations} />
      </div>

      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 glass border-b border-white/[0.07]">
        <div className="flex items-center justify-between px-3 h-14">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="flex items-center justify-center w-11 h-11 rounded-lg text-gray-400 hover:text-white transition-colors"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <Link href="/dashboard" className="flex items-center gap-2">
            <div
              className="flex items-center justify-center w-7 h-7 rounded-lg"
              style={{
                background: 'linear-gradient(135deg, rgba(16,185,129,0.25), rgba(20,184,166,0.15))',
                border: '1px solid rgba(16,185,129,0.2)',
              }}
            >
              <span className="text-[10px] font-extrabold text-emerald-400">PV</span>
            </div>
            <span className="font-bold text-sm tracking-tight">Provelo</span>
          </Link>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }))
              }}
              className="flex items-center gap-2 h-8 pl-3 pr-2 rounded-lg text-gray-500 hover:text-gray-300 transition-colors"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <Search className="h-3.5 w-3.5" />
              <span className="text-xs hidden sm:inline">Search...</span>
              <kbd className="bg-white/[0.05] border border-white/10 rounded px-1.5 py-0.5 text-[10px] text-gray-500 hidden sm:inline">
                {typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.userAgent) ? '⌘K' : 'Ctrl+K'}
              </kbd>
            </button>
            <NotificationCenter />
          </div>
        </div>
      </div>

      {/* Mobile drawer overlay */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-black/60 drawer-fade-in"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div
            className="relative w-72 max-w-[85vw] h-full flex flex-col drawer-slide-in"
            style={{ background: 'rgba(8,10,16,0.98)' }}
          >
            {/* Drawer header */}
            <div className="flex items-center justify-between px-4 h-14 border-b border-white/[0.06]">
              <Link href="/dashboard" className="flex items-center gap-2" onClick={() => setMobileMenuOpen(false)}>
                <div
                  className="flex items-center justify-center w-8 h-8 rounded-lg"
                  style={{
                    background: 'linear-gradient(135deg, rgba(16,185,129,0.25), rgba(20,184,166,0.15))',
                    border: '1px solid rgba(16,185,129,0.2)',
                  }}
                >
                  <span className="text-xs font-extrabold text-emerald-400">PV</span>
                </div>
                <span className="font-bold text-base tracking-tight">Provelo</span>
              </Link>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-center w-11 h-11 rounded-lg text-gray-400 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Nav items */}
            <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
              {[
                { href: '/dashboard', label: 'Dashboard' },
                { href: '/portfolio', label: 'Portfolio' },
                { href: '/settings', label: 'Settings' },
              ].map(item => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center h-11 px-3 text-sm rounded-lg hover:bg-white/[0.06] transition-colors"
                >
                  {item.label}
                </Link>
              ))}
              <div className="border-t border-white/[0.06] pt-3 mt-3">
                <p className="text-xs uppercase text-gray-500 tracking-wider px-3 mb-2 font-semibold">Locations</p>
                {locations.map(loc => (
                  <Link
                    key={loc.id}
                    href={`/location/${loc.id}`}
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center h-11 px-3 text-sm rounded-lg hover:bg-white/[0.06] transition-colors"
                  >
                    {loc.store_name}
                  </Link>
                ))}
              </div>
            </nav>

            {/* Sign out */}
            <div className="px-3 py-4 border-t border-white/[0.06]">
              <form action="/api/auth/signout" method="POST">
                <button className="w-full flex items-center h-11 px-3 text-sm rounded-lg hover:bg-white/[0.06] text-gray-400 transition-colors">
                  Sign out
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 overflow-y-auto lg:pt-0 pt-14">
        <div className="page-fade-in">
          {children}
        </div>
      </main>
    </div>
  )
}
