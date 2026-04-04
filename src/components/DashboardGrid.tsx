'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Building2, MapPin, Search, X, Sparkles, Loader2, LayoutGrid, List, ChevronRight, FileText } from 'lucide-react'
import { useLanguage } from './LanguageProvider'

interface StoreWithCount {
  id: string
  store_name: string
  shopping_center_name: string | null
  suite_number: string | null
  address: string | null
  asset_class: string | null
  created_at: string
  doc_count: number
  lease_expiry: string | null
  risk_score: number | null
}

type ViewMode = 'grid' | 'list'

interface DashboardGridProps {
  stores: StoreWithCount[]
}

const ASSET_CLASSES = ['Retail', 'Office', 'Industrial', 'Mixed-Use', 'Medical', 'Restaurant', 'Grocery', 'Other']

const ASSET_CLASS_COLORS: Record<string, string> = {
  Retail: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25',
  Office: 'bg-blue-500/15 text-blue-300 border-blue-500/25',
  Industrial: 'bg-orange-500/15 text-orange-300 border-orange-500/25',
  'Mixed-Use': 'bg-violet-500/15 text-violet-300 border-violet-500/25',
  Medical: 'bg-rose-500/15 text-rose-300 border-rose-500/25',
  Restaurant: 'bg-amber-500/15 text-amber-300 border-amber-500/25',
  Grocery: 'bg-lime-500/15 text-lime-300 border-lime-500/25',
  Other: 'bg-slate-500/15 text-slate-300 border-slate-500/25',
}

type SortKey = 'name_asc' | 'name_desc' | 'recent' | 'expiry'

