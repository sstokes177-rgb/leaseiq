'use client'

import { useState, useEffect } from 'react'
import {
  Users, UserPlus, Mail, Shield, Eye, Crown,
  Loader2, X
} from 'lucide-react'

interface Invitation {
  id: string
  email: string
  role: string
  status: string
  created_at: string
}

const ROLE_CONFIG: Record<string, { label: string; icon: typeof Shield; color: string; desc: string }> = {
  admin: {
    label: 'Admin',
    icon: Crown,
    color: 'text-amber-400',
    desc: 'Full access — can manage team, upload docs, and view all data',
  },
  member: {
    label: 'Member',
    icon: Shield,
    color: 'text-emerald-400',
    desc: 'Can upload documents, chat with AI, and view analyses',
  },
  viewer: {
    label: 'Viewer',
    icon: Eye,
    color: 'text-blue-400',
    desc: 'Read-only access to summaries and analyses',
  },
}

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-amber-500/15 text-amber-400 border-amber-500/25',
  accepted: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
  expired: 'bg-white/[0.05] text-white/40 border-white/[0.08]',
  revoked: 'bg-red-500/10 text-red-400/60 border-red-500/20',
}

export function TeamManagement() {
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [loading, setLoading] = useState(true)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('member')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const fetchInvitations = async () => {
    try {
      const res = await fetch('/api/team')
      const data = await res.json()
      setInvitations(data.invitations ?? [])
    } catch {}
    finally { setLoading(false) }
  }

  useEffect(() => { fetchInvitations() }, [])

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteEmail.trim()) return

    setSending(true)
    setError(null)
    setSuccess(false)

    try {
      const res = await fetch('/api/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      })
      const data = await res.json()

      if (res.ok) {
        setSuccess(true)
        setInviteEmail('')
        fetchInvitations()
        setTimeout(() => setSuccess(false), 3000)
      } else {
        setError(data.error ?? 'Failed to send invitation')
      }
    } catch {
      setError('Network error')
    } finally {
      setSending(false)
    }
  }

  const handleRevoke = async (id: string) => {
    try {
      await fetch(`/api/team?id=${id}`, { method: 'DELETE' })
      setInvitations(prev => prev.map(inv =>
        inv.id === id ? { ...inv, status: 'revoked' } : inv
      ))
    } catch {}
  }

  const activeInvitations = invitations.filter(i => i.status === 'pending' || i.status === 'accepted')
  const inactiveInvitations = invitations.filter(i => i.status === 'revoked' || i.status === 'expired')

  if (loading) {
    return (
      <div className="glass-card rounded-2xl p-6 flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-white/30" />
      </div>
    )
  }

  return (
    <div className="glass-card rounded-2xl p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-9 h-9 rounded-xl shrink-0"
          style={{ background: 'rgba(139,92,246,0.10)', border: '1px solid rgba(139,92,246,0.20)' }}>
          <Users className="h-4 w-4 text-violet-400" />
        </div>
        <div>
          <p className="font-semibold text-sm">Team</p>
          <p className="text-xs text-muted-foreground/60">Invite members to collaborate on your leases</p>
        </div>
      </div>

      {/* Invite form */}
      <form onSubmit={handleInvite} className="space-y-3">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/25" />
            <input
              type="email"
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              placeholder="colleague@company.com"
              className="glass-input w-full pl-9 pr-4 py-2.5 text-sm text-white/90 placeholder:text-white/25"
              required
            />
          </div>
          <select
            value={inviteRole}
            onChange={e => setInviteRole(e.target.value)}
            className="glass-input px-3 py-2.5 text-sm text-white/80 cursor-pointer"
          >
            <option value="admin" style={{ background: '#0c0e14' }}>Admin</option>
            <option value="member" style={{ background: '#0c0e14' }}>Member</option>
            <option value="viewer" style={{ background: '#0c0e14' }}>Viewer</option>
          </select>
          <button
            type="submit"
            disabled={sending || !inviteEmail.trim()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white shrink-0 disabled:opacity-50 transition-all"
            style={{
              background: 'linear-gradient(135deg, rgba(16,185,129,0.9), rgba(13,148,136,0.9))',
              border: '1px solid rgba(16,185,129,0.3)',
            }}
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
            Invite
          </button>
        </div>

        {error && <p className="text-xs text-red-400/80">{error}</p>}
        {success && <p className="text-xs text-emerald-400/80">Invitation sent successfully</p>}
      </form>

      {/* Role descriptions */}
      <div className="grid grid-cols-3 gap-2">
        {Object.entries(ROLE_CONFIG).map(([key, config]) => {
          const Icon = config.icon
          return (
            <div key={key} className="rounded-lg px-3 py-2 text-center"
              style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <Icon className={`h-3.5 w-3.5 ${config.color} mx-auto mb-1`} />
              <p className="text-[10px] font-semibold text-white/60">{config.label}</p>
              <p className="text-[9px] text-white/30 mt-0.5 leading-tight">{config.desc}</p>
            </div>
          )
        })}
      </div>

      {/* Active invitations list */}
      {activeInvitations.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold text-white/35 uppercase tracking-widest mb-3">
            Team Members ({activeInvitations.length})
          </p>
          <div className="space-y-2">
            {activeInvitations.map(inv => {
              const roleConfig = ROLE_CONFIG[inv.role] ?? ROLE_CONFIG.member
              const RoleIcon = roleConfig.icon
              return (
                <div key={inv.id} className="rounded-xl px-4 py-3 flex items-center gap-3"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white/85 truncate">{inv.email}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <RoleIcon className={`h-3 w-3 ${roleConfig.color}`} />
                      <span className="text-[10px] text-white/40">{roleConfig.label}</span>
                    </div>
                  </div>
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-md border ${STATUS_STYLES[inv.status]}`}>
                    {inv.status}
                  </span>
                  {inv.status === 'pending' && (
                    <button
                      onClick={() => handleRevoke(inv.id)}
                      className="text-white/30 hover:text-red-400 transition-colors p-1"
                      title="Revoke invitation"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Inactive invitations */}
      {inactiveInvitations.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold text-white/25 uppercase tracking-widest mb-2">
            Past Invitations
          </p>
          <div className="space-y-1.5">
            {inactiveInvitations.slice(0, 5).map(inv => (
              <div key={inv.id} className="rounded-lg px-3 py-2 flex items-center gap-3 opacity-50"
                style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <p className="text-xs text-white/40 flex-1 truncate">{inv.email}</p>
                <span className={`text-[10px] px-1.5 py-0.5 rounded border ${STATUS_STYLES[inv.status]}`}>
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
