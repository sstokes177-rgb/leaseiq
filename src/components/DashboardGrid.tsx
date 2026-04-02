'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Building2, MapPin, Search, X } from 'lucide-react'

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
}

interface DashboardGridProps {
  stores: StoreWithCount[]
}

const ASSET_CLASSES = ['Retail', 'Office', 'Industrial', 'Mixed-Use', 'Other']

type SortKey = 'name_asc' | 'name_desc' | 'recent' | 'expiry'

export function DashboardGrid({ stores }: DashboardGridProps) {
  const [search, setSearch] = useState('')
  const [stateFilter, setStateFilter] = useState('')
  const [assetFilter, setAssetFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('recent')

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

    // State filter
    if (stateFilter) {
      result = result.filter(s => {
        if (!s.address) return false
        return s.address.includes(stateFilter)
      })
    }

    // Asset class filter
    if (assetFilter) {
      result = result.filter(s => s.asset_class === assetFilter)
    }

    // Status filter
    if (statusFilter === 'active') {
      result = result.filter(s => !s.lease_expiry || new Date(s.lease_expiry) > new Date())
    } else if (statusFilter === 'expired') {
      result = result.filter(s => s.lease_expiry && new Date(s.lease_expiry) <= new Date())
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
          placeholder="Search locations by name, address, city..."
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

      {/* Results count */}
      {hasFilters && (
        <p className="text-xs text-muted-foreground/60">
          {filtered.length} of {stores.length} location{stores.length !== 1 ? 's' : ''}
        </p>
      )}

      {/* Grid */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((store) => (
            <Link
              key={store.id}
              href={`/location/${store.id}`}
              className="glass-card glass-card-lift rounded-2xl p-5 block transition-all"
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
                    ? 'No documents yet'
                    : `${store.doc_count} document${store.doc_count !== 1 ? 's' : ''}`}
                </p>
                {store.asset_class && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded border border-white/[0.08] bg-white/[0.04] text-muted-foreground/60">
                    {store.asset_class}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
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
