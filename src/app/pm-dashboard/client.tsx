'use client'

import { useState, useEffect } from 'react'
import {
  Building2, Users, Mail, UserPlus, Loader2,
  Clock
} from 'lucide-react'

interface Property {
  id: string
  store_name: string
  shopping_center_name: string | null
  address: string | null
  doc_count: number
  tenant_count: number
}

interface TenantInvitation {
  id: string
  email: string
  store_id: string | null
  status: string
  invited_at: string
}

export function PMDashboardClient() {
  const [properties, setProperties] = useState<Property[]>([])
  const [invitations, setInvitations] = useState<TenantInvitation[]>([])
  const [loading, setLoading] = useState(true)
  const [inviteEmail, setInviteEmail] = useState('')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch('/api/stores').then(r => r.json()),
      fetch('/api/team').then(r => r.json()),
    ])
      .then(([storesData, teamData]) => {
        const stores = storesData.stores ?? []
        setProperties(stores.map((s: any) => ({
          ...s,
          doc_count: 0,
          tenant_count: 0,
        })))
        setInvitations(teamData.invitations ?? [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleInviteTenant = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteEmail.trim()) return
    setSending(true)
    try {
      const res = await fetch('/api/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteEmail.trim(),
          role: 'member',
        }),
      })
      if (res.ok) {
        setInviteEmail('')
        const data = await fetch('/api/team').then(r => r.json())
        setInvitations(data.invitations ?? [])
      }
    } catch {}
    finally { setSending(false) }
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        {[0, 1, 2].map(i => (
          <div key={i} className="glass-card rounded-2xl p-6 h-32" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Stats summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-card rounded-2xl p-6 text-center">
          <Building2 className="h-6 w-6 text-emerald-400 mx-auto mb-2" />
          <p className="text-2xl font-bold">{properties.length}</p>
          <p className="text-xs text-muted-foreground/60">Properties</p>
        </div>
        <div className="glass-card rounded-2xl p-6 text-center">
          <Users className="h-6 w-6 text-blue-400 mx-auto mb-2" />
          <p className="text-2xl font-bold">
            {invitations.filter(i => i.status === 'accepted').length}
          </p>
          <p className="text-xs text-muted-foreground/60">Active Tenants</p>
        </div>
        <div className="glass-card rounded-2xl p-6 text-center">
          <Clock className="h-6 w-6 text-amber-400 mx-auto mb-2" />
          <p className="text-2xl font-bold">
            {invitations.filter(i => i.status === 'pending').length}
          </p>
          <p className="text-xs text-muted-foreground/60">Pending Invitations</p>
        </div>
      </div>

      {/* Invite tenant form */}
      <div className="glass-card rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl shrink-0"
            style={{ background: 'rgba(16,185,129,0.10)', border: '1px solid rgba(16,185,129,0.18)' }}>
            <UserPlus className="h-4 w-4 text-emerald-400" />
          </div>
          <div>
            <p className="font-semibold text-sm">Invite Tenant</p>
            <p className="text-xs text-muted-foreground/60">Send an invitation for a tenant to join ClauseIQ</p>
          </div>
        </div>

        <form onSubmit={handleInviteTenant} className="flex gap-2">
          <div className="flex-1 relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/25" />
            <input
              type="email"
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              placeholder="tenant@business.com"
              className="glass-input w-full pl-9 pr-4 py-2.5 text-sm text-white/90 placeholder:text-white/25"
              required
            />
          </div>
          <button
            type="submit"
            disabled={sending}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white shrink-0 disabled:opacity-50"
            style={{
              background: 'linear-gradient(135deg, rgba(16,185,129,0.9), rgba(13,148,136,0.9))',
              border: '1px solid rgba(16,185,129,0.3)',
            }}
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
            Send Invite
          </button>
        </form>

        <p className="text-[10px] text-white/30 italic">
          Note: Property managers cannot access tenant chat history. Tenants retain full control over their data.
        </p>
      </div>

      {/* Properties list */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground/80 uppercase tracking-widest mb-4">
          Your Properties
        </p>
        {properties.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {properties.map(prop => (
              <div key={prop.id} className="glass-card rounded-2xl p-5">
                <div className="flex items-start gap-3 mb-3">
                  <div className="flex items-center justify-center w-9 h-9 rounded-xl shrink-0"
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)' }}>
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{prop.store_name}</p>
                    {prop.shopping_center_name && (
                      <p className="text-xs text-muted-foreground/60">{prop.shopping_center_name}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="glass-card rounded-2xl p-8 text-center">
            <Building2 className="h-8 w-8 text-white/20 mx-auto mb-3" />
            <p className="text-sm text-white/50">No properties yet</p>
            <p className="text-xs text-white/30 mt-1">Add your first property to start inviting tenants</p>
          </div>
        )}
      </div>

      {/* Tenant adoption list */}
      {invitations.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground/80 uppercase tracking-widest mb-4">
            Tenant Invitations
          </p>
          <div className="space-y-2">
            {invitations.map(inv => (
              <div key={inv.id} className="glass-card rounded-xl px-5 py-3 flex items-center gap-3">
                <Mail className="h-4 w-4 text-white/30 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{inv.email}</p>
                  <p className="text-[10px] text-white/30">
                    Invited {new Date(inv.invited_at).toLocaleDateString()}
                  </p>
                </div>
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-md border ${
                  inv.status === 'accepted'
                    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25'
                    : inv.status === 'pending'
                    ? 'bg-amber-500/15 text-amber-400 border-amber-500/25'
                    : 'bg-white/[0.05] text-white/40 border-white/[0.08]'
                }`}>
                  {inv.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
