import { NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET() {
  // Authenticate and verify super_admin
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('tenant_profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (profile?.role !== 'super_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const admin = createAdminSupabaseClient()
  const now = new Date()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  try {
    // Run all queries in parallel
    const [
      usersRes,
      usersThisWeekRes,
      usersThisMonthRes,
      usersByDayRes,
      totalConversationsRes,
      totalMessagesRes,
      messagesThisWeekRes,
      conversationsByDayRes,
      totalDocumentsRes,
      documentsThisWeekRes,
      totalChunksRes,
      totalRiskScoresRes,
      totalCamAuditsRes,
      totalStoresRes,
      totalLeaseSummariesRes,
      activeUsers7dRes,
      activeUsers30dRes,
      topUsersMessagesRes,
      recentMessagesRes,
      recentDocumentsRes,
      recentRiskScoresRes,
      recentCamAuditsRes,
    ] = await Promise.all([
      // Total users
      admin.from('tenant_profiles').select('*', { count: 'exact', head: true }),
      // Users this week
      admin.from('tenant_profiles').select('*', { count: 'exact', head: true })
        .gte('created_at', sevenDaysAgo.toISOString()),
      // Users this month
      admin.from('tenant_profiles').select('*', { count: 'exact', head: true })
        .gte('created_at', thirtyDaysAgo.toISOString()),
      // Users by day (last 30 days)
      admin.from('tenant_profiles').select('created_at')
        .gte('created_at', thirtyDaysAgo.toISOString()),
      // Total conversations
      admin.from('conversations').select('*', { count: 'exact', head: true }),
      // Total messages
      admin.from('messages').select('*', { count: 'exact', head: true }),
      // Messages this week
      admin.from('messages').select('*', { count: 'exact', head: true })
        .gte('created_at', sevenDaysAgo.toISOString()),
      // Conversations by day (last 30 days — use created_at)
      admin.from('conversations').select('created_at')
        .gte('created_at', thirtyDaysAgo.toISOString()),
      // Total documents
      admin.from('documents').select('*', { count: 'exact', head: true }),
      // Documents this week
      admin.from('documents').select('*', { count: 'exact', head: true })
        .gte('uploaded_at', sevenDaysAgo.toISOString()),
      // Total chunks
      admin.from('document_chunks').select('*', { count: 'exact', head: true }),
      // Total risk scores
      admin.from('lease_risk_scores').select('*', { count: 'exact', head: true }),
      // Total cam audits
      admin.from('cam_audits').select('*', { count: 'exact', head: true }),
      // Total stores
      admin.from('stores').select('*', { count: 'exact', head: true }),
      // Total lease summaries
      admin.from('lease_summaries').select('*', { count: 'exact', head: true }),
      // Active users 7d (distinct tenant_ids from conversations updated in last 7 days)
      admin.from('conversations').select('tenant_id')
        .gte('updated_at', sevenDaysAgo.toISOString()),
      // Active users 30d
      admin.from('conversations').select('tenant_id')
        .gte('updated_at', thirtyDaysAgo.toISOString()),
      // Top users by message count — get conversations with tenant_id, then join messages
      admin.from('conversations').select('tenant_id, messages(id)'),
      // Recent messages (for activity feed)
      admin.from('messages').select('id, role, created_at, conversation_id')
        .eq('role', 'user')
        .order('created_at', { ascending: false })
        .limit(50),
      // Recent documents
      admin.from('documents').select('id, tenant_id, file_name, uploaded_at')
        .order('uploaded_at', { ascending: false })
        .limit(20),
      // Recent risk scores
      admin.from('lease_risk_scores').select('id, tenant_id, store_id, analyzed_at')
        .order('analyzed_at', { ascending: false })
        .limit(20),
      // Recent cam audits
      admin.from('cam_audits').select('id, tenant_id, store_id, audit_date')
        .order('audit_date', { ascending: false })
        .limit(20),
    ])

    // Aggregate users by day
    const usersByDay = aggregateByDay(
      (usersByDayRes.data ?? []).map(u => u.created_at),
      thirtyDaysAgo,
      now,
    )

    // Aggregate conversations by day
    const conversationsByDay = aggregateByDay(
      (conversationsByDayRes.data ?? []).map(c => c.created_at),
      thirtyDaysAgo,
      now,
    )

    // Active users (distinct)
    const active7dSet = new Set((activeUsers7dRes.data ?? []).map(c => c.tenant_id))
    const active30dSet = new Set((activeUsers30dRes.data ?? []).map(c => c.tenant_id))

    // Top users by message count
    const userMessageCounts: Record<string, number> = {}
    for (const conv of (topUsersMessagesRes.data ?? [])) {
      const tid = conv.tenant_id as string
      const msgCount = Array.isArray(conv.messages) ? conv.messages.length : 0
      userMessageCounts[tid] = (userMessageCounts[tid] ?? 0) + msgCount
    }

    // Get store counts per user
    const { data: allStores } = await admin.from('stores').select('tenant_id')
    const userStoreCounts: Record<string, number> = {}
    for (const s of (allStores ?? [])) {
      userStoreCounts[s.tenant_id] = (userStoreCounts[s.tenant_id] ?? 0) + 1
    }

    // Get user emails via admin auth API
    const topUserIds = Object.entries(userMessageCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([id]) => id)

    // Fetch profiles for top users to get info, and auth users for emails
    const { data: topProfiles } = await admin
      .from('tenant_profiles')
      .select('id, company_name, created_at')
      .in('id', topUserIds.length > 0 ? topUserIds : ['none'])

    const profileMap: Record<string, { company_name: string | null; created_at: string }> = {}
    for (const p of (topProfiles ?? [])) {
      profileMap[p.id] = { company_name: p.company_name, created_at: p.created_at }
    }

    // Get emails from auth.users via admin API
    const emailMap: Record<string, string> = {}
    if (topUserIds.length > 0) {
      const { data: authData } = await admin.auth.admin.listUsers({ perPage: 1000 })
      if (authData?.users) {
        for (const u of authData.users) {
          emailMap[u.id] = u.email ?? 'unknown'
        }
      }
    }

    // Get last active (most recent conversation updated_at per user)
    const { data: lastActiveData } = await admin
      .from('conversations')
      .select('tenant_id, updated_at')
      .in('tenant_id', topUserIds.length > 0 ? topUserIds : ['none'])
      .order('updated_at', { ascending: false })

    const lastActiveMap: Record<string, string> = {}
    for (const row of (lastActiveData ?? [])) {
      if (!lastActiveMap[row.tenant_id]) {
        lastActiveMap[row.tenant_id] = row.updated_at
      }
    }

    const topUsers = topUserIds.map(id => ({
      email: emailMap[id] ?? 'unknown',
      message_count: userMessageCounts[id] ?? 0,
      store_count: userStoreCounts[id] ?? 0,
      last_active: lastActiveMap[id] ?? profileMap[id]?.created_at ?? '',
      joined: profileMap[id]?.created_at ?? '',
    }))

    // Build activity feed
    // Get conversation -> tenant_id mapping for messages
    const messageConvIds = (recentMessagesRes.data ?? []).map(m => m.conversation_id)
    const { data: convTenants } = await admin
      .from('conversations')
      .select('id, tenant_id')
      .in('id', messageConvIds.length > 0 ? messageConvIds : ['none'])

    const convTenantMap: Record<string, string> = {}
    for (const ct of (convTenants ?? [])) {
      convTenantMap[ct.id] = ct.tenant_id
    }

    type ActivityItem = {
      timestamp: string
      user_email: string
      action: string
    }

    const activityFeed: ActivityItem[] = []

    for (const msg of (recentMessagesRes.data ?? [])) {
      const tenantId = convTenantMap[msg.conversation_id]
      activityFeed.push({
        timestamp: msg.created_at,
        user_email: emailMap[tenantId] ?? tenantId ?? 'unknown',
        action: 'Sent a message',
      })
    }

    for (const doc of (recentDocumentsRes.data ?? [])) {
      activityFeed.push({
        timestamp: doc.uploaded_at,
        user_email: emailMap[doc.tenant_id] ?? doc.tenant_id ?? 'unknown',
        action: `Uploaded document: ${doc.file_name}`,
      })
    }

    for (const rs of (recentRiskScoresRes.data ?? [])) {
      activityFeed.push({
        timestamp: rs.analyzed_at,
        user_email: emailMap[rs.tenant_id] ?? rs.tenant_id ?? 'unknown',
        action: 'Generated risk score',
      })
    }

    for (const ca of (recentCamAuditsRes.data ?? [])) {
      activityFeed.push({
        timestamp: ca.audit_date,
        user_email: emailMap[ca.tenant_id] ?? ca.tenant_id ?? 'unknown',
        action: 'Ran CAM audit',
      })
    }

    activityFeed.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    // Retention calculation
    const allProfiles = await admin.from('tenant_profiles').select('id, created_at')
    const allConversations = await admin.from('conversations').select('tenant_id, created_at')

    const userFirstConv: Record<string, string> = {}
    for (const conv of (allConversations.data ?? [])) {
      const existing = userFirstConv[conv.tenant_id]
      if (!existing || conv.created_at < existing) {
        userFirstConv[conv.tenant_id] = conv.created_at
      }
    }

    const totalProfiles = (allProfiles.data ?? []).length
    let day1Retained = 0
    let week1Retained = 0
    let month1Retained = 0

    for (const p of (allProfiles.data ?? [])) {
      const signupDate = new Date(p.created_at)
      // Check if user had any conversation after day 1
      const userConvs = (allConversations.data ?? []).filter(c => c.tenant_id === p.id)
      for (const c of userConvs) {
        const convDate = new Date(c.created_at)
        const diffDays = (convDate.getTime() - signupDate.getTime()) / (1000 * 60 * 60 * 24)
        if (diffDays >= 1) { day1Retained++; break }
      }
      for (const c of userConvs) {
        const convDate = new Date(c.created_at)
        const diffDays = (convDate.getTime() - signupDate.getTime()) / (1000 * 60 * 60 * 24)
        if (diffDays >= 7) { week1Retained++; break }
      }
      for (const c of userConvs) {
        const convDate = new Date(c.created_at)
        const diffDays = (convDate.getTime() - signupDate.getTime()) / (1000 * 60 * 60 * 24)
        if (diffDays >= 30) { month1Retained++; break }
      }
    }

    return NextResponse.json({
      total_users: usersRes.count ?? 0,
      users_this_week: usersThisWeekRes.count ?? 0,
      users_this_month: usersThisMonthRes.count ?? 0,
      users_by_day: usersByDay,

      total_conversations: totalConversationsRes.count ?? 0,
      total_messages: totalMessagesRes.count ?? 0,
      messages_this_week: messagesThisWeekRes.count ?? 0,
      conversations_by_day: conversationsByDay,

      total_documents: totalDocumentsRes.count ?? 0,
      documents_this_week: documentsThisWeekRes.count ?? 0,
      total_chunks: totalChunksRes.count ?? 0,

      total_risk_scores: totalRiskScoresRes.count ?? 0,
      total_cam_audits: totalCamAuditsRes.count ?? 0,
      total_stores: totalStoresRes.count ?? 0,
      total_lease_summaries: totalLeaseSummariesRes.count ?? 0,

      active_users_7d: active7dSet.size,
      active_users_30d: active30dSet.size,

      top_users: topUsers,

      activity_feed: activityFeed.slice(0, 50),

      retention: {
        day1: totalProfiles > 0 ? Math.round((day1Retained / totalProfiles) * 100) : 0,
        week1: totalProfiles > 0 ? Math.round((week1Retained / totalProfiles) * 100) : 0,
        month1: totalProfiles > 0 ? Math.round((month1Retained / totalProfiles) * 100) : 0,
      },
    })
  } catch (err) {
    console.error('[Admin Stats] Error:', err)
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
  }
}

function aggregateByDay(
  timestamps: string[],
  start: Date,
  end: Date,
): Array<{ date: string; count: number }> {
  const counts: Record<string, number> = {}

  // Initialize all days
  const cursor = new Date(start)
  cursor.setUTCHours(0, 0, 0, 0)
  const endDay = new Date(end)
  endDay.setUTCHours(0, 0, 0, 0)

  while (cursor <= endDay) {
    counts[cursor.toISOString().split('T')[0]] = 0
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }

  for (const ts of timestamps) {
    const day = new Date(ts).toISOString().split('T')[0]
    if (counts[day] !== undefined) {
      counts[day]++
    }
  }

  return Object.entries(counts)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }))
}
