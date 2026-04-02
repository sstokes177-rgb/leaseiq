# Task 08: Profile Settings Page

Read the entire src/ directory before making any changes.

## Project Context

This is a Next.js 16 (App Router, TypeScript) web app called LeaseIQ for commercial retail tenants. Key tech:
- Tailwind CSS + shadcn/ui
- Supabase Auth (email/password)
- Supabase clients: `createServerSupabaseClient()`, `createAdminSupabaseClient()` from `src/lib/supabase.ts`

### Styling Rules (MUST follow exactly)
- Dark theme: body gradient `linear-gradient(160deg, #1a1d25 0%, #13151d 55%, #0f1118 100%)`
- Emerald accents: `#10b981`, highlights `rgba(16,185,129,...)`
- Font: Plus Jakarta Sans
- Glass cards: `glass-card` class (bg rgba(255,255,255,0.04), backdrop-blur-24px, border rgba(255,255,255,0.07))
- Glass inputs: `glass-input` class (similar with focus ring in emerald)
- Labels: `text-[10px] font-semibold text-white/35 uppercase tracking-widest`
- Button primary: `bg-gradient-to-r from-emerald-500 to-teal-500 text-white` with hover brightness
- Frosted header: `glass border-b border-white/[0.07]`

### Database Schema (already exists)
`tenant_profiles` table columns:
- id (UUID, references auth.users)
- company_name (TEXT)
- space_number (TEXT)
- property_name (TEXT)
- role (TEXT: individual, tenant_admin, property_manager, super_admin)
- language_preference (TEXT, default 'en')
- notification_prefs (JSONB, default '{}')
- display_theme (TEXT, default 'dark')
- created_at, updated_at

### Existing Files (READ these first)
- `src/app/settings/page.tsx` — Server component that checks auth and renders SettingsClient
- `src/app/settings/SettingsClient.tsx` — Client component for the settings form (may exist already)
- `src/app/api/settings/route.ts` — GET and PUT handlers for profile settings

### Existing API Endpoints
- `GET /api/settings` — Returns `{ profile, email }`
- `PUT /api/settings` — Updates profile with `{ company_name, language_preference, notification_prefs, display_theme }`

---

## What This Task Must Do

Verify and complete the profile settings page at `/settings`. It should allow users to:
1. View and edit their name/company name
2. View their email (from Supabase Auth — read-only display)
3. Set language preference (English/Spanish)
4. Configure notification preferences
5. All with proper dark theme styling

### Step 1: Verify the API Routes

Read `src/app/api/settings/route.ts`.

**GET handler** should:
```typescript
export async function GET() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('tenant_profiles')
    .select('company_name, role, language_preference, notification_prefs, display_theme')
    .eq('id', user.id)
    .maybeSingle()

  return NextResponse.json({
    profile: profile ?? null,
    email: user.email ?? '',
  })
}
```

**PUT handler** should:
```typescript
export async function PUT(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { company_name, language_preference, notification_prefs, display_theme } = body

  const admin = createAdminSupabaseClient()
  const { error } = await admin
    .from('tenant_profiles')
    .update({
      company_name: company_name ?? undefined,
      language_preference: language_preference ?? undefined,
      notification_prefs: notification_prefs ?? undefined,
      display_theme: display_theme ?? undefined,
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id)

  if (error) {
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
```

### Step 2: Verify/Implement the Settings Page

Read `src/app/settings/page.tsx`. The server component should:
1. Check authentication (redirect to /login if not authenticated)
2. Render the header with back navigation to /dashboard
3. Render `<SettingsClient email={user.email} />`

This should already exist. Verify it matches the expected structure.

### Step 3: Verify/Implement the SettingsClient Component

Read `src/app/settings/SettingsClient.tsx` (may be at this path or a different name). Implement/fix:

```tsx
'use client'

import { useState, useEffect } from 'react'
import {
  User, Mail, Globe, Bell, Loader2, Check, Settings
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

  // Fetch current settings
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
            { value: 'en', label: 'English', flag: '🇺🇸' },
            { value: 'es', label: 'Español', flag: '🇪🇸' },
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
```

### Step 4: Verify the Settings Page Server Component

Read `src/app/settings/page.tsx`. It should have:
- Auth check
- Header with LeaseIQ branding, back arrow to dashboard
- `<SettingsClient email={user.email} />`

This should already exist. Verify the header uses the standard LeaseIQ header pattern with:
- `glass border-b border-white/[0.07]` header
- FileText icon in emerald gradient box
- "LeaseIQ" text
- Back arrow linking to dashboard

---

## Files to Create or Modify

### Modify (read first):
1. `src/app/settings/SettingsClient.tsx` (or wherever the client component is) — Verify/enhance with full form
2. `src/app/api/settings/route.ts` — Verify GET and PUT handlers

### Check (read only, fix if broken):
1. `src/app/settings/page.tsx` — Verify server component structure

---

Run `npx next build` to verify. Fix any errors.
