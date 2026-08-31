# Codebase Reference — Admin Comayintien

**Repo**: `Sydneynguyen112/comayintien` · **Local**: `c:\Users\Administrator\comayintien-temp`
**Stack**: Next.js 16 + React 19 + TypeScript + Supabase + TanStack Query + Recharts + Tailwind v4
**Routes prefix**: `/admin/*`

---

## 1. Sơ đồ thư mục admin

```
app/
├── (dashboard)/
│   └── admin/
│       ├── layout.tsx                       ← outer shell + role gate
│       ├── crm/
│       │   ├── layout.tsx                   ← mount CrmTabs sub-nav
│       │   ├── page.tsx                     ← unified Dashboard (412 dòng)
│       │   ├── engagement/page.tsx          ← Tab 2 wrapper
│       │   ├── retention/page.tsx           ← Tab 3 full detail
│       │   ├── segments/page.tsx            ← Tab 4
│       │   └── voc/page.tsx                 ← Tab 5
│       ├── khach-hang/
│       │   ├── page.tsx                     ← User mgmt list (tabs)
│       │   └── [userId]/page.tsx            ← Detail per user
│       └── profile/page.tsx
└── api/
    └── cron/
        └── daily-metrics/route.ts           ← Vercel cron edge endpoint

components/
├── admin/                                   ← 18 components admin-specific
│   ├── action-required-strip.tsx            ← 4 cards action-needed-today
│   ├── activity-timeline.tsx                ← Timeline 30 events / user
│   ├── at-risk-table.tsx                    ← Tab 3 main table + filter + CSV
│   ├── cohort-heatmap.tsx                   ← Triangle retention heatmap
│   ├── crm-bar-chart.tsx                    ← SVG bar chart (legacy Phase 4)
│   ├── crm-method-breakdown.tsx             ← Bar list method % (legacy)
│   ├── crm-tabs.tsx                         ← 5-tab horizontal sub-nav
│   ├── customer-machine-card.tsx            ← Card per cỗ máy in user detail
│   ├── habit-strength-section.tsx           ← Tab 2 section 2.1
│   ├── kpi-card.tsx                         ← Reusable KPI with sparkline
│   ├── log-reengagement-dialog.tsx          ← Modal 4 action types
│   ├── logging-behavior-section.tsx         ← Tab 2 section 2.3
│   ├── mentor-assign-select.tsx             ← Assign mentor in user detail
│   ├── north-star-section.tsx               ← Habit & retention section
│   ├── priority-customer-lists.tsx          ← 3-col at-risk/top/detractor
│   ├── role-change-select.tsx               ← Change role student/mentor/admin
│   ├── segment-overview-table.tsx           ← 3-bảng so sánh segment
│   ├── tier-distribution-section.tsx        ← Tab 2 section 2.2
│   ├── top-users-segment-table.tsx          ← Tab 4 filterable list
│   └── user-row-actions.tsx                 ← Approve/Lock/Remove buttons
└── providers/
    ├── query-provider.tsx                   ← TanStack Query root
    └── realtime-admin-provider.tsx          ← Supabase Realtime subscribe

lib/
└── admin/                                   ← Data fetch / types layer
    ├── types.ts                             ← KPI types + format helpers
    ├── overview-api.ts                      ← Tab 1 (12 parallel RPC)
    ├── retention-api.ts                     ← Tab 3
    ├── engagement-api.ts                    ← Tab 2 + TIER_META
    ├── segments-api.ts                      ← Tab 4 + STYLE/ACCOUNT/TENURE_META
    └── voc-api.ts                           ← Tab 5 + FEEDBACK_*_META

supabase-admin-dashboard.sql       ← Tab 1: events, daily_user_metrics + 10 RPC
supabase-admin-engagement.sql      ← Tab 2: habit_scores, tier_history + 10 RPC
supabase-admin-retention.sql       ← Tab 3: re_engagement_log + cohort/churn RPC
supabase-admin-segmentation.sql    ← Tab 4: user_segments view + 2 RPC
supabase-admin-voc.sql             ← Tab 5: nps_responses, user_feedback + RPC
supabase-rls-prod.sql              ← Tighten RLS pre-launch (is_admin helper)

vercel.json                        ← Cron schedule "0 1 * * *"
```

---

## 2. Routes & ownership

