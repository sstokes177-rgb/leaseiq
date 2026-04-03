'use client'

import { useState, useEffect } from 'react'
import { Loader2, Calculator, Edit3, Check, X } from 'lucide-react'

interface OccupancyCostCardProps {
  storeId: string
}

interface CostData {
  summary: {
    base_rent_monthly: string | null
    square_footage: string | null
  } | null
  cam: {
    proportionate_share_pct: string | null
    cam_cap: string | null
  } | null
  overrides: {
    insurance_monthly: number | null
    tax_monthly: number | null
    other_monthly: number | null
    other_label: string | null
  } | null
  total_sales: number
}

function parseCurrency(value: string | null): number {
  if (!value) return 0
  const num = parseFloat(value.replace(/[^0-9.-]/g, ''))
  return isNaN(num) ? 0 : num
}

function fmt(n: number): string {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function CostRow({
  label,
  amount,
  note,
  highlight,
  total,
}: {
  label: string
  amount: number
  note?: string
  highlight?: boolean
  total?: boolean
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className={`text-xs ${total ? 'font-semibold text-white/90' : highlight ? 'text-white/80 font-medium' : 'text-white/70'}`}>
          {label}
        </span>
        {note && (
          <span className="text-[10px] text-white/35 italic">{note}</span>
        )}
      </div>
      <span className={
        total
          ? 'text-sm font-bold text-emerald-400'
          : `text-xs font-medium ${amount > 0 ? 'text-white/85' : 'text-white/25'}`
      }>
        ${fmt(amount)}
      </span>
    </div>
  )
}

export function OccupancyCostCard({ storeId }: OccupancyCostCardProps) {
  const [data, setData] = useState<CostData | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [insurance, setInsurance] = useState('')
  const [tax, setTax] = useState('')
  const [other, setOther] = useState('')
  const [otherLabel, setOtherLabel] = useState('')

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/occupancy-cost?store_id=${storeId}`)
      if (res.ok) {
        const result = await res.json()
        setData(result)
        if (result.overrides) {
          setInsurance(result.overrides.insurance_monthly?.toString() ?? '')
          setTax(result.overrides.tax_monthly?.toString() ?? '')
          setOther(result.overrides.other_monthly?.toString() ?? '')
          setOtherLabel(result.overrides.other_label ?? '')
        }
      }
    } catch {
      // Fail silently
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [storeId]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = async () => {
    setSaving(true)
    try {
      await fetch('/api/occupancy-cost', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          store_id: storeId,
          insurance_monthly: insurance ? parseFloat(insurance) : null,
          tax_monthly: tax ? parseFloat(tax) : null,
          other_monthly: other ? parseFloat(other) : null,
          other_label: otherLabel || null,
        }),
      })
      setEditing(false)
      await fetchData()
    } catch {
      // Fail silently
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="glass-card p-6 animate-pulse space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl" style={{ background: 'rgba(255,255,255,0.06)' }} />
          <div className="space-y-1.5">
            <div className="h-3.5 w-44 rounded-md" style={{ background: 'rgba(255,255,255,0.08)' }} />
            <div className="h-2.5 w-32 rounded-md" style={{ background: 'rgba(255,255,255,0.05)' }} />
          </div>
        </div>
      </div>
    )
  }

  if (!data?.summary) return null

  const baseRent = parseCurrency(data.summary.base_rent_monthly)
  const sqft = parseFloat((data.summary.square_footage ?? '0').replace(/[^0-9.]/g, '')) || 0
  const insuranceAmt = Number(data.overrides?.insurance_monthly) || 0
  const taxAmt = Number(data.overrides?.tax_monthly) || 0
  const otherAmt = Number(data.overrides?.other_monthly) || 0

  // Estimate CAM from analysis if available
  let camEstimate = 0
  let camNote: string | undefined
  if (data.cam?.cam_cap && sqft > 0) {
    const capPerSqft = parseCurrency(data.cam.cam_cap)
    if (capPerSqft > 0) {
      camEstimate = (capPerSqft * sqft) / 12
      camNote = 'Estimated from cap'
    }
  }
  if (camEstimate === 0 && data.cam?.proportionate_share_pct) {
    camNote = 'See CAM analysis'
  }

  const totalMonthly = baseRent + camEstimate + insuranceAmt + taxAmt + otherAmt
  const totalAnnual = totalMonthly * 12
  const perSqFt = sqft > 0 ? totalAnnual / sqft : 0

  return (
    <div className="glass-card p-6 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="flex items-center justify-center w-9 h-9 rounded-xl shrink-0"
            style={{ background: 'rgba(20,184,166,0.10)', border: '1px solid rgba(20,184,166,0.20)' }}
          >
            <Calculator className="h-4 w-4 text-teal-400" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-sm">Total Occupancy Cost</p>
            <p className="text-xs text-muted-foreground/60">Monthly cost breakdown</p>
          </div>
        </div>
        {!editing && (
          <button
            onClick={() => setEditing(true)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground/60 hover:text-white/70 transition-colors shrink-0"
          >
            <Edit3 className="h-3.5 w-3.5" /> Edit
          </button>
        )}
      </div>

      {/* Cost breakdown */}
      <div
        className="rounded-xl px-4 py-3 space-y-2"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
      >
        <CostRow label="Base Rent" amount={baseRent} highlight />
        <CostRow label="CAM Charges" amount={camEstimate} note={camNote} />
        <CostRow label="Insurance" amount={insuranceAmt} note={insuranceAmt === 0 ? 'not set' : undefined} />
        <CostRow label="Property Tax" amount={taxAmt} note={taxAmt === 0 ? 'not set' : undefined} />
        {otherAmt > 0 && (
          <CostRow label={data.overrides?.other_label ?? 'Other'} amount={otherAmt} />
        )}
        <div
          className="pt-2 mt-2"
          style={{ borderTop: '1px solid rgba(255,255,255,0.10)' }}
        >
          <CostRow label="Total Monthly" amount={totalMonthly} total />
        </div>
      </div>

      {/* Per-sqft annual display */}
      {sqft > 0 && (
        <div
          className="rounded-xl px-4 py-3 text-center"
          style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.18)' }}
        >
          <p className="text-[10px] font-semibold text-emerald-400/60 uppercase tracking-widest">
            Total Occupancy Cost
          </p>
          <p className="text-2xl font-bold text-emerald-300 mt-1">
            ${perSqFt.toFixed(2)}
            <span className="text-sm font-normal text-emerald-300/60">/sqft/yr</span>
          </p>
          <p className="text-xs text-white/40 mt-1">
            ${totalAnnual.toLocaleString()}/year &middot; {sqft.toLocaleString()} sqft
          </p>
        </div>
      )}

      {/* Edit form */}
      {editing && (
        <div
          className="rounded-xl px-4 py-3 space-y-3"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          <p className="text-[10px] font-semibold text-white/35 uppercase tracking-widest">Manual Overrides</p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-semibold text-white/35 uppercase tracking-widest block mb-1">Insurance</label>
              <div className="relative">
                <input
                  type="number"
                  value={insurance}
                  onChange={(e) => setInsurance(e.target.value)}
                  placeholder="0.00"
                  className="glass-input w-full px-3 py-1.5 pr-12 text-sm text-white/85 placeholder:text-white/25"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-white/30">$/mo</span>
              </div>
            </div>
            <div>
              <label className="text-[10px] font-semibold text-white/35 uppercase tracking-widest block mb-1">Property Tax</label>
              <div className="relative">
                <input
                  type="number"
                  value={tax}
                  onChange={(e) => setTax(e.target.value)}
                  placeholder="0.00"
                  className="glass-input w-full px-3 py-1.5 pr-12 text-sm text-white/85 placeholder:text-white/25"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-white/30">$/mo</span>
              </div>
            </div>
            <div>
              <label className="text-[10px] font-semibold text-white/35 uppercase tracking-widest block mb-1">Other Label</label>
              <input
                type="text"
                value={otherLabel}
                onChange={(e) => setOtherLabel(e.target.value)}
                placeholder="e.g. Marketing Fund"
                className="glass-input w-full px-3 py-1.5 text-sm text-white/85 placeholder:text-white/25"
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-white/35 uppercase tracking-widest block mb-1">Other Amount</label>
              <div className="relative">
                <input
                  type="number"
                  value={other}
                  onChange={(e) => setOther(e.target.value)}
                  placeholder="0.00"
                  className="glass-input w-full px-3 py-1.5 pr-12 text-sm text-white/85 placeholder:text-white/25"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-white/30">$/mo</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1 text-xs font-medium text-emerald-400 hover:text-emerald-300 disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              Save
            </button>
            <button
              onClick={() => setEditing(false)}
              className="flex items-center gap-1 text-xs text-white/40 hover:text-white/60"
            >
              <X className="h-3.5 w-3.5" /> Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
