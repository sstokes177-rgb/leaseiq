Read the entire src/ directory before making any changes.

## TASK: Build Admin Analytics Dashboard — Business Owner Statistics

This is a PRIVATE dashboard only visible to the app owner (super_admin role). It shows business metrics for investor conversations and tracking how the product is performing.

### ACCESS CONTROL

This page is only accessible if the authenticated user has role = 'super_admin' in tenant_profiles.

Create a check:
```typescript
const { data: profile } = await supabase
  .from('tenant_profiles')
  .select('role')
  .eq('id', user.id)
  .maybeSingle()

if (profile?.role !== 'super_admin') {
  redirect('/dashboard')
}
```

Also hide the nav link unless user is super_admin.

To set yourself as super_admin, the user should run this SQL in Supabase:
```sql
UPDATE tenant_profiles SET role = 'super_admin' WHERE id = 'YOUR_USER_ID';
```

Include this SQL as a comment at the top of the page file for reference.

### CREATE: src/app/admin/page.tsx

### API ROUTE: GET /api/admin/stats/route.ts

This route queries across ALL tenants (using the admin Supabase client, not the user-scoped one). Only accessible to super_admin.

Return:
```typescript
{
  // User metrics
  total_users: number,
  users_this_week: number,
  users_this_month: number,
  users_by_day: Array<{ date: string, count: number }>, // last 30 days

  // Engagement metrics
  total_conversations: number,
  total_messages: number,
  messages_this_week: number,
  conversations_by_day: Array<{ date: string, count: number }>, // last 30 days

  // Document metrics
  total_documents: number,
  documents_this_week: number,
  total_chunks: number,

  // Feature usage
  total_risk_scores: number,
  total_cam_audits: number,
  total_stores: number,
  total_lease_summaries: number,

  // Active users (users who sent a message in last 7 days)
  active_users_7d: number,
  // Retained users (users who came back after first week)
  active_users_30d: number,

  // Top users by message count
  top_users: Array<{ email: string, message_count: number, store_count: number, last_active: string }>
}
```

Query examples:
```typescript
// Users by day (last 30 days)
const { data: usersByDay } = await adminSupabase
  .from('tenant_profiles')
  .select('created_at')
  .gte('created_at', thirtyDaysAgo.toISOString())

// Messages this week
const { count: messagesThisWeek } = await adminSupabase
  .from('messages')
  .select('*', { count: 'exact', head: true })
  .gte('created_at', sevenDaysAgo.toISOString())

// Active users (distinct tenant_ids who sent messages in last 7 days)
const { data: activeUsers } = await adminSupabase
  .from('conversations')
  .select('tenant_id')
  .gte('updated_at', sevenDaysAgo.toISOString())
```

### PAGE LAYOUT

**Header:** "Provelo Admin" — only visible to super_admin

**Stats Row (6 cards):**
- Total Users (number + sparkline trend)
- Active Users (7-day) 
- Total Messages
- Documents Uploaded
- Risk Scores Generated
- CAM Audits Run

Each card: bg-white/[0.03] border border-white/[0.06] rounded-xl p-6. Large number (text-3xl), label below (text-sm text-gray-400), percentage change vs prior period (green up arrow or red down arrow).

**Chart 1: User Signups Over Time (full width)**
- Recharts AreaChart
- X axis: last 30 days
- Y axis: new signups per day
- Emerald area fill
- Hover tooltip: date + count

**Chart 2: Daily Messages (full width)**
- Recharts BarChart
- X axis: last 30 days
- Y axis: messages sent per day
- Emerald bars

**Chart 3: Feature Usage Breakdown (half width)**
- Recharts PieChart or horizontal BarChart
- Segments: Chat Messages, Risk Scores, CAM Audits, Lease Summaries, Lease Comparisons
- Shows which features are most used

**Chart 4: User Retention (half width)**
- Simple metrics display:
  - "Day 1 retention: X%" (users who came back day after signup)
  - "Week 1 retention: X%" (users active in first week)
  - "Month 1 retention: X%" (users active in first month)
- Calculate from conversations.created_at vs tenant_profiles.created_at

**Table: Top Users (full width)**
- Columns: Email, Messages Sent, Locations, Documents, Last Active, Joined
- Sortable by any column
- Top 20 users by activity
- Clean table with hover rows

**Table: Recent Activity Feed (full width)**
- Last 50 actions across the platform
- Each row: timestamp, user email, action (sent message, uploaded document, ran risk score, etc.)
- Query from messages, documents, lease_risk_scores, cam_audits tables
- Ordered by most recent first

### NAVIGATION

- Add "Admin" link at the very bottom of the sidebar, only visible when user role is super_admin
- Style: text-gray-500, small, with a Shield icon
- Active: emerald highlight like other nav items

### STYLING

- Same dark theme as rest of app
- Charts use emerald color palette
- Responsive: charts stack on mobile
- All data refreshes on page load (no caching — admin wants real-time data)

Run npx next build — fix any errors.
Then: git add . && git commit -m "Admin analytics dashboard for business owner" && git push