| Route | File | Purpose |
|---|---|---|
| `/admin` (root) | covered by admin layout | redirect to /admin/crm |
| `/admin/crm` | `crm/page.tsx` | **Unified dashboard** — actions + priority customers + 7 KPI + cohort + segments |
| `/admin/crm/engagement` | `crm/engagement/page.tsx` | 3 sections drill-down |
| `/admin/crm/retention` | `crm/retention/page.tsx` | Cohort full + churn + at-risk table |
| `/admin/crm/segments` | `crm/segments/page.tsx` | 3 bảng so sánh + top users |
| `/admin/crm/voc` | `crm/voc/page.tsx` | NPS + feedback workflow |
| `/admin/khach-hang` | `khach-hang/page.tsx` | List user 3 tabs (pending/approved/locked) |
| `/admin/khach-hang/[userId]` | `khach-hang/[userId]/page.tsx` | Detail user — profile + KPI + machines + activity |
| `/admin/profile` | `profile/page.tsx` | Admin self profile (reuses ProfileEditor) |
| `/api/cron/daily-metrics` | `api/cron/daily-metrics/route.ts` | Vercel cron — 4 RPC nightly |

---

## 3. Layout composition

```
RootLayout (app/layout.tsx)
└── QueryProvider                   ← TanStack Query
    └── ThemeProvider                ← next-themes
        └── DashboardLayout (group)
            ├── AuthGuard            ← redirect /sign-in if no session
            ├── Sidebar              ← getNavConfig(pathname) + isAdmin override
            ├── ActivityTracker      ← page_view + session_start events
            └── AdminLayout
                ├── role gate (admin / super_admin only)
                ├── touchLastSeen('comay')
                ├── RealtimeAdminProvider     ← subscribe events/apps_access
                └── CoMayShell role="admin"
                    └── (CRM layout only)
                        ├── CrmTabs           ← 5 sub-tabs
                        └── page content
```

**Sidebar admin (4 mục)**: Dashboard, Quản lý khách hàng, Cỗ máy cá nhân, Hồ sơ.
**CrmTabs (5 sub-tabs)**: Dashboard, Engagement, Retention, Segments, VOC.

---

## 4. Components — purpose + key exports

### Page-level sections (composable)

| File | Lines | Exports | Purpose |
|---|---|---|---|
| `north-star-section.tsx` | 174 | `NorthStarSection` | 7 KPI + 3 charts (WAU 12w / DAU-MAU 90d / signups 30d) |
| `habit-strength-section.tsx` | 161 | `HabitStrengthSection` | 3 KPI + histogram + top 20 table CSV export |
| `tier-distribution-section.tsx` | 167 | `TierDistributionSection` | Pie + movement list + stacked bar 12 tuần |
| `logging-behavior-section.tsx` | 174 | `LoggingBehaviorSection` | 4 median KPI + heatmap 7×24 + streak bars |
| `action-required-strip.tsx` | 137 | `ActionRequiredStrip` | 4 action cards (Pending/AtRisk/Detractor/Trades) |
| `priority-customer-lists.tsx` | 199 | `PriorityCustomerLists` | 3 cột at-risk/top user/detractor |

### Reusable building blocks

| File | Lines | Exports | Purpose |
|---|---|---|---|
| `kpi-card.tsx` | 100 | `KPICard` | Card with value + change % + sparkline (Recharts) |
| `cohort-heatmap.tsx` | 74 | `CohortHeatmap` | Triangle table, HSL color theo retention % |
| `crm-tabs.tsx` | 53 | `CrmTabs` | Horizontal sub-nav 5 tabs |
| `crm-bar-chart.tsx` | 100 | `CrmBarChart`, `BarSeries` | Pure SVG bar chart multi-series (legacy) |
| `crm-method-breakdown.tsx` | 62 | `CrmMethodBreakdown` | Horizontal bar list theo % (legacy) |

### User management

| File | Lines | Exports | Purpose |
|---|---|---|---|
| `user-row-actions.tsx` | 106 | `UserRowActions`, `UserStatus` | Approve/Lock/Re-approve/Remove buttons + audit log |
| `role-change-select.tsx` | 96 | `RoleChangeSelect` | 3-button role group (student/mentor/admin) — super_admin gate |
| `mentor-assign-select.tsx` | 95 | `MentorAssignSelect` | Click 1 mentor để assign cho student |
| `customer-machine-card.tsx` | 209 | `CustomerMachineCard`, `MachineLite`, `MachineTx` | Per-machine detail: stats + anchor history |
| `activity-timeline.tsx` | 86 | `ActivityTimeline` | 30 events gần nhất với icon theo type |

### Tab 3 specific

