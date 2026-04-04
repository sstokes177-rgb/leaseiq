'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  Users, MessageSquare, FileText, Shield, Activity, BarChart3,
  TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight,
} from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend,
} from 'recharts'

interface AdminStats {
  total_users: number
  users_this_week: number
  users_this_month: number
  users_by_day: Array<{ date: string; count: number }>
  total_conversations: number
  total_messages: number
  messages_this_week: number
  conversations_by_day: Array<{ date: string; count: number }>
  total_documents: number
  documents_this_week: number
  total_chunks: number
  total_risk_scores: number
  total_cam_audits: number
  total_stores: number
  total_lease_summaries: number
  active_users_7d: number
  active_users_30d: number
  top_users: Array<{
    email: string
    message_count: number
    store_count: number
    last_active: string
    joined: string
  }>
  activity_feed: Array<{
    timestamp: string
    user_email: string
    action: string
  }>
  retention: {
    day1: number
    week1: number
    month1: number
  }
}

type SortKey = 'email' | 'message_count' | 'store_count' | 'last_active' | 'joined'

export function AdminDashboardClient() {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sortKey, setSortKey] = useState<SortKey>('message_count')
  const [sortAsc, setSortAsc] = useState(false)

  useEffect(() => {
    fetch('/api/admin/stats')
      .then(r => {
        if (!r.ok) throw new Error('Failed to fetch stats')
        return r.json()
      })
      .then(setStats)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const sortedUsers = useMemo(() => {
    if (!stats) return []
    const users = [...stats.top_users]
    users.sort((a, b) => {
      let cmp = 0
      if (sortKey === 'email') cmp = a.email.localeCompare(b.email)
      else if (sortKey === 'message_count') cmp = a.message_count - b.message_count
      else if (sortKey === 'store_count') cmp = a.store_count - b.store_count
      else if (sortKey === 'last_active') cmp = new Date(a.last_active).getTime() - new Date(b.last_active).getTime()
      else if (sortKey === 'joined') cmp = new Date(a.joined).getTime() - new Date(b.joined).getTime()
      return sortAsc ? cmp : -cmp
    })
    return users
  }, [stats, sortKey, sortAsc])

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc)
    else { setSortKey(key); setSortAsc(false) }
  }

  const featureData = useMemo(() => {
    if (!stats) return []
    return [
      { name: 'Messages', value: stats.total_messages, color: '#10b981' },
      { name: 'Risk Scores', value: stats.total_risk_scores, color: '#14b8a6' },
      { name: 'CAM Audits', value: stats.total_cam_audits, color: '#06b6d4' },
      { name: 'Lease Summaries', value: stats.total_lease_summaries, color: '#8b5cf6' },
      { name: 'Documents', value: stats.total_documents, color: '#f59e0b' },
    ].filter(d => d.value > 0)
  }, [stats])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
          <p className="text-sm text-gray-400">Loading admin stats...</p>
        </div>
      </div>
    )
  }

  if (error || !stats) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <p className="text-red-400 mb-2">Failed to load admin stats</p>
          <p className="text-sm text-gray-500">{error}</p>
        </div>
      </div>
    )
  }

  // Messages by day (derived from conversations_by_day for simplicity — we already have it)
  const messagesByDay = stats.conversations_by_day

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Shield className="h-4 w-4 text-emerald-400/60" />
          <span className="text-xs font-medium text-emerald-400/70 uppercase tracking-widest">
            Admin
          </span>
        </div>
        <h1 className="text-2xl font-semibold text-white tracking-tight">Provelo Admin</h1>
        <p className="text-gray-400 text-sm mt-1">Business metrics and platform analytics</p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard
          label="Total Users"
          value={stats.total_users}
          change={stats.users_this_week}
          changeLabel="this week"
          icon={<Users className="h-4 w-4" />}
          sparkData={stats.users_by_day.slice(-7)}
        />
        <StatCard
          label="Active Users (7d)"
          value={stats.active_users_7d}
          change={null}
          changeLabel=""
          icon={<Activity className="h-4 w-4" />}
        />
        <StatCard
          label="Total Messages"
          value={stats.total_messages}
          change={stats.messages_this_week}
          changeLabel="this week"
          icon={<MessageSquare className="h-4 w-4" />}
        />
        <StatCard
          label="Documents"
          value={stats.total_documents}
          change={stats.documents_this_week}
          changeLabel="this week"
          icon={<FileText className="h-4 w-4" />}
        />
        <StatCard
          label="Risk Scores"
          value={stats.total_risk_scores}
          change={null}
          changeLabel=""
          icon={<Shield className="h-4 w-4" />}
        />
        <StatCard
          label="CAM Audits"
          value={stats.total_cam_audits}
          change={null}
          changeLabel=""
          icon={<BarChart3 className="h-4 w-4" />}
        />
      </div>

      {/* Chart 1: User Signups */}
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6">
        <h2 className="text-lg font-medium text-white mb-4">User Signups (Last 30 Days)</h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={stats.users_by_day}>
              <defs>
                <linearGradient id="signupGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis
                dataKey="date"
                tick={{ fill: '#9ca3af', fontSize: 11 }}
                tickFormatter={(v) => new Date(v + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                interval="preserveStartEnd"
                stroke="rgba(255,255,255,0.06)"
              />
              <YAxis
                tick={{ fill: '#9ca3af', fontSize: 11 }}
                stroke="rgba(255,255,255,0.06)"
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  background: 'rgba(17,19,27,0.95)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: 13,
                }}
                labelFormatter={(v) => new Date(v + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              />
              <Area
                type="monotone"
                dataKey="count"
                stroke="#10b981"
                strokeWidth={2}
                fill="url(#signupGrad)"
                name="Signups"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Chart 2: Daily Conversations */}
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6">
        <h2 className="text-lg font-medium text-white mb-4">Daily Conversations (Last 30 Days)</h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={messagesByDay}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis
                dataKey="date"
                tick={{ fill: '#9ca3af', fontSize: 11 }}
                tickFormatter={(v) => new Date(v + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                interval="preserveStartEnd"
                stroke="rgba(255,255,255,0.06)"
              />
              <YAxis
                tick={{ fill: '#9ca3af', fontSize: 11 }}
                stroke="rgba(255,255,255,0.06)"
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  background: 'rgba(17,19,27,0.95)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: 13,
                }}
                labelFormatter={(v) => new Date(v + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              />
              <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} name="Conversations" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts row: Feature Usage + Retention */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 3: Feature Usage */}
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6">
          <h2 className="text-lg font-medium text-white mb-4">Feature Usage</h2>
          {featureData.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={featureData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                    nameKey="name"
                    label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                  >
                    {featureData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: 'rgba(17,19,27,0.95)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: 13,
                    }}
                  />
                  <Legend
                    wrapperStyle={{ color: '#9ca3af', fontSize: 12 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No feature usage data yet</p>
          )}
        </div>

        {/* Chart 4: User Retention */}
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6">
          <h2 className="text-lg font-medium text-white mb-4">User Retention</h2>
          <div className="space-y-6 mt-2">
            <RetentionBar label="Day 1 Retention" value={stats.retention.day1} />
            <RetentionBar label="Week 1 Retention" value={stats.retention.week1} />
            <RetentionBar label="Month 1 Retention" value={stats.retention.month1} />
          </div>
          <div className="mt-6 pt-4 border-t border-white/[0.06] grid grid-cols-2 gap-4">
            <div>
              <p className="text-2xl font-semibold text-white">{stats.active_users_7d}</p>
              <p className="text-xs text-gray-400 mt-1">Active (7 days)</p>
            </div>
            <div>
              <p className="text-2xl font-semibold text-white">{stats.active_users_30d}</p>
              <p className="text-xs text-gray-400 mt-1">Active (30 days)</p>
            </div>
          </div>
        </div>
      </div>

      {/* Top Users Table */}
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-white/[0.06]">
          <h2 className="text-lg font-medium text-white">Top Users</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <SortHeader label="Email" sortKey="email" currentKey={sortKey} asc={sortAsc} onClick={handleSort} />
                <SortHeader label="Messages" sortKey="message_count" currentKey={sortKey} asc={sortAsc} onClick={handleSort} />
                <SortHeader label="Locations" sortKey="store_count" currentKey={sortKey} asc={sortAsc} onClick={handleSort} />
                <SortHeader label="Last Active" sortKey="last_active" currentKey={sortKey} asc={sortAsc} onClick={handleSort} />
                <SortHeader label="Joined" sortKey="joined" currentKey={sortKey} asc={sortAsc} onClick={handleSort} />
              </tr>
            </thead>
            <tbody>
              {sortedUsers.map((user, i) => (
                <tr key={i} className="border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors">
                  <td className="px-6 py-3 text-gray-300">{user.email}</td>
                  <td className="px-6 py-3 text-gray-300 text-right">{user.message_count}</td>
                  <td className="px-6 py-3 text-gray-300 text-right">{user.store_count}</td>
                  <td className="px-6 py-3 text-gray-400">{formatDate(user.last_active)}</td>
                  <td className="px-6 py-3 text-gray-400">{formatDate(user.joined)}</td>
                </tr>
              ))}
              {sortedUsers.length === 0 && (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">No users yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Activity Feed */}
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-white/[0.06]">
          <h2 className="text-lg font-medium text-white">Recent Activity</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody>
              {stats.activity_feed.map((item, i) => (
                <tr key={i} className="border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors">
                  <td className="px-6 py-3 text-gray-400 whitespace-nowrap">{formatDateTime(item.timestamp)}</td>
                  <td className="px-6 py-3 text-gray-300">{item.user_email}</td>
                  <td className="px-6 py-3 text-gray-300">{item.action}</td>
                </tr>
              ))}
              {stats.activity_feed.length === 0 && (
                <tr><td colSpan={3} className="px-6 py-8 text-center text-gray-500">No activity yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

/* ─── Subcomponents ─── */

function StatCard({
  label, value, change, changeLabel, icon, sparkData,
}: {
  label: string
  value: number
  change: number | null
  changeLabel: string
  icon: React.ReactNode
  sparkData?: Array<{ count: number }>
}) {
  const isPositive = change !== null && change > 0

  return (
    <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-gray-400">{icon}</span>
        {change !== null && (
          <span className={`flex items-center gap-0.5 text-xs font-medium ${isPositive ? 'text-emerald-400' : 'text-gray-500'}`}>
            {isPositive ? <ArrowUpRight className="h-3 w-3" /> : null}
            {change > 0 ? `+${change}` : change}
          </span>
        )}
      </div>
      <p className="text-3xl font-semibold text-white">{value.toLocaleString()}</p>
      <p className="text-sm text-gray-400">{label}</p>
      {change !== null && changeLabel && (
        <p className="text-xs text-gray-500">{changeLabel}</p>
      )}
      {sparkData && sparkData.length > 0 && (
        <div className="h-8 mt-1">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sparkData}>
              <defs>
                <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area type="monotone" dataKey="count" stroke="#10b981" strokeWidth={1.5} fill="url(#sparkGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}

function RetentionBar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-300">{label}</span>
        <span className="text-sm font-semibold text-white">{value}%</span>
      </div>
      <div className="w-full h-2 rounded-full bg-white/[0.06]">
        <div
          className="h-full rounded-full bg-emerald-500 transition-all duration-500"
          style={{ width: `${Math.min(value, 100)}%` }}
        />
      </div>
    </div>
  )
}

function SortHeader({
  label, sortKey, currentKey, asc, onClick,
}: {
  label: string
  sortKey: SortKey
  currentKey: SortKey
  asc: boolean
  onClick: (key: SortKey) => void
}) {
  const isActive = currentKey === sortKey
  return (
    <th
      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-300 transition-colors select-none"
      onClick={() => onClick(sortKey)}
    >
      <span className="flex items-center gap-1">
        {label}
        {isActive && (
          asc
            ? <TrendingUp className="h-3 w-3 text-emerald-400" />
            : <TrendingDown className="h-3 w-3 text-emerald-400" />
        )}
      </span>
    </th>
  )
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '-'
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    })
  } catch { return dateStr }
}

function formatDateTime(dateStr: string): string {
  if (!dateStr) return '-'
  try {
    return new Date(dateStr).toLocaleString('en-US', {
      month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
    })
  } catch { return dateStr }
}
