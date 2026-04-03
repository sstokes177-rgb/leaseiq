'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Plus, X, Loader2 } from 'lucide-react'

const inputStyle = {
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.09)',
}

function GlassInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="w-full rounded-xl px-4 py-2.5 text-sm placeholder:text-muted-foreground/55 focus:outline-none transition-all"
      style={inputStyle}
      onFocus={(e) => {
        e.target.style.borderColor = 'rgba(16,185,129,0.45)'
        e.target.style.boxShadow = '0 0 0 3px rgba(16,185,129,0.10)'
      }}
      onBlur={(e) => {
        e.target.style.borderColor = 'rgba(255,255,255,0.09)'
        e.target.style.boxShadow = 'none'
      }}
    />
  )
}

export function AddStoreButton() {
  const [open, setOpen] = useState(false)
  const [storeName, setStoreName] = useState('')
  const [suiteNumber, setSuiteNumber] = useState('')
  const [assetClass, setAssetClass] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleSubmit = async () => {
    if (!storeName.trim()) return
    setLoading(true)
    setError(null)

    const res = await fetch('/api/stores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        store_name: storeName.trim(),
        suite_number: suiteNumber.trim() || null,
        asset_class: assetClass || null,
      }),
    })
    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(data.error || 'Failed to create location')
    } else {
      setOpen(false)
      setStoreName('')
      setSuiteNumber('')
      setAssetClass('')
      router.refresh()
    }
  }

  if (!open) {
    return (
      <Button id="add-store-btn" onClick={() => setOpen(true)} variant="outline" size="sm" className="gap-1.5">
        <Plus className="h-3.5 w-3.5" />
        Add location
      </Button>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div
        className="w-full max-w-sm rounded-2xl p-6 space-y-4"
        style={{ background: 'rgba(12,14,20,0.97)', border: '1px solid rgba(255,255,255,0.10)' }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-base">Add a new location</h2>
            <p className="text-xs text-muted-foreground/70 mt-0.5">
              Property details auto-fill after uploading your lease.
            </p>
          </div>
          <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground/90 mb-1.5 block">
              Name <span className="text-emerald-400">*</span>
            </label>
            <GlassInput
              placeholder="e.g. Whole Foods — Downtown"
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && storeName.trim() && handleSubmit()}
              autoFocus
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground/90 mb-1.5 block">
              Suite / space number <span className="text-muted-foreground/50">(optional)</span>
            </label>
            <GlassInput
              placeholder="Suite 204"
              value={suiteNumber}
              onChange={(e) => setSuiteNumber(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && storeName.trim() && handleSubmit()}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground/90 mb-1.5 block">
              Asset class <span className="text-muted-foreground/50">(optional — auto-detected after lease upload)</span>
            </label>
            <select
              value={assetClass}
              onChange={(e) => setAssetClass(e.target.value)}
              className="w-full rounded-xl px-4 py-2.5 text-sm focus:outline-none transition-all cursor-pointer appearance-none"
              style={inputStyle}
            >
              <option value="" style={{ background: '#0c0e14' }}>Auto-detect from lease</option>
              {['Retail', 'Office', 'Industrial', 'Mixed-Use', 'Medical', 'Restaurant', 'Grocery', 'Other'].map(c => (
                <option key={c} value={c} style={{ background: '#0c0e14' }}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex gap-2">
          <Button
            onClick={handleSubmit}
            disabled={loading || !storeName.trim()}
            className="flex-1"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create location'}
          </Button>
          <Button onClick={() => setOpen(false)} variant="outline">
            Cancel
          </Button>
        </div>
      </div>
    </div>
  )
}
