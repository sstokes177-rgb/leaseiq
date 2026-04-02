'use client'

import { useState, useEffect } from 'react'
import {
  Loader2, Check, User, Bell, Globe, Palette, Users,
  Plus, X, Mail, Shield, Eye,
} from 'lucide-react'

interface SettingsClientProps {
  email: string
}

interface Profile {
  company_name: string | null
  language_preference: string | null
  notification_prefs: {
    critical_dates: boolean
    cam_deadlines: boolean
    rent_escalations: boolean
    weekly_digest: boolean
  } | null
  display_theme: string | null
}

interface Invitation {
  id: string
  email: string
  role: string
  status: string
  created_at: string
}

const ROLE_ICONS: Record<string, typeof Shield> = {
  admin: Shield,
  member: User,
  viewer: Eye,
}

const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-red-500/15 text-red-400 border-red-500/25',
  member: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
  viewer: 'bg-blue-500/15 text-blue-400 border-blue-500/25',
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-center justify-between cursor-pointer group">
      <span className="text-sm text-white/70 group-hover:text-white/90 transition-colors">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative w-9 h-5 rounded-full transition-colors ${checked ? 'bg-emerald-500/60' : 'bg-white/10'}`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${checked ? 'translate-x-4' : ''}`}
        />
      </button>
    </label>
  )
}