| File | Lines | Exports | Purpose |
|---|---|---|---|
| `at-risk-table.tsx` | 236 | `AtRiskTable` | Search + filter reason + CSV + log action button |
| `log-reengagement-dialog.tsx` | 110 | `LogReengagementDialog` | Modal 4 action types + notes + audit |

### Tab 4 specific

| File | Lines | Exports | Purpose |
|---|---|---|---|
| `segment-overview-table.tsx` | 103 | `SegmentOverviewTable` | Bảng so sánh segment với highlight top/bottom retention |
| `top-users-segment-table.tsx` | 203 | `TopUsersSegmentTable` | List + 4 dropdown filter + CSV export |

---

## 5. Data API layer (lib/admin/)

### `types.ts` (49 lines)
- `KPIMetric`, `TimeSeriesPoint`, `DateRange`
- `pctChange(current, previous): {pct, dir}` — period delta helper
- `formatValue(v, fmt)` — number/percent/currency formatter

### `overview-api.ts` (100 lines)
- `OverviewKpis`, `OverviewSeries`
- `fetchOverviewKpis()` — **12 RPC parallel** via Promise.all → 200-400ms
- `fetchOverviewSeries()` — 3 RPC parallel (12w, 90d, 30d)

### `retention-api.ts` (113 lines)
- Types: `CohortRow`, `CohortGrid`, `ChurnSnapshot`, `ChurnRow`, `ActiveChurnedPoint`, `AtRiskUser`
- `fetchCohortRetention(weeks)` — group raw rows thành grid
- `fetchChurnSnapshot()`, `fetchWeeklyChurnRate()`, `fetchActiveChurnedSeries()`, `fetchResurrectionRate()`
- `fetchAtRiskUsers()` — RPC `get_at_risk_users`
- `logReEngagement(userId, type, notes, adminId)` — insert + audit

### `engagement-api.ts` (118 lines)
- Types + `TIER_META` (6 tier colors)
- `fetchHabitSummary`, `fetchHabitDistribution`, `fetchTopHabitUsers(limit)`
- `fetchTierDistribution`, `fetchTierHistorySeries(weeks)`, `fetchTierMovements(weeksBack)`
- `fetchLoggingBehavior`, `fetchActivityHeatmap`, `fetchStreakDistribution`

### `segments-api.ts` (73 lines)
- Types + `STYLE_META`, `ACCOUNT_META`, `TENURE_META` (label + color)
- `fetchSegmentMetrics(dimension)` — switch dimension trong 1 RPC
- `fetchTopUsers({trading_style, account_type, tenure_stage, sort_by, limit})`

### `voc-api.ts` (140 lines)
- Types + `FEEDBACK_TYPE_META`, `FEEDBACK_STATUS_META`
- NPS: `fetchNpsSummary(period)`, `fetchNpsTrend(months)`, `fetchNpsResponses(limit)`
- Feedback: `fetchFeedbackStats`, `fetchFeedbackByType`, `fetchFeedbackList({status, type, sort_by, limit})`
- Mutations: `updateFeedback(id, patch)`, `submitNpsResponse(...)`, `submitFeedback(...)`

---

## 6. SQL migrations (Supabase)

| File | Tables / Functions | Lines |
|---|---|---|
| `supabase-admin-dashboard.sql` | `events`, `daily_user_metrics` + `compute_daily_user_metrics`, `backfill_daily_metrics`, 7 KPI RPC + 3 series RPC + 5 backfill INSERT từ comay_transactions/machines/profiles/activity_events | ~340 |
| `supabase-admin-retention.sql` | `re_engagement_log` + `get_cohort_retention`, `get_weekly_churn_rate`, `get_churn_snapshot`, `get_active_churned_series`, `get_resurrection_rate`, `get_at_risk_users`, `check_re_engagement_success` | ~250 |
| `supabase-admin-engagement.sql` | `user_habit_scores`, `user_tier_history` + view `user_tiers` + `compute_habit_scores`, `snapshot_user_tiers`, 10 RPC habit/tier/behavior + auto-run | ~330 |
| `supabase-admin-segmentation.sql` | View `user_segments` (3 chiều) + `get_segment_metrics(dimension)`, `get_top_users(filters)` | ~170 |
| `supabase-admin-voc.sql` | `nps_responses`, `user_feedback`, `feedback_votes` + 7 RPC NPS/feedback | ~190 |
| `supabase-rls-prod.sql` | `is_admin()` SQL helper + tighten 10 policies (DROP allow_all → admin/owner check) | ~150 |

**Thứ tự chạy**: dashboard → retention → engagement → segmentation → voc → **rls-prod** (cuối).

