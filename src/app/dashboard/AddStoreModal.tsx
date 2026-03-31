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
  const [shoppingCenter, setShoppingCenter] = useState('')
  const [suiteNumber, setSuiteNumber] = useState('')
  const [address, setAddress] = useState('')
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
        shopping_center_name: shoppingCenter.trim() || null,
        suite_number: suiteNumber.trim() || null,
        address: address.trim() || null,
      }),
    })
    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(data.error || 'Failed to create store')
    } else {
      setOpen(false)
      setStoreName('')
      setShoppingCenter('')
      setSuiteNumber('')
      setAddress('')
      router.refresh()
    }
  }

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)} variant="outline" size="sm" className="gap-1.5">
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
          <h2 className="font-semibold text-base">Add a new location</h2>
          <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground/90 mb-1.5 block">
              Store name <span className="text-emerald-400">*</span>
            </label>
            <GlassInput
              placeholder="e.g. Subway — Downtown"
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && storeName.trim() && handleSubmit()}
              autoFocus
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground/90 mb-1.5 block">
              Shopping center / property
            </label>
            <GlassInput
              placeholder="Westfield Mall"
              value={shoppingCenter}
              onChange={(e) => setShoppingCenter(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground/90 mb-1.5 block">
              Suite / space number
            </label>
            <GlassInput
              placeholder="Suite 204"
              value={suiteNumber}
              onChange={(e) => setSuiteNumber(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground/90 mb-1.5 block">
              Address
            </label>
            <GlassInput
              placeholder="123 Main St, City, State"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
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
