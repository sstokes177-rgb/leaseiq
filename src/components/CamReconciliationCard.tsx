'use client'

import { useState, useEffect, useRef } from 'react'
import { Loader2, Upload, Receipt, AlertTriangle, CheckCircle2 } from 'lucide-react'
import type { CamReconciliationData } from '@/types'

interface CamReconciliationCardProps {
  storeId: string
}

interface ReconciliationRecord {
  id: string
  file_name: string | null
  reconciliation_data: CamReconciliationData
  created_at: string
}

export function CamReconciliationCard({ storeId }: CamReconciliationCardProps) {
  const [records, setRecords] = useState<ReconciliationRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch(`/api/cam-reconciliation?store_id=${storeId}`)
      .then(r => r.json())
      .then(data => setRecords(data.reconciliations ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [storeId])

  const handleUpload = async () => {
    const file = fileRef.current?.files?.[0]
    if (!file) return

    setUploading(true)
    setError(null)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('store_id', storeId)

      const res = await fetch('/api/cam-reconciliation', {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()

      if (res.ok && data.reconciliation) {
        setRecords(prev => [{
          id: crypto.randomUUID(),
          file_name: data.file_name,
          reconciliation_data: data.reconciliation,
          created_at: new Date().toISOString(),
        }, ...prev])
        if (fileRef.current) fileRef.current.value = ''
      } else {
        setError(data.error ?? 'Analysis failed')
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  const latestResult = records[0]?.reconciliation_data ?? null

  return (
    <div className="glass-card rounded-2xl p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div
          className="flex items-center justify-center w-9 h-9 rounded-xl shrink-0"
          style={{ background: 'rgba(245,158,11,0.10)', border: '1px solid rgba(245,158,11,0.20)' }}
        >
          <Receipt className="h-4 w-4 text-amber-400" />
        </div>
        <div>
          <p className="font-semibold text-sm">CAM Reconciliation Check</p>
          <p className="text-xs text-muted-foreground/60">Upload your annual statement to find potential overcharges</p>
        </div>
      </div>

      {/* Upload area */}
      <div
        className="rounded-xl px-4 py-3"
        style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.12)' }}
      >
        <div className="flex items-center gap-3">
          <label
            className={`flex-1 flex items-center gap-2 cursor-pointer ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
          >
            <Upload className="h-4 w-4 text-muted-foreground/60 shrink-0" />
            <span className="text-sm text-muted-foreground/70 truncate">
              {fileRef.current?.files?.[0]?.name ?? 'Choose CAM reconciliation statement (PDF)'}
            </span>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf"
              onChange={() => {
                // Force re-render to show file name
                setError(null)
              }}
              className="hidden"
              disabled={uploading}
            />
          </label>
          <button
            onClick={handleUpload}
            disabled={uploading}
            className="shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
            style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.25)', color: 'rgb(251,191,36)' }}
          >
            {uploading ? (
              <span className="flex items-center gap-1.5">
                <Loader2 className="h-3 w-3 animate-spin" />
                Analyzing…
              </span>
            ) : (
              'Analyze'
            )}
          </button>
        </div>
      </div>

      {error && (
        <p className="text-xs text-red-400/80">{error}</p>
      )}

      {/* Loading skeleton */}
      {loading && !latestResult && (
        <div className="animate-pulse space-y-2">
          <div className="h-3 w-48 rounded" style={{ background: 'rgba(255,255,255,0.06)' }} />
          <div className="h-3 w-32 rounded" style={{ background: 'rgba(255,255,255,0.05)' }} />
        </div>
      )}

      {/* Results */}
      {latestResult && (
        <div className="space-y-4">
          {/* File name and date */}
          {records[0]?.file_name && (
            <p className="text-[10px] text-white/30">
              {records[0].file_name} — {new Date(records[0].created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
          )}

          {/* Summary row */}
          <div
            className="rounded-xl px-4 py-3 flex items-center justify-between gap-4"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
          >
            <div>
              <p className="text-[10px] font-semibold text-white/35 uppercase tracking-widest mb-0.5">Total Billed</p>
              <p className="text-sm font-semibold text-white/85">{latestResult.total_billed ?? 'N/A'}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-semibold text-white/35 uppercase tracking-widest mb-0.5">Potential Savings</p>
              <p className={`text-sm font-bold ${latestResult.potential_overcharges.length > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                {latestResult.total_potential_savings ?? '$0'}
              </p>
            </div>
          </div>

          {/* Overcharges table */}
          {latestResult.potential_overcharges.length > 0 ? (
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
                <p className="text-[10px] font-semibold text-amber-400/80 uppercase tracking-widest">
                  Potential Overcharges ({latestResult.potential_overcharges.length})
                </p>
              </div>
              <div className="space-y-2">
                {latestResult.potential_overcharges.map((charge, i) => (
                  <div
                    key={i}
                    className="rounded-lg px-3 py-2.5"
                    style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)' }}
                  >
                    <p className="text-xs font-semibold text-amber-300 mb-1.5">{charge.item}</p>
                    <div className="grid grid-cols-3 gap-2 mb-1.5">
                      <div>
                        <p className="text-[10px] text-white/30 uppercase tracking-wider">Billed</p>
                        <p className="text-xs font-medium text-red-400">{charge.billed_amount}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-white/30 uppercase tracking-wider">Expected</p>
                        <p className="text-xs font-medium text-emerald-400">{charge.expected_amount}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-white/30 uppercase tracking-wider">Difference</p>
                        <p className="text-xs font-bold text-red-400">{charge.difference}</p>
                      </div>
                    </div>
                    <p className="text-[11px] text-white/50">{charge.reason}</p>
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
          {latestResult.recommendation && (
            <div
              className="rounded-xl px-4 py-3"
              style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)' }}
            >
              <p className="text-[10px] font-semibold text-indigo-400/80 uppercase tracking-widest mb-1">Recommendation</p>
              <p className="text-xs text-white/70 leading-relaxed">{latestResult.recommendation}</p>
            </div>
          )}
        </div>
      )}

      {/* History */}
      {records.length > 1 && (
        <div>
          <p className="text-[10px] font-semibold text-white/35 uppercase tracking-widest mb-2">Previous Analyses</p>
          <div className="space-y-1.5">
            {records.slice(1).map((rec) => (
              <div
                key={rec.id}
                className="flex items-center justify-between gap-3 rounded-lg px-3 py-2"
                style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}
              >
                <div className="min-w-0">
                  <p className="text-xs text-white/60 truncate">{rec.file_name ?? 'Statement'}</p>
                  <p className="text-[10px] text-white/30">
                    {new Date(rec.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className={`text-xs font-semibold ${rec.reconciliation_data.potential_overcharges.length > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                    {rec.reconciliation_data.total_potential_savings ?? '$0'}
                  </p>
                  <p className="text-[10px] text-white/30">
                    {rec.reconciliation_data.potential_overcharges.length} issue{rec.reconciliation_data.potential_overcharges.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-[10px] text-white/25 italic">
        AI-powered analysis — consult a professional before taking action on identified overcharges.
      </p>
    </div>
  )
}