---

## 7. Core logic patterns

### React Query convention

```typescript
useQuery({
  queryKey: ["admin", "overview", "kpis"],   // hierarchical key
  queryFn: fetchOverviewKpis,
  // staleTime 30s + refetchOnWindowFocus inherit từ QueryProvider
})
```

**Invalidate**: bằng prefix
```typescript
queryClient.invalidateQueries({ queryKey: ["admin", "overview"] })  // tất cả overview queries
queryClient.invalidateQueries({ queryKey: ["admin"] })              // tất cả admin queries
```

### Realtime → invalidate

`RealtimeAdminProvider` subscribe `events` INSERT + `apps_access` * → invalidate query keys tương ứng. Single channel global (không subscribe per-component).

### CSV export pattern

Trong components có nút Export CSV (`at-risk-table.tsx`, `habit-strength-section.tsx`, `top-users-segment-table.tsx`):

```typescript
function exportCsv() {
  const header = [...];
  const rows = data.map((u) => [...]);
  const csv = [header, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  // ... a.click() pattern
}
```

`﻿` BOM để Excel mở UTF-8 đúng (tiếng Việt).

### Audit log convention

Mỗi action admin write 1 row vào `admin_audit_log`:
```sql
INSERT INTO admin_audit_log (admin_id, action, target_user_id, metadata)
VALUES (admin.id, 'approve_comay', user.id, NULL)
```

Action types hiện dùng:
- `approve_comay` / `lock_comay` / `remove_comay_access` (user-row-actions)
- `change_role` (role-change-select, metadata: `{from, to}`)
- `assign_mentor` / `unassign_mentor` (mentor-assign-select)
- `log_re_engagement` (insert via `re_engagement_log` table riêng)

### Cron job flow

```
Vercel Cron (0 1 * * * UTC = 8am VN)
  → GET /api/cron/daily-metrics (with Bearer CRON_SECRET)
  → Edge function (createClient với SERVICE_ROLE_KEY hoặc anon)
  → 4 RPC nối tiếp:
      1. compute_daily_user_metrics(yesterday)
      2. compute_habit_scores()
      3. snapshot_user_tiers()
      4. check_re_engagement_success()
  → Return JSON {ok, date, results}
```

---

## 8. Environment variables required

| Var | Where | Mục đích |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Public | Supabase project endpoint |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public | Anon key cho client queries |
| `CRON_SECRET` | Server-only | Bearer token bảo vệ /api/cron/* endpoint |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only, Sensitive | Bypass RLS cho cron RPC calls |

Vercel Settings → Environment Variables → add cho Production.

---

## 9. Workflow điển hình

### Admin daily check (5 phút)
1. Mở `/admin/crm` (Dashboard)
2. **Action strip**: pending > 0? → click vào Quản lý khách hàng duyệt
3. **Priority lists**: at-risk top 5 → click → log re-engagement
4. **KPI row**: WAU Loggers, NPS có drop bất thường không
5. Drill-down qua **Cohort heatmap** nếu thấy retention giảm

### Add 1 admin mới
1. SQL trên Supabase:
   ```sql
   UPDATE profiles SET role = 'admin'
   WHERE email = 'new-admin@company.com';
   ```
2. User đó login → tự thấy admin sidebar (sidebar.tsx detect `currentUser.role === 'admin'`)

### Promote 1 admin lên super_admin
- Chỉ làm qua SQL editor (chưa expose UI). Quyền super_admin chỉ dùng để promote người khác lên admin qua role-change-select.

### Re-run habit scores manually
```sql
SELECT public.compute_habit_scores();
SELECT public.snapshot_user_tiers();
```

---

## 10. Performance notes

- **React Query staleTime 30s** → tab switch instant (cached), refetch nền sau
- **Pre-aggregated tables**: `daily_user_metrics`, `user_habit_scores`, `user_tier_history` → chart 90d <50ms thay vì compute từ events thô (~500ms)
- **Realtime subscription single channel global** → tiết kiệm slot Supabase Free (200 concurrent limit)
- **Tab inactive >30s** → auto-detach realtime (`visibilitychange` listener)
- **Recharts chỉ load trong admin routes** → bundle main site không bị penalty
- **CSV export** = client-side blob (không phải server route) → zero infra cost

---

## 11. Tham khảo chéo

- **User-facing docs**: `docs/co-may-user-guide.md`
- **Admin handbook (use guide)**: `docs/admin-comayintien-handbook.md`
- **Client-side codebase reference**: `docs/codebase-client-comayintien.md`
