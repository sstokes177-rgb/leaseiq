# Task 09: Team/Workspace Management

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
- Buttons: emerald gradient for primary, `glass-card` style for secondary

### Existing Database Table (from migration 003)
```sql
CREATE TABLE IF NOT EXISTS team_invitations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member', 'viewer')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
  invited_at TIMESTAMPTZ DEFAULT now(),
  accepted_at TIMESTAMPTZ
);
```

### Existing API Endpoints (READ these first)
- `GET /api/team` — Lists team invitations for the current user
- `POST /api/team` — Creates a new team invitation
- `DELETE /api/team` — Revokes an invitation by id

---

## What This Task Must Do

Build a team management section in the settings page. Users can:
1. Invite team members by email
2. Assign roles: Admin, Member, Viewer
3. View pending and accepted invitations
4. Revoke pending invitations
5. See a note about pricing: "$15/month per additional member"

### Step 1: Verify the API Routes

Read `src/app/api/team/route.ts`.

**GET handler** should:
```typescript
export async function GET() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminSupabaseClient()
  const { data, error } = await admin
    .from('team_invitations')
    .select('*')
    .eq('tenant_id', user.id)
    .order('invited_at', { ascending: false })

  if (error) return NextResponse.json({ invitations: [] })
  return NextResponse.json({ invitations: data ?? [] })
}
```

**POST handler** should:
```typescript
export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { email, role } = await request.json()
  if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 })

  const validRoles = ['admin', 'member', 'viewer']
  const inviteRole = validRoles.includes(role) ? role : 'member'

  const admin = createAdminSupabaseClient()

  // Check for existing invitation to this email
  const { data: existing } = await admin
    .from('team_invitations')
    .select('id, status')
    .eq('tenant_id', user.id)
    .eq('email', email.toLowerCase())
    .in('status', ['pending', 'accepted'])
    .maybeSingle()

  if (existing) {
    return NextResponse.json({
      error: existing.status === 'accepted'
        ? 'This person is already on your team'
        : 'An invitation is already pending for this email',
    }, { status: 409 })
  }

  const { error } = await admin.from('team_invitations').insert({
    tenant_id: user.id,
    email: email.toLowerCase(),
    role: inviteRole,
  })

  if (error) {
    return NextResponse.json({ error: 'Failed to send invitation' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
```

**DELETE handler** should:
```typescript
export async function DELETE(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const id = new URL(request.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const admin = createAdminSupabaseClient()
  await admin
    .from('team_invitations')
    .update({ status: 'revoked' })
    .eq('id', id)
    .eq('tenant_id', user.id)

  return NextResponse.json({ success: true })
}
```

Verify all three handlers exist and work correctly. Fix any issues.

### Step 2: Create the TeamManagement Component

Create `src/components/TeamManagement.tsx`:

This component should be rendered on the settings page below the existing settings form.

```tsx
'use client'

import { useState, useEffect } from 'react'
import {
  Users, UserPlus, Mail, Shield, Eye, Crown,
  Loader2, X, AlertCircle
} from 'lucide-react'

interface Invitation {
  id: string
  email: string
  role: string
  status: string
  invited_at: string
  accepted_at: string | null
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

      {/* Pricing note */}
      <div className="rounded-xl px-4 py-3 flex items-start gap-2"
        style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)' }}>
        <AlertCircle className="h-3.5 w-3.5 text-amber-400/70 mt-0.5 shrink-0" />
        <p className="text-xs text-amber-300/60">
          <span className="font-semibold text-amber-300/80">$15/month</span> per additional team member.
          The account owner is always included.
        </p>
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
```

### Step 3: Add TeamManagement to Settings Page

Read `src/app/settings/page.tsx` and the client component.

Add the `<TeamManagement />` component below the existing settings form. Import it in the appropriate file:

```tsx
import { TeamManagement } from '@/components/TeamManagement'

// In the render, after the existing SettingsClient:
<SettingsClient email={user.email ?? ''} />
<TeamManagement />
```

If the SettingsClient is the only component on the page, you may need to wrap both in a container, or add TeamManagement inside SettingsClient's render.

---

## Files to Create or Modify

### Create:
1. `src/components/TeamManagement.tsx` — Team management component

### Modify (read first):
1. `src/app/api/team/route.ts` — Verify/fix all handlers
2. `src/app/settings/page.tsx` or `src/app/settings/SettingsClient.tsx` — Add TeamManagement

### Check:
1. `supabase/migrations/003_cam_and_features.sql` — Verify team_invitations table

---

Run `npx next build` to verify. Fix any errors.
