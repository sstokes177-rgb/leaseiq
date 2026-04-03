'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Home, LayoutDashboard, Briefcase, Settings, Plus,
  ChevronLeft, ChevronRight, Search,
} from 'lucide-react'

interface SidebarLocation {
  id: string
  store_name: string
  lease_expiry: string | null
}

interface AppSidebarProps {
  locations?: SidebarLocation[]
}

const NAV_ITEMS = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/portfolio', label: 'Portfolio', icon: Briefcase },
  { href: '/settings', label: 'Settings', icon: Settings },
]

function getStatusDotColor(leaseExpiry: string | null): string {
  if (!leaseExpiry) return 'bg-gray-500' // no lease data
  const d = new Date(leaseExpiry)
  if (isNaN(d.getTime())) return 'bg-gray-500'
  const now = new Date()
  const diffMs = d.getTime() - now.getTime()
  const diffDays = diffMs / (1000 * 60 * 60 * 24)
  if (diffDays < 0) return 'bg-red-500' // expired
  if (diffDays < 180) return 'bg-red-500' // <6 months
  if (diffDays < 730) return 'bg-amber-500' // <2 years
  return 'bg-emerald-500' // >2 years
}

export function AppSidebar({ locations = [] }: AppSidebarProps) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [isMac, setIsMac] = useState(false)

  // Load expanded state from localStorage (default: expanded)
  useEffect(() => {
    const saved = localStorage.getItem('provelo_sidebar_expanded')
    if (saved === 'false') setCollapsed(true)
    setIsMac(/Mac|iPhone|iPad/.test(navigator.userAgent))
  }, [])

  const toggleCollapsed = () => {
    const next = !collapsed
    setCollapsed(next)
    localStorage.setItem('provelo_sidebar_expanded', String(!next))
  }

  return (
    <aside
      className={`hidden lg:flex flex-col shrink-0 border-r border-white/[0.06] sidebar-transition relative ${
        collapsed ? 'w-12' : 'w-56'
      }`}
      style={{ background: 'rgba(8,10,16,0.95)' }}
    >
      {/* Toggle button — prominent, on the right edge */}
      <button
        onClick={toggleCollapsed}
        className="absolute top-16 -right-4 z-10 w-8 h-8 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 border border-white/10 transition-colors text-gray-300 hover:text-white"
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
      </button>

      {/* Top: Logo */}
      <div className="flex items-center px-3 py-4">
        <Link href="/" className="flex items-center gap-2.5 group min-w-0">
          <div
            className="flex items-center justify-center w-8 h-8 rounded-xl shrink-0 transition-opacity group-hover:opacity-80"
            style={{
              background: 'linear-gradient(135deg, rgba(16,185,129,0.25), rgba(20,184,166,0.15))',
              border: '1px solid rgba(16,185,129,0.2)',
            }}
          >
            <span className="text-xs font-extrabold text-emerald-400">PV</span>
          </div>
          {!collapsed && (
            <span className="font-bold text-base tracking-tight truncate">Provelo</span>
          )}
        </Link>
      </div>

      {/* Main nav */}
      <nav className="px-2 space-y-0.5">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/dashboard' && item.href !== '/' && pathname.startsWith(item.href))
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-colors relative ${
                isActive
                  ? 'bg-white/[0.05] text-white font-medium'
                  : 'text-gray-400 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-emerald-500" />
              )}
              <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-emerald-400' : ''}`} />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          )
        })}
      </nav>

      {/* Divider */}
      <div className="mx-3 my-3 border-t border-white/[0.06]" />

      {/* Locations section */}
      {!collapsed && (
        <div className="flex-1 min-h-0 flex flex-col">
          <p className="text-xs uppercase text-gray-500 tracking-wider px-4 mb-2 font-semibold">
            Locations
          </p>
          <div className="flex-1 overflow-y-auto px-2 space-y-0.5">
            {locations.map((loc) => {
              const isActive = pathname === `/location/${loc.id}`
              const dotColor = getStatusDotColor(loc.lease_expiry)
              return (
                <Link
                  key={loc.id}
                  href={`/location/${loc.id}`}
                  className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-colors relative ${
                    isActive
                      ? 'bg-white/[0.05] text-white font-medium'
                      : 'text-gray-400 hover:text-white hover:bg-white/[0.04]'
                  }`}
                >
                  {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-emerald-500" />
                  )}
                  <span className={`w-2 h-2 rounded-full shrink-0 ${dotColor}`} />
                  <span className="truncate">{loc.store_name}</span>
                </Link>
              )
            })}
            {locations.length === 0 && (
              <p className="text-xs text-gray-600 px-2.5 py-2">No locations yet</p>
            )}
          </div>

          {/* Add Location button */}
          <div className="px-2 py-3">
            <Link
              href="/dashboard"
              id="sidebar-add-location"
              className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-white/[0.05] transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Location
            </Link>
          </div>
        </div>
      )}

      {/* Collapsed: just show location dots */}
      {collapsed && (
        <div className="flex-1 min-h-0 flex flex-col items-center px-1 py-2 space-y-2 overflow-y-auto">
          {locations.map((loc) => {
            const isActive = pathname === `/location/${loc.id}`
            const dotColor = getStatusDotColor(loc.lease_expiry)
            return (
              <Link
                key={loc.id}
                href={`/location/${loc.id}`}
                className={`relative w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                  isActive ? 'bg-white/[0.05]' : 'hover:bg-white/[0.04]'
                }`}
                title={loc.store_name}
              >
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-r-full bg-emerald-500" />
                )}
                <span className={`w-2.5 h-2.5 rounded-full ${dotColor}`} />
              </Link>
            )
          })}
          <Link
            href="/dashboard"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/[0.05] transition-colors"
            title="Add Location"
          >
            <Plus className="h-3.5 w-3.5" />
          </Link>
        </div>
      )}

      {/* About link + Ctrl+K shortcut hint */}
      <div className="px-2 pb-3 mt-auto">
        {!collapsed && (
          <Link
            href="/about"
            className="flex items-center px-2.5 py-1.5 rounded-lg text-xs text-gray-500 hover:text-gray-300 hover:bg-white/[0.05] transition-colors mb-1"
          >
            About Provelo
          </Link>
        )}
      </div>
      <div className="px-2 pb-3">
        <button
          onClick={() => {
            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }))
          }}
          className={`flex items-center gap-2 w-full rounded-lg transition-colors text-gray-500 hover:text-gray-300 hover:bg-white/[0.05] ${
            collapsed ? 'justify-center px-0 py-2' : 'px-2.5 py-2'
          }`}
          title="Quick actions"
        >
          <Search className="h-3.5 w-3.5 shrink-0" />
          {!collapsed && (
            <>
              <span className="text-xs truncate">Search</span>
              <kbd className="ml-auto bg-white/[0.05] border border-white/10 rounded-md px-1.5 py-0.5 text-[10px] text-gray-500 shrink-0">
                {isMac ? '⌘K' : 'Ctrl+K'}
              </kbd>
            </>
          )}
        </button>
      </div>
    </aside>
  )
}
