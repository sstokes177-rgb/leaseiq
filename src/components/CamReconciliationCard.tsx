'use client'

import { useState, useEffect } from 'react'
import { Loader2, Upload, AlertTriangle, CheckCircle2, FileSearch, DollarSign } from 'lucide-react'
import type { CamReconciliationData } from '@/types'

interface CamReconciliationCardProps {
  storeId: string
}

export function CamReconciliationCard({ storeId }: CamReconciliationCardProps) {
  const [result, setResult] = useState<CamReconciliationData | null>(null)
  const [pastResults, setPastResults] = useState<{ reconciliation_data: CamReconciliationData; file_name: string; created_at: string }[]>([])
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchPast = async () => {
      try {
        const res = await fetch(`/api/cam-reconciliation?store_id=${storeId}`)
        if (res.ok) {
          const data = await res.json()
          setPastResults(data.reconciliations ?? [])
        }
      } catch {
        // Fail silently
      } finally {
        setLoading(false)
      }
    }
    fetchPast()
  }, [storeId])

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setError(null)
    setResult(null)

    const formData = new FormData()
    formData.append('file', file)
    formData.append('store_id', storeId)

    try {
      const res = await fetch('/api/cam-reconciliation', {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()
      if (res.ok && data.reconciliation) {
        setResult(data.reconciliation)
      } else {
        setError(data.error ?? 'Could not analyze reconciliation statement.')
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setUploading(false)
      // Reset file input
      e.target.value = ''
    }
  }

  const activeResult = result ?? pastResults[0]?.reconciliation_data ?? null

  return (
    <div className="glass-card rounded-2xl p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div
          className="flex items-center justify-center w-9 h-9 rounded-xl shrink-0"
          style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.20)' }}
        >
          <FileSearch className="h-4 w-4 text-red-400" />
        </div>
        <div>
          <p className="font-semibold text-sm">CAM Reconciliation Check</p>
          <p className="text-xs text-muted-foreground/60">Upload your annual statement to find potential overcharges</p>
        </div>
      </div>

      {/* Upload area */}
      <label
        className={`flex items-center justify-center gap-2 rounded-xl px-4 py-3 cursor-pointer transition-colors ${
          uploading ? 'opacity-50 pointer-events-none' : 'hover:bg-white/[0.04]'
        }`}
        style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.12)' }}
      >
        {uploading ? (
          <>
            <Loader2 className="h-4 w-4 text-amber-400 animate-spin" />
            <span className="text-sm text-amber-400">Analyzing statement…</span>
          </>
        ) : (
          <>
            <Upload className="h-4 w-4 text-muted-foreground/60" />
            <span className="text-sm text-muted-foreground/70">Upload CAM reconciliation statement (PDF)</span>
          </>
        )}
        <input
          type="file"
          accept=".pdf,.doc,.docx"
          onChange={handleUpload}
          className="hidden"
          disabled={uploading}
        />
      </label>

      {error && (
        <p className="text-xs text-red-400/80">{error}</p>
      )}

      {/* Results */}
      {loading && !activeResult && (
        <div className="animate-pulse space-y-2">
          <div className="h-3 w-48 rounded" style={{ background: 'rgba(255,255,255,0.06)' }} />
          <div className="h-3 w-32 rounded" style={{ background: 'rgba(255,255,255,0.05)' }} />
        </div>
      )}

      {activeResult && (
        <div className="space-y-4">
          {/* Summary row */}
          <div
            className="rounded-xl px-4 py-3 flex items-center justify-between gap-4"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
          >
            <div>
              <p className="text-[10px] font-semibold text-white/35 uppercase tracking-widest mb-0.5">Total Billed</p>
              <p className="text-sm font-semibold text-white/85">{activeResult.total_billed}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-semibold text-white/35 uppercase tracking-widest mb-0.5">Potential Savings</p>
              <p className={`text-sm font-bold ${activeResult.potential_overcharges.length > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                {activeResult.total_potential_savings}
              </p>
            </div>
          </div>

          {/* Overcharges table */}
          {activeResult.potential_overcharges.length > 0 ? (
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
                <p className="text-[10px] font-semibold text-amber-400/80 uppercase tracking-widest">
                  Potential Overcharges ({activeResult.potential_overcharges.length})
                </p>
              </div>
              <div className="space-y-2">
                {activeResult.potential_overcharges.map((charge, i) => (
                  <div
                    key={i}
                    className="rounded-lg px-3 py-2.5"
                    style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)' }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-amber-300">{charge.item}</p>
                        <p className="text-[11px] text-white/50 mt-0.5">{charge.reason}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs font-bold text-red-400 flex items-center gap-1">
                          <DollarSign className="h-3 w-3" />
                          {charge.amount}
                        </p>
                        {charge.article && (
                          <span
                            className="inline-block text-[10px] font-medium px-1.5 py-0.5 rounded mt-1"
                            style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)', color: 'rgb(52,211,153)' }}
                          >
                            {charge.article}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-emerald-400/80">
              <CheckCircle2 className="h-4 w-4" />
              <p className="text-sm">No overcharges detected</p>
            </div>
          )}

          {/* Recommendation */}
          {activeResult.recommendation && (
            <div
              className="rounded-xl px-4 py-3"
              style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)' }}
            >
              <p className="text-[10px] font-semibold text-indigo-400/80 uppercase tracking-widest mb-1">Recommendation</p>
              <p className="text-xs text-white/70 leading-relaxed">{activeResult.recommendation}</p>
            </div>
          )}
        </div>
      )}

      <p className="text-[10px] text-white/25 italic">
        AI-powered analysis — consult a professional before taking action on identified overcharges.
      </p>
    </div>
  )
}