export function SettingsClient({ email }: SettingsClientProps) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [companyName, setCompanyName] = useState('')
  const [language, setLanguage] = useState('en')
  const [notifs, setNotifs] = useState({
    critical_dates: true,
    cam_deadlines: true,
    rent_escalations: true,
    weekly_digest: false,
  })

  // Team state
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [showInviteForm, setShowInviteForm] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('member')
  const [inviting, setInviting] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const [settingsRes, teamRes] = await Promise.all([
          fetch('/api/settings'),
          fetch('/api/team'),
        ])
        if (settingsRes.ok) {
          const data = await settingsRes.json()
          setProfile(data.profile)
          if (data.profile) {
            setCompanyName(data.profile.company_name ?? '')
            setLanguage(data.profile.language_preference ?? 'en')
            if (data.profile.notification_prefs) {
              setNotifs(data.profile.notification_prefs)
            }
          }
        }
        if (teamRes.ok) {
          const teamData = await teamRes.json()
          setInvitations(teamData.invitations ?? [])
        }
      } catch {
        // Fail silently
      } finally {
        setLoading(false)
      }
    }
    fetchSettings()
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_name: companyName || null,
          language_preference: language,
          notification_prefs: notifs,
        }),
      })
      if (res.ok) {
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
      }
    } catch {
      // Fail silently
    } finally {
      setSaving(false)
    }
  }

  const handleInvite = async () => {
    if (!inviteEmail) return
    setInviting(true)
    setInviteError(null)
    try {
      const res = await fetch('/api/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      })
      const data = await res.json()
      if (res.ok) {
        setInviteEmail('')
        setShowInviteForm(false)
        // Refresh invitations
        const teamRes = await fetch('/api/team')
        if (teamRes.ok) {
          const teamData = await teamRes.json()
          setInvitations(teamData.invitations ?? [])
        }
      } else {
        setInviteError(data.error ?? 'Could not send invitation')
      }
    } catch {
      setInviteError('Network error')
    } finally {
      setInviting(false)
    }
  }

  const handleRevokeInvite = async (id: string) => {
    try {
      await fetch(`/api/team?id=${id}`, { method: 'DELETE' })
      setInvitations((prev) => prev.filter((inv) => inv.id !== id))
    } catch {
      // Fail silently
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        {[0, 1, 2].map((i) => (
          <div key={i} className="glass-card rounded-2xl p-6 animate-pulse space-y-3">
            <div className="h-4 w-32 rounded" style={{ background: 'rgba(255,255,255,0.08)' }} />
            <div className="h-3 w-64 rounded" style={{ background: 'rgba(255,255,255,0.05)' }} />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Account Info */}
      <div className="glass-card rounded-2xl p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div
            className="flex items-center justify-center w-9 h-9 rounded-xl shrink-0"
            style={{ background: 'rgba(16,185,129,0.10)', border: '1px solid rgba(16,185,129,0.18)' }}
          >
            <User className="h-4 w-4 text-emerald-400" />
          </div>
          <div>
            <p className="font-semibold text-sm">Account Information</p>
            <p className="text-xs text-muted-foreground/60">Your profile details</p>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-[10px] font-semibold text-white/35 uppercase tracking-widest block mb-1">Email</label>
            <p className="text-sm text-white/60 bg-white/[0.04] rounded-lg px-3 py-2 border border-white/[0.07]">{email}</p>
          </div>
          <div>
            <label className="text-[10px] font-semibold text-white/35 uppercase tracking-widest block mb-1">Company Name</label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Your company name"
              className="w-full bg-white/[0.06] border border-white/[0.10] rounded-lg px-3 py-2 text-sm text-white/85 placeholder:text-white/25"
            />
          </div>
        </div>
      </div>

      {/* Notification Preferences */}
      <div className="glass-card rounded-2xl p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div
            className="flex items-center justify-center w-9 h-9 rounded-xl shrink-0"
            style={{ background: 'rgba(245,158,11,0.10)', border: '1px solid rgba(245,158,11,0.20)' }}
          >
            <Bell className="h-4 w-4 text-amber-400" />
          </div>
          <div>
            <p className="font-semibold text-sm">Notification Preferences</p>
            <p className="text-xs text-muted-foreground/60">Choose what alerts you receive</p>
          </div>
        </div>

        <div className="space-y-3">
          <Toggle
            label="Critical date reminders"
            checked={notifs.critical_dates}
            onChange={(v) => setNotifs((n) => ({ ...n, critical_dates: v }))}
          />
          <Toggle
            label="CAM deadline alerts"
            checked={notifs.cam_deadlines}
            onChange={(v) => setNotifs((n) => ({ ...n, cam_deadlines: v }))}
          />
          <Toggle
            label="Rent escalation notices"
            checked={notifs.rent_escalations}
            onChange={(v) => setNotifs((n) => ({ ...n, rent_escalations: v }))}
          />
          <Toggle
            label="Weekly digest email"
            checked={notifs.weekly_digest}
            onChange={(v) => setNotifs((n) => ({ ...n, weekly_digest: v }))}
          />
        </div>
      </div>

      {/* Language */}
      <div className="glass-card rounded-2xl p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div
            className="flex items-center justify-center w-9 h-9 rounded-xl shrink-0"
            style={{ background: 'rgba(99,102,241,0.10)', border: '1px solid rgba(99,102,241,0.20)' }}
          >
            <Globe className="h-4 w-4 text-indigo-400" />
          </div>
          <div>
            <p className="font-semibold text-sm">Language</p>
            <p className="text-xs text-muted-foreground/60">Choose your preferred language</p>
          </div>
        </div>

        <div className="flex gap-2">
          {[
            { code: 'en', label: 'English' },
            { code: 'es', label: 'Espa\u00f1ol' },
          ].map((lang) => (
            <button
              key={lang.code}
              onClick={() => setLanguage(lang.code)}
              className={`px-4 py-2 rounded-lg text-sm transition-colors border ${
                language === lang.code
                  ? 'bg-white/[0.08] border-emerald-500/30 text-white/90 font-medium'
                  : 'bg-white/[0.03] border-white/[0.07] text-white/50 hover:text-white/70'
              }`}
            >
              {lang.label}
            </button>
          ))}
        </div>
      </div>

      {/* Display */}
      <div className="glass-card rounded-2xl p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div
            className="flex items-center justify-center w-9 h-9 rounded-xl shrink-0"
            style={{ background: 'rgba(168,85,247,0.10)', border: '1px solid rgba(168,85,247,0.20)' }}
          >
            <Palette className="h-4 w-4 text-purple-400" />
          </div>
          <div>
            <p className="font-semibold text-sm">Display</p>
            <p className="text-xs text-muted-foreground/60">Appearance settings</p>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            className="px-4 py-2 rounded-lg text-sm bg-white/[0.08] border border-emerald-500/30 text-white/90 font-medium"
          >
            Dark
          </button>
          <button
            className="px-4 py-2 rounded-lg text-sm bg-white/[0.03] border border-white/[0.07] text-white/30 cursor-not-allowed"
            disabled
          >
            Light (coming soon)
          </button>
        </div>
      </div>

      {/* Team */}
      <div className="glass-card rounded-2xl p-6 space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className="flex items-center justify-center w-9 h-9 rounded-xl shrink-0"
              style={{ background: 'rgba(236,72,153,0.10)', border: '1px solid rgba(236,72,153,0.20)' }}
            >
              <Users className="h-4 w-4 text-pink-400" />
            </div>
            <div>
              <p className="font-semibold text-sm">Team</p>
              <p className="text-xs text-muted-foreground/60">Manage team members and access</p>
            </div>
          </div>
          {!showInviteForm && (
            <button
              onClick={() => setShowInviteForm(true)}
              className="flex items-center gap-1.5 text-xs font-medium text-pink-400/80 hover:text-pink-300 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" /> Invite
            </button>
          )}
        </div>

        {/* Invite form */}
        {showInviteForm && (
          <div
            className="rounded-xl px-4 py-3 space-y-3"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
          >
            <p className="text-xs font-semibold text-white/50">Invite Team Member</p>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Mail className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30" />
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="Email address"
                  className="w-full bg-white/[0.06] border border-white/[0.10] rounded-lg pl-7 pr-2 py-1.5 text-xs text-white/85 placeholder:text-white/25"
                />
              </div>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                className="bg-white/[0.06] border border-white/[0.10] rounded-lg px-2 py-1.5 text-xs text-white/85"
              >
                <option value="admin">Admin</option>
                <option value="member">Member</option>
                <option value="viewer">Viewer</option>
              </select>
              <button
                onClick={handleInvite}
                disabled={inviting || !inviteEmail}
                className="text-xs font-medium text-emerald-400 hover:text-emerald-300 disabled:opacity-40 px-2 py-1.5"
              >
                {inviting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Send'}
              </button>
            </div>
            {inviteError && <p className="text-xs text-red-400/80">{inviteError}</p>}
            <div className="flex items-center justify-between">
              <p className="text-[10px] text-white/25">Additional team members: $15/month each</p>
              <button
                onClick={() => { setShowInviteForm(false); setInviteError(null) }}
                className="text-[11px] text-white/30 hover:text-white/50"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Current invitations */}
        {invitations.length > 0 ? (
          <div className="space-y-2">
            {invitations.map((inv) => {
              const RoleIcon = ROLE_ICONS[inv.role] ?? User
              const roleColor = ROLE_COLORS[inv.role] ?? ROLE_COLORS.member
              return (
                <div
                  key={inv.id}
                  className="flex items-center justify-between gap-3 rounded-lg px-3 py-2.5"
                  style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Mail className="h-3.5 w-3.5 text-white/30 shrink-0" />
                    <span className="text-xs text-white/70 truncate">{inv.email}</span>
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border shrink-0 ${roleColor}`}>
                      <RoleIcon className="h-2.5 w-2.5 inline mr-0.5" />
                      {inv.role}
                    </span>
                    {inv.status === 'pending' && (
                      <span className="text-[10px] text-amber-400/60">Pending</span>
                    )}
                  </div>
                  {inv.status === 'pending' && (
                    <button
                      onClick={() => handleRevokeInvite(inv.id)}
                      className="text-white/25 hover:text-red-400/80 transition-colors shrink-0"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          <p className="text-xs text-white/30">No team members yet.</p>
        )}
      </div>

      {/* Save button */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25 transition-colors disabled:opacity-50"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : saved ? (
            <Check className="h-4 w-4" />
          ) : null}
          {saving ? 'Saving…' : saved ? 'Saved!' : 'Save Changes'}
        </button>
      </div>
    </div>
  )
}
