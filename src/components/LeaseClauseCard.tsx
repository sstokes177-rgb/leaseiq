'use client'

import { useState, useEffect } from 'react'
import { ShieldCheck, ShieldAlert, Users, Store } from 'lucide-react'

interface LeaseClauseCardProps {
  storeId: string
  clauseType: 'co-tenancy' | 'exclusive-use'
}

interface ClauseData {
  has_clause: boolean
  summary: string
  // co-tenancy specific
  trigger_conditions?: string
  rent_reduction?: string
  termination_right?: string
  // exclusive-use specific
  exclusive_use_description?: string
  restrictions?: string
  remedies?: string
  article?: string
}

const CLAUSE_CONFIG = {
  'co-tenancy': {
    title: 'Co-Tenancy Protection',
    description: 'Occupancy requirements that protect your rent terms',
    icon: Users,
    color: 'rgba(236,72,153,',
    textColor: 'text-pink-400',
    noClauseMsg: 'No co-tenancy clause found in your lease documents.',
  },
  'exclusive-use': {
    title: 'Exclusive Use Protection',
    description: 'Restrictions on competing businesses in your center',
    icon: Store,
    color: 'rgba(14,165,233,',
    textColor: 'text-sky-400',
    noClauseMsg: 'No exclusive use clause found in your lease documents.',
  },
}

export function LeaseClauseCard({ storeId, clauseType }: LeaseClauseCardProps) {
  const [data, setData] = useState<ClauseData | null>(null)
  const [loading, setLoading] = useState(true)

  const config = CLAUSE_CONFIG[clauseType]
  const Icon = config.icon

  useEffect(() => {
    const fetchClause = async () => {
      try {
        const res = await fetch(`/api/lease-clauses?store_id=${storeId}&type=${clauseType}`)
        if (res.ok) {
          const result = await res.json()
          setData(result.clause ?? null)
        }
      } catch {
        // Fail silently
      } finally {
        setLoading(false)
      }
    }
    fetchClause()
  }, [storeId, clauseType])

  if (loading) {
    return (
      <div className="glass-card p-6 animate-pulse space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl" style={{ background: 'rgba(255,255,255,0.06)' }} />
          <div className="space-y-1.5">
            <div className="h-3.5 w-36 rounded-md" style={{ background: 'rgba(255,255,255,0.08)' }} />
            <div className="h-2.5 w-48 rounded-md" style={{ background: 'rgba(255,255,255,0.05)' }} />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="glass-card p-6 space-y-4">
      <div className="flex items-center gap-3">
        <div
          className="flex items-center justify-center w-9 h-9 rounded-xl shrink-0"
          style={{ background: `${config.color}0.10)`, border: `1px solid ${config.color}0.20)` }}
        >
          <Icon className={`h-4 w-4 ${config.textColor}`} />
        </div>
        <div>
          <p className="font-semibold text-sm">{config.title}</p>
          <p className="text-xs text-muted-foreground/60">{config.description}</p>
        </div>
      </div>

      {!data || !data.has_clause ? (
        <div className="flex items-start gap-2">
          <ShieldAlert className="h-4 w-4 text-white/25 mt-0.5 shrink-0" />
          <p className="text-xs text-white/40">{data?.summary ?? config.noClauseMsg}</p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-start gap-2">
            <ShieldCheck className={`h-4 w-4 ${config.textColor} mt-0.5 shrink-0`} />
            <p className="text-xs text-white/70 leading-relaxed">{data.summary}</p>
          </div>

          <div
            className="rounded-xl px-4 py-3 space-y-2"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
          >
            {clauseType === 'co-tenancy' && (
              <>
                {data.trigger_conditions && (
                  <div>
                    <p className="text-[10px] font-semibold text-white/35 uppercase tracking-widest mb-0.5">Trigger Conditions</p>
                    <p className="text-xs text-white/70">{data.trigger_conditions}</p>
                  </div>
                )}
                {data.rent_reduction && (
                  <div>
                    <p className="text-[10px] font-semibold text-white/35 uppercase tracking-widest mb-0.5">Rent Reduction</p>
                    <p className="text-xs text-white/70">{data.rent_reduction}</p>
                  </div>
                )}
                {data.termination_right && (
                  <div>
                    <p className="text-[10px] font-semibold text-white/35 uppercase tracking-widest mb-0.5">Termination Right</p>
                    <p className="text-xs text-white/70">{data.termination_right}</p>
                  </div>
                )}
              </>
            )}

            {clauseType === 'exclusive-use' && (
              <>
                {data.exclusive_use_description && (
                  <div>
                    <p className="text-[10px] font-semibold text-white/35 uppercase tracking-widest mb-0.5">Your Exclusive Use</p>
                    <p className="text-xs text-white/70">{data.exclusive_use_description}</p>
                  </div>
                )}
                {data.restrictions && (
                  <div>
                    <p className="text-[10px] font-semibold text-white/35 uppercase tracking-widest mb-0.5">Restrictions</p>
                    <p className="text-xs text-white/70">{data.restrictions}</p>
                  </div>
                )}
                {data.remedies && (
                  <div>
                    <p className="text-[10px] font-semibold text-white/35 uppercase tracking-widest mb-0.5">Remedies</p>
                    <p className="text-xs text-white/70">{data.remedies}</p>
                  </div>
                )}
              </>
            )}

            {data.article && (
              <span
                className="inline-block text-[10px] font-medium px-1.5 py-0.5 rounded"
                style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)', color: 'rgb(52,211,153)' }}
              >
                {data.article}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
