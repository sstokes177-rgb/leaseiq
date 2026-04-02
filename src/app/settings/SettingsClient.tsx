'use client'

import { useState, useEffect } from 'react'
import {
  User, Mail, Globe, Bell, Loader2, Check,
} from 'lucide-react'

interface SettingsClientProps {
  email: string
}

export function SettingsClient({ email }: SettingsClientProps) {
  const [companyName, setCompanyName] = useState('')
  const [language, setLanguage] = useState('en')
  const [notifications, setNotifications] = useState({
    critical_dates: true,
    lease_expiry: true,
    cam_reconciliation: false,
    weekly_summary: false,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then(data => {
        if (data.profile) {
          setCompanyName(data.profile.company_name ?? '')
          setLanguage(data.profile.language_preference ?? 'en')
          if (data.profile.notification_prefs && typeof data.profile.notification_prefs === 'object') {
            setNotifications(prev => ({ ...prev, ...data.profile.notification_prefs }))
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_name: companyName,
          language_preference: language,
          notification_prefs: notifications,
        }),
      })
      if (res.ok) {
        setSaved(true)
        setTimeout(() => setSaved(false), 2500)
      }
    } catch {
      // Handle error
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        {[0, 1, 2].map(i => (
          <div key={i} className="glass-card rounded-2xl p-6 space-y-4">
            <div className="h-4 w-32 rounded-md" style={{ background: 'rgba(255,255,255,0.08)' }} />
            <div className="h-10 w-full rounded-xl" style={{ background: 'rgba(255,255,255,0.05)' }} />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Profile Section */}
      <div className="glass-card rounded-2xl p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl shrink-0"
            style={{ background: 'rgba(16,185,129,0.10)', border: '1px solid rgba(16,185,129,0.18)' }}>
            <User className="h-4 w-4 text-emerald-400" />
          </div>
          <div>
            <p className="font-semibold text-sm">Profile</p>
            <p className="text-xs text-muted-foreground/60">Your account information</p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Company Name */}
          <div>
            <label className="text-[10px] font-semibold text-white/35 uppercase tracking-widest mb-1.5 block">
              Company / Name
            </label>
            <input
              type="text"
              value={companyName}
              onChange={e => setCompanyName(e.target.value)}
              placeholder="Your company or name"
              className="glass-input w-full px-4 py-2.5 text-sm text-white/90 placeholder:text-white/25"
            />
          </div>

          {/* Email (read-only) */}
          <div>
            <label className="text-[10px] font-semibold text-white/35 uppercase tracking-widest mb-1.5 block">
              Email
            </label>
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <Mail className="h-3.5 w-3.5 text-white/30" />
              <span className="text-sm text-white/50">{email}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Language Section */}
      <div className="glass-card rounded-2xl p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl shrink-0"
            style={{ background: 'rgba(59,130,246,0.10)', border: '1px solid rgba(59,130,246,0.20)' }}>
            <Globe className="h-4 w-4 text-blue-400" />
          </div>
          <div>
            <p className="font-semibold text-sm">Language</p>
            <p className="text-xs text-muted-foreground/60">Choose your preferred language</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {[
            { value: 'en', label: 'English', flag: '\u{1F1FA}\u{1F1F8}' },
            { value: 'es', label: 'Espa\u00f1ol', flag: '\u{1F1EA}\u{1F1F8}' },
          ].map(lang => (
            <button
              key={lang.value}
              onClick={() => setLanguage(lang.value)}
              className={`px-4 py-3 rounded-xl text-sm font-medium transition-all text-left ${
                language === lang.value
                  ? 'ring-1 ring-emerald-500/40'
                  : 'hover:bg-white/[0.04]'
              }`}
              style={{
                background: language === lang.value
                  ? 'rgba(16,185,129,0.08)'
                  : 'rgba(255,255,255,0.03)',
                border: `1px solid ${
                  language === lang.value
                    ? 'rgba(16,185,129,0.25)'
                    : 'rgba(255,255,255,0.07)'
                }`,
              }}
            >
              <span className="mr-2">{lang.flag}</span>
              {lang.label}
            </button>
          ))}
        </div>
      </div>

      {/* Notifications Section */}
      <div className="glass-card rounded-2xl p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl shrink-0"
            style={{ background: 'rgba(245,158,11,0.10)', border: '1px solid rgba(245,158,11,0.20)' }}>
            <Bell className="h-4 w-4 text-amber-400" />
          </div>
          <div>
            <p className="font-semibold text-sm">Notifications</p>
            <p className="text-xs text-muted-foreground/60">Choose what alerts you receive</p>
          </div>
        </div>

        <div className="space-y-3">
          {[
            { key: 'critical_dates', label: 'Critical Date Reminders', desc: 'Get notified before important lease deadlines' },
            { key: 'lease_expiry', label: 'Lease Expiry Alerts', desc: 'Reminders as your lease expiration approaches' },
            { key: 'cam_reconciliation', label: 'CAM Reconciliation', desc: 'Alerts when CAM audit windows are approaching' },
            { key: 'weekly_summary', label: 'Weekly Summary', desc: 'A weekly digest of your portfolio status' },
          ].map(item => (
            <div key={item.key} className="flex items-center justify-between gap-4 py-2">
              <div>
                <p className="text-sm font-medium text-white/85">{item.label}</p>
                <p className="text-xs text-white/40">{item.desc}</p>
              </div>
              <button
                onClick={() => setNotifications(prev => ({
                  ...prev,
                  [item.key]: !prev[item.key as keyof typeof prev],
                }))}
                className={`relative w-11 h-6 rounded-full transition-all shrink-0 ${
                  notifications[item.key as keyof typeof notifications]
                    ? 'bg-emerald-500/80'
                    : 'bg-white/10'
                }`}
              >
                <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                  notifications[item.key as keyof typeof notifications]
                    ? 'translate-x-[22px]'
                    : 'translate-x-0.5'
                }`} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50"
          style={{
            background: saved
              ? 'rgba(16,185,129,0.3)'
              : 'linear-gradient(135deg, rgba(16,185,129,0.9), rgba(13,148,136,0.9))',
            border: '1px solid rgba(16,185,129,0.3)',
          }}
        >
          {saving ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</>
          ) : saved ? (
            <><Check className="h-4 w-4" /> Saved</>
          ) : (
            'Save Changes'
          )}
        </button>
      </div>
    </div>
  )
}