function AssetClassBadge({ storeId, assetClass, docCount }: { storeId: string; assetClass: string | null; docCount: number }) {
  const [detecting, setDetecting] = useState(false)
  const [detected, setDetected] = useState(assetClass)

  if (detected) {
    const cls = ASSET_CLASS_COLORS[detected] ?? ASSET_CLASS_COLORS.Other
    return (
      <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${cls}`}>
        {detected}
      </span>
    )
  }

  if (docCount === 0) return null

  return (
    <button
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        setDetecting(true)
        fetch(`/api/stores/${storeId}/detect-asset-class`, { method: 'POST' })
          .then(r => r.ok ? r.json() : null)
          .then(data => { if (data?.asset_class) setDetected(data.asset_class) })
          .catch(() => {})
          .finally(() => setDetecting(false))
      }}
      disabled={detecting}
      className="text-[10px] px-1.5 py-0.5 rounded border border-white/[0.08] bg-white/[0.04] text-muted-foreground/60 hover:text-emerald-300 hover:border-emerald-500/25 transition-colors flex items-center gap-1"
    >
      {detecting ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <Sparkles className="h-2.5 w-2.5" />}
      {detecting ? 'Detecting...' : 'Detect type'}
    </button>
  )
}

function getLeaseStatus(expiry: string | null): 'active' | 'expiring' | 'expired' | 'unknown' {
  if (!expiry) return 'unknown'
  const d = new Date(expiry)
  if (isNaN(d.getTime())) return 'unknown'
  const now = new Date()
  if (d <= now) return 'expired'
  const sixMonths = new Date()
  sixMonths.setMonth(sixMonths.getMonth() + 6)
  if (d <= sixMonths) return 'expiring'
  return 'active'
}

function formatLeaseRemaining(expiry: string | null): string {
  if (!expiry) return ''
  const d = new Date(expiry)
  if (isNaN(d.getTime())) return ''
  const now = new Date()
  if (d <= now) return 'Expired'
  const diffMs = d.getTime() - now.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  if (diffDays < 30) return `${diffDays}d remaining`
  const diffMonths = Math.floor(diffDays / 30.44)
  if (diffMonths < 12) return `${diffMonths}mo remaining`
  const years = Math.floor(diffMonths / 12)
  const months = diffMonths % 12
  return months > 0 ? `${years}y ${months}mo remaining` : `${years}y remaining`
}

export function DashboardGrid({ stores }: DashboardGridProps) {
  const { t } = useLanguage()
  const [search, setSearch] = useState('')
  const [stateFilter, setStateFilter] = useState('')
  const [assetFilter, setAssetFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('recent')
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('provelo_location_view') as ViewMode) || 'grid'
    }
    return 'grid'
  })

  const toggleView = (mode: ViewMode) => {
    setViewMode(mode)
    localStorage.setItem('provelo_location_view', mode)
  }

  // Extract unique states from addresses
  const availableStates = useMemo(() => {
    const states = new Set<string>()
    for (const s of stores) {
      if (s.address) {
        // Try to extract state abbreviation from address (e.g., "123 Main St, Atlanta, GA 30301")
        const stateMatch = s.address.match(/\b([A-Z]{2})\s+\d{5}/) ?? s.address.match(/,\s*([A-Z]{2})\s*$/)
        if (stateMatch) states.add(stateMatch[1])
      }
    }
    return [...states].sort()
  }, [stores])

  const hasFilters = search || stateFilter || assetFilter || statusFilter

  const filtered = useMemo(() => {
    let result = stores

    // Search
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(s =>
        s.store_name.toLowerCase().includes(q) ||
        (s.address?.toLowerCase().includes(q)) ||
        (s.shopping_center_name?.toLowerCase().includes(q)) ||
        (s.suite_number?.toLowerCase().includes(q))
      )
    }

    // State filter — use word boundary to avoid matching substrings (e.g. "CA" in "CALIFORNIA")
    if (stateFilter) {
      const stateRe = new RegExp(`\\b${stateFilter}\\b`)
      result = result.filter(s => {
        if (!s.address) return false
        return stateRe.test(s.address)
      })
    }

    // Asset class filter
    if (assetFilter) {
      result = result.filter(s => s.asset_class === assetFilter)
    }

    // Status filter — handle null and invalid date strings
    if (statusFilter === 'active') {
      result = result.filter(s => {
        if (!s.lease_expiry) return true
        const d = new Date(s.lease_expiry)
        return isNaN(d.getTime()) || d > new Date()
      })
    } else if (statusFilter === 'expired') {
      result = result.filter(s => {
        if (!s.lease_expiry) return false
        const d = new Date(s.lease_expiry)
        return !isNaN(d.getTime()) && d <= new Date()
      })
    }

    // Sort
    switch (sortKey) {
      case 'name_asc':
        result = [...result].sort((a, b) => a.store_name.localeCompare(b.store_name))
        break
      case 'name_desc':
        result = [...result].sort((a, b) => b.store_name.localeCompare(a.store_name))
        break
      case 'recent':
        result = [...result].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        break
      case 'expiry':
        result = [...result].sort((a, b) => {
          if (!a.lease_expiry) return 1
          if (!b.lease_expiry) return -1
          return new Date(a.lease_expiry).getTime() - new Date(b.lease_expiry).getTime()
        })
        break
    }

    return result
  }, [stores, search, stateFilter, assetFilter, statusFilter, sortKey])

  return (
    <div className="space-y-4">
      {/* Search bar */}
      <div
        className="relative flex items-center rounded-xl overflow-hidden"
        style={{
          background: 'rgba(255,255,255,0.04)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.09)',
        }}
      >
        <Search className="h-4 w-4 text-muted-foreground/50 ml-4 shrink-0" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('dashboard.searchPlaceholder')}
          className="flex-1 bg-transparent px-3 py-3 text-sm placeholder:text-muted-foreground/40 focus:outline-none"
        />
        {search && (
          <button onClick={() => setSearch('')} className="p-2 mr-1 text-muted-foreground/50 hover:text-foreground transition-colors">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Filters row */}
      <div className="flex flex-wrap items-center gap-2">
        {/* State */}
        {availableStates.length > 0 && (
          <SelectFilter
            label="State"
            value={stateFilter}
            onChange={setStateFilter}
            options={availableStates.map(s => ({ value: s, label: s }))}
          />
        )}

        {/* Asset class */}
        <SelectFilter
          label="Asset Class"
          value={assetFilter}
          onChange={setAssetFilter}
          options={ASSET_CLASSES.map(c => ({ value: c, label: c }))}
        />

        {/* Status */}
        <SelectFilter
          label="Status"
          value={statusFilter}
          onChange={setStatusFilter}
          options={[
            { value: 'active', label: 'Active Lease' },
            { value: 'expired', label: 'Expired Lease' },
          ]}
        />

        {/* Sort */}
        <SelectFilter
          label="Sort by"
          value={sortKey}
          onChange={(v) => setSortKey(v as SortKey)}
          options={[
            { value: 'recent', label: 'Most Recent' },
            { value: 'name_asc', label: 'Name A–Z' },
            { value: 'name_desc', label: 'Name Z–A' },
            { value: 'expiry', label: 'Lease Expiration' },
          ]}
          showAll={false}
        />

        {/* Clear filters */}
        {hasFilters && (
          <button
            onClick={() => { setSearch(''); setStateFilter(''); setAssetFilter(''); setStatusFilter('') }}
            className="text-xs text-emerald-400/80 hover:text-emerald-300 px-2 py-1.5 transition-colors"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Results count + view toggle */}
      <div className="flex items-center justify-between">
        {hasFilters ? (
          <p className="text-xs text-muted-foreground/60">
            {filtered.length} of {stores.length} location{stores.length !== 1 ? 's' : ''}
          </p>
        ) : (
          <div />
        )}
        <div className="flex items-center gap-1">
          <button
            onClick={() => toggleView('grid')}
            className={`p-1.5 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-white/[0.1] text-emerald-400' : 'text-gray-500 hover:text-gray-300'}`}
            aria-label="Grid view"
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            onClick={() => toggleView('list')}
            className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-white/[0.1] text-emerald-400' : 'text-gray-500 hover:text-gray-300'}`}
            aria-label="List view"
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Grid / List */}
      {filtered.length > 0 ? (
        viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map((store) => (
              <Link
                key={store.id}
                href={`/location/${store.id}`}
                className="glass-card glass-card-lift p-5 block transition-all"
              >
                <div className="flex items-start gap-3 mb-3">
                  <div
                    className="flex items-center justify-center w-9 h-9 rounded-xl shrink-0"
                    style={{
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.09)',
                    }}
                  >
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate">{store.store_name}</p>
                    {store.shopping_center_name && (
                      <p className="text-xs text-muted-foreground/70 truncate mt-0.5 flex items-center gap-1">
                        <MapPin className="h-3 w-3 shrink-0" />
                        {store.shopping_center_name}
                        {store.suite_number && `, Suite ${store.suite_number}`}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-xs text-muted-foreground/70">
                    {store.doc_count === 0
                      ? t('dashboard.noDocuments')
                      : `${store.doc_count} ${t('dashboard.documents')}`}
                  </p>
                  <AssetClassBadge storeId={store.id} assetClass={store.asset_class} docCount={store.doc_count} />
                </div>
              </Link>
            ))}
          </div>
        ) : (
          /* ── List View ─────────────────────────────────────── */
          <div
            className="rounded-xl overflow-hidden"
            style={{ border: '1px solid rgba(255,255,255,0.06)' }}
          >
            {filtered.map((store, idx) => {
              const status = getLeaseStatus(store.lease_expiry)
              const statusDotColor =
                status === 'expired' ? 'bg-red-400' :
                status === 'expiring' ? 'bg-amber-400' :
                status === 'active' ? 'bg-emerald-400' :
                'bg-gray-500'
              const remaining = formatLeaseRemaining(store.lease_expiry)
              const riskColor =
                store.risk_score != null
                  ? store.risk_score >= 70 ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25'
                    : store.risk_score >= 40 ? 'bg-amber-500/15 text-amber-300 border-amber-500/25'
                    : 'bg-red-500/15 text-red-300 border-red-500/25'
                  : ''

              return (
                <Link
                  key={store.id}
                  href={`/location/${store.id}`}
                  className={`flex items-center gap-3 sm:gap-4 px-4 py-3 transition-colors hover:bg-white/[0.03] ${
                    idx < filtered.length - 1 ? 'border-b border-white/[0.06]' : ''
                  }`}
                >
                  {/* Status dot */}
                  <span className={`w-2 h-2 rounded-full shrink-0 ${statusDotColor}`} />

                  {/* Name + address */}
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm text-white truncate">{store.store_name}</p>
                    <p className="text-xs text-gray-400 truncate">
                      {store.shopping_center_name ?? store.address ?? ''}
                      {store.suite_number ? `, Suite ${store.suite_number}` : ''}
                    </p>
                  </div>

                  {/* Risk score — hidden on mobile */}
                  {store.risk_score != null && (
                    <span className={`hidden sm:inline-flex text-[10px] font-bold px-2 py-0.5 rounded border shrink-0 ${riskColor}`}>
                      {store.risk_score}
                    </span>
                  )}

                  {/* Lease expiry */}
                  <div className="hidden sm:block text-right shrink-0 min-w-[100px]">
                    {store.lease_expiry ? (
                      <>
                        <p className="text-xs text-white/60">
                          {new Date(store.lease_expiry).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                        </p>
                        {remaining && (
                          <p className={`text-[10px] ${status === 'expired' ? 'text-red-400' : status === 'expiring' ? 'text-amber-400' : 'text-white/35'}`}>
                            {remaining}
                          </p>
                        )}
                      </>
                    ) : (
                      <p className="text-[10px] text-white/25">No expiry</p>
                    )}
                  </div>

                  {/* Doc count — hidden on mobile */}
                  <div className="hidden sm:flex items-center gap-1 text-xs text-white/40 shrink-0 min-w-[40px] justify-end">
                    <FileText className="h-3 w-3" />
                    {store.doc_count}
                  </div>

                  {/* Arrow */}
                  <ChevronRight className="h-4 w-4 text-white/20 shrink-0" />
                </Link>
              )
            })}
          </div>
        )
      ) : (
        <div className="text-center py-8">
          <p className="text-sm text-muted-foreground/60">No locations match your search.</p>
        </div>
      )}
    </div>
  )
}

// ── Small filter select ──────────────────────────────────────────────────────

function SelectFilter({
  label,
  value,
  onChange,
  options,
  showAll = true,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
  showAll?: boolean
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="text-xs rounded-lg px-3 py-2 focus:outline-none cursor-pointer appearance-none"
      style={{
        background: value ? 'rgba(16,185,129,0.10)' : 'rgba(255,255,255,0.06)',
        border: value ? '1px solid rgba(16,185,129,0.25)' : '1px solid rgba(255,255,255,0.09)',
        color: value ? 'rgb(52,211,153)' : undefined,
      }}
    >
      {showAll && <option value="" style={{ background: '#0c0e14' }}>{label}: All</option>}
      {!showAll && <option value={value} disabled hidden style={{ background: '#0c0e14' }}>{label}</option>}
      {options.map(o => (
        <option key={o.value} value={o.value} style={{ background: '#0c0e14' }}>{o.label}</option>
      ))}
    </select>
  )
}
