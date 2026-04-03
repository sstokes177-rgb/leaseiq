'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Menu, X } from 'lucide-react'
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
      {/* Desktop sidebar */}
      <AppSidebar locations={locations} />

      {/* Mobile header + overlay menu */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 glass border-b border-white/[0.07]">
        <div className="flex items-center justify-between px-4 py-3">
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
            <NotificationCenter />
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-gray-400 hover:text-white transition-colors"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
        {mobileMenuOpen && (
          <div className="px-4 pb-4 space-y-1">
            {[
              { href: '/dashboard', label: 'Dashboard' },
              { href: '/portfolio', label: 'Portfolio' },
              { href: '/settings', label: 'Settings' },
            ].map(item => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2.5 text-sm rounded-lg hover:bg-white/[0.06] transition-colors"
              >
                {item.label}
              </Link>
            ))}
            <div className="border-t border-white/[0.06] pt-2 mt-2">
              <p className="text-xs uppercase text-gray-500 tracking-wider px-3 mb-1 font-semibold">Locations</p>
              {locations.map(loc => (
                <Link
                  key={loc.id}
                  href={`/location/${loc.id}`}
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 text-sm rounded-lg hover:bg-white/[0.06] transition-colors"
                >
                  {loc.store_name}
                </Link>
              ))}
            </div>
            <form action="/api/auth/signout" method="POST">
              <button className="w-full text-left px-3 py-2.5 text-sm rounded-lg hover:bg-white/[0.06] text-gray-400 transition-colors">
                Sign out
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto md:pt-0 pt-14">
        <div className="page-fade-in">
          {children}
        </div>
      </main>
    </div>
  )
}
