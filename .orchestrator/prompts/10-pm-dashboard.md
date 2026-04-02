# Task 10: Property Manager Admin Dashboard

Read the entire src/ directory before making any changes.

## Project Context

This is a Next.js 16 (App Router, TypeScript) web app called LeaseIQ for commercial retail tenants. Key tech:
- Tailwind CSS + shadcn/ui
- Supabase (PostgreSQL + Auth)
- Supabase clients: `createServerSupabaseClient()`, `createAdminSupabaseClient()` from `src/lib/supabase.ts`

### Styling Rules (MUST follow exactly)
- Dark theme: body gradient `linear-gradient(160deg, #1a1d25 0%, #13151d 55%, #0f1118 100%)`
- Emerald accents: `#10b981`
- Font: Plus Jakarta Sans
- Glass cards: `glass-card` class (backdrop-blur, bg-white/4%, border white/7%)
- Glass inputs: `glass-input` class
- Labels: `text-[10px] font-semibold text-white/35 uppercase tracking-widest`
- Frosted header: `glass border-b border-white/[0.07]`

### Existing Database Schema
- `tenant_profiles.role` — can be 'individual', 'tenant_admin', 'property_manager', 'super_admin'
- `stores` — has tenant_id FK
- `documents` — has tenant_id, store_id
- `conversations` — has tenant_id, store_id
- `team_invitations` — has tenant_id, email, role, status

### Existing Onboarding
- `src/app/onboarding/page.tsx` — server component
- `src/app/onboarding/client.tsx` — client component for onboarding form

---

## What This Task Must Do

Build a Property Manager (PM) role with a dedicated admin dashboard.

### Step 1: Add PM Role to Onboarding

Read `src/app/onboarding/client.tsx`. Currently it collects company_name and creates a tenant_profile. Add:

1. A role selector step: "I am a..." with options:
   - **Retail Tenant** (sets role = 'individual')
   - **Property Manager** (sets role = 'property_manager')

2. Style the options as large clickable cards:
```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
  <button
    onClick={() => setRole('individual')}
    className={`glass-card rounded-2xl p-6 text-left transition-all ${
      role === 'individual' ? 'ring-1 ring-emerald-500/40' : ''
    }`}
    style={{
      background: role === 'individual' ? 'rgba(16,185,129,0.08)' : undefined,
      borderColor: role === 'individual' ? 'rgba(16,185,129,0.25)' : undefined,
    }}
  >
    <Building2 className="h-8 w-8 text-emerald-400 mb-3" />
    <p className="font-semibold text-base">Retail Tenant</p>
    <p className="text-xs text-muted-foreground/70 mt-1">
      I lease space and want to understand my lease terms
    </p>
  </button>
  <button
    onClick={() => setRole('property_manager')}
    className={`glass-card rounded-2xl p-6 text-left transition-all ${
      role === 'property_manager' ? 'ring-1 ring-emerald-500/40' : ''
    }`}
    style={{
      background: role === 'property_manager' ? 'rgba(16,185,129,0.08)' : undefined,
      borderColor: role === 'property_manager' ? 'rgba(16,185,129,0.25)' : undefined,
    }}
  >
    <Users className="h-8 w-8 text-blue-400 mb-3" />
    <p className="font-semibold text-base">Property Manager</p>
    <p className="text-xs text-muted-foreground/70 mt-1">
      I manage properties and want to onboard my tenants
    </p>
  </button>
</div>
```

3. Include the role in the profile creation API call.

### Step 2: Create the PM Dashboard Page

Create `src/app/pm-dashboard/page.tsx`:

```typescript
export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase'
import Link from 'next/link'
import { FileText, ArrowLeft, Building2, Users, Mail } from 'lucide-react'
import { PMDashboardClient } from './client'

export default async function PMDashboardPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Check if user is a property manager
  const { data: profile } = await supabase
    .from('tenant_profiles')
    .select('role, company_name')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile) redirect('/onboarding')
  if (profile.role !== 'property_manager') redirect('/dashboard')

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="glass border-b border-white/[0.07] px-4 sm:px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-5">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="flex items-center justify-center w-8 h-8 rounded-xl transition-opacity group-hover:opacity-80"
              style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.25), rgba(20,184,166,0.15))', border: '1px solid rgba(16,185,129,0.2)' }}>
              <FileText className="h-4 w-4 text-emerald-400" />
            </div>
            <span className="font-bold text-base tracking-tight">LeaseIQ</span>
          </Link>
          <nav className="hidden sm:flex items-center gap-1">
            <span className="text-sm text-foreground/90 font-medium px-3 py-1.5 rounded-lg bg-white/[0.06]">
              PM Dashboard
            </span>
            <Link href="/settings" className="text-sm text-muted-foreground/70 hover:text-foreground/90 font-medium px-3 py-1.5 rounded-lg hover:bg-white/[0.04] transition-colors">
              Settings
            </Link>
          </nav>
        </div>
        <form action="/api/auth/signout" method="POST">
          <button className="text-sm text-muted-foreground/85 hover:text-foreground transition-colors">Sign out</button>
        </form>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-12 space-y-10">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Building2 className="h-4 w-4 text-emerald-400/60" />
            <span className="text-xs font-medium text-emerald-400/70 uppercase tracking-widest">
              Property Manager
            </span>
          </div>
          <h1 className="text-3xl font-bold">
            {profile.company_name ? `${profile.company_name} Dashboard` : 'PM Dashboard'}
          </h1>
          <p className="text-muted-foreground text-sm mt-1.5 font-light">
            Manage your properties and tenant adoption
          </p>
        </div>

        <PMDashboardClient />
      </main>
    </div>
  )
}
```

### Step 3: Create the PM Dashboard Client Component

Create `src/app/pm-dashboard/client.tsx`:

```tsx
'use client'

import { useState, useEffect } from 'react'
import {
  Building2, Users, Mail, UserPlus, Loader2, X,
  FileText, MessageSquare, CheckCircle, Clock
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
  const [inviteStoreId, setInviteStoreId] = useState('')
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
        // Refresh invitations
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
            <p className="text-xs text-muted-foreground/60">Send an invitation for a tenant to join LeaseIQ</p>
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
          Note: PMs cannot access tenant chat history. Tenants retain full control over their data.
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
```

### Step 4: Route PM Users to PM Dashboard

In `src/app/dashboard/page.tsx`, after fetching the profile, check the role:

```typescript
if (profile.role === 'property_manager') redirect('/pm-dashboard')
```

Add this after the `if (!profile) redirect('/onboarding')` line.

### Step 5: Privacy Note

Add a visible note in the PM dashboard that PMs CANNOT see tenant chat history. This is a privacy requirement. The note should appear in the invite form section and in any tenant detail view.

---

## Files to Create or Modify

### Create:
1. `src/app/pm-dashboard/page.tsx` — PM dashboard server component
2. `src/app/pm-dashboard/client.tsx` — PM dashboard client component

### Modify (read first):
1. `src/app/onboarding/client.tsx` — Add role selector
2. `src/app/dashboard/page.tsx` — Redirect PM users to pm-dashboard

### Check:
1. `src/app/api/team/route.ts` — Verify invitation API works
2. `supabase/migrations/002_multi_store.sql` — Verify role column exists on tenant_profiles

---

Run `npx next build` to verify. Fix any errors.
