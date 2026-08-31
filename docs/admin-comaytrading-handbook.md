# Sổ tay Admin — Cỗ Máy Trading

**Production URL**: https://comaytrading.vercel.app/admin/crm
**Đối tượng**: Admin / Super Admin nội bộ
**Stack**: Next.js 16 + Supabase + React Query + Realtime

---

## 1. Đăng nhập & vai trò

### Phân quyền

| Role | Quyền truy cập |
|---|---|
| **super_admin** | Toàn bộ admin pages + có thể promote user khác lên `admin` |
| **admin** | Toàn bộ admin pages, KHÔNG promote user khác lên admin được |
| **mentor** | Chỉ xem dashboard mentor (mentee của mình) |
| **student** | Trang khách hàng (sau khi approve) |

### Đăng nhập

1. Vào `https://comaytrading.vercel.app/sign-in`
2. Đăng nhập bằng Google account đã được tạo profile + cấp role admin
3. Tự động redirect về `/admin/crm` (Dashboard)

### Trường hợp đặc biệt

- User mới đăng ký luôn ở trạng thái `pending` → admin phải duyệt mới vào được app
- Mỗi 30 phút không hoạt động → session reset (session_start event mới được track)

---

## 2. Sidebar admin (8 mục)

```
1. Dashboard            → /admin/crm
2. Engagement & Habit   → /admin/crm/engagement
3. Retention & Churn    → /admin/crm/retention
4. Segmentation         → /admin/crm/segments
5. Voice of Customer    → /admin/crm/voc
6. Quản lý khách hàng   → /admin/khach-hang
7. Cỗ máy cá nhân       → /client/co-may/tong-quan (admin sidebar persist)
8. Hồ sơ                → /admin/profile
```

**Lưu ý**: Khi admin click "Cỗ máy cá nhân" → URL chuyển sang `/client/*` nhưng sidebar vẫn admin (không context switch).

---

## 3. Tab 1 — Dashboard

**Mục đích**: Nhìn 30s biết tình hình tổng quan.

### Phần A — North Star Habit & Retention (7 KPI)

| KPI | Định nghĩa | Cảnh báo |
|---|---|---|
| **WAU Loggers ⭐** | User log ≥3 trade trong 7 ngày | North star — phải tăng |
| **DAU** | User active hôm nay | Theo dõi vs hôm qua |
| **Stickiness** | DAU / MAU × 100 | Benchmark >20% là tốt |
| **New Signups** | Đăng ký mới 7 ngày qua | So tuần trước |
| **Activation Rate** | % user signup 14-28d trước đạt ≥7 trade trong 14d đầu | >40% là tốt |
| **At-Risk Users** | User im lặng ≥7 ngày | Click → xem chi tiết |
| **Trades Today** | Tổng trade hôm nay | So hôm qua |

### Phần B — 3 Charts

- **WAU Loggers 12 tuần** (line) — flat/lên là good
- **DAU/WAU/MAU 90 ngày** (multi-line) — stickiness pattern
- **New Signups 30 ngày** (bar) — growth trend

### Phần C — Tổng quan business legacy

7 KPI cũ (giữ lại để compare với schema cũ):
- Khách hàng / Mentor / Cỗ máy / Đã rút / Đã nạp / Active 7d / Chờ duyệt
- Chart đăng ký, dòng tiền, phương pháp, top customers

---

## 4. Tab 2 — Engagement & Habit

**Mục đích**: Đo độ "nghiện" của user và phân khúc theo độ active.

### Section 2.1 — Habit Strength

**Habit Score** (0-100): tính cho mỗi user dựa trên 28 ngày qua.

- **Frequency** (40%): số ngày active / 28 × 100
- **Consistency** (30%): user trade càng đều thì điểm càng cao
- **Recency** (30%): exp decay theo số ngày từ lần active cuối

KPI:
- **Avg Habit Score**: TB toàn bộ user
- **Power Users**: số user có score ≥ 70
- **Score Trend 7d**: avg score thay đổi so tuần trước

Bảng **Top 20 user theo Habit Score** — click vào tên → xem chi tiết user. Có nút **Export CSV** để gửi marketing/CS chăm sóc.

### Section 2.2 — Engagement Tier

User được phân vào 6 tier theo số ngày active trong 28 ngày:

| Tier | Điều kiện | Strategy |
|---|---|---|
| **Power** (tím) | ≥20 ngày active | Cảm ơn, ask feedback, mời beta |
| **Core** (xanh dương) | 10-19 ngày | Nurture, không phá vỡ thói quen |
| **Casual** (xanh lá) | 3-9 ngày | Push reminder, gợi ý feature |
| **At-Risk** (vàng) | 1-2 ngày | Re-engage email |
| **Dormant** (cam) | 0d/28d nhưng 28-60d trước có active | Win-back campaign |
| **Churned** (đỏ) | 60+ ngày không active | Survey lý do rời |

- **Pie chart** phân bố hiện tại
- **Stacked bar 12 tuần** xem xu hướng tier
- **Tier movement table** — so sánh tuần này với 4 tuần trước, biết user nào upgrade/downgrade

### Section 2.3 — Logging Behavior

4 KPI median:
- Trades/tuần (4w qua)
- Sessions/ngày (30d qua)
- Khoảng cách giữa 2 lần trade (giờ)
- % user có rút tiền (30d qua)

- **Heatmap 7×24**: thời điểm user vào app theo ngày-trong-tuần × giờ. Dùng để biết peak hour → schedule email/push.
- **Streak distribution**: phân bố streak length hiện tại. Buckets ≥15d highlight gold.

---

## 5. Tab 3 — Retention & Churn

**Mục đích**: Đo PMF qua cohort + tìm user sắp churn để re-engage.

### Section 3.1 — Cohort Retention Heatmap

Triangle table — mỗi row = 1 cohort tuần signup, columns W0-W12.

**Cách đọc**:
- Cell xanh đậm (≥80%): retention rất tốt
- Cell xanh nhạt (40-60%): bình thường
- Cell vàng/đỏ (<40%): cohort đang rời

**Signal PMF**: nếu retention flatten ≥30% sau W4-W8 → app có PMF cho cohort đó.

### Section 3.2 — Churn KPI

| KPI | Định nghĩa |
|---|---|
| **Active Users** | Có trade trong 7 ngày qua |
| **Churned Users** | Im lặng >21 ngày |
| **Re-engaged 30d** | User churn trước đó nhưng quay lại trong 30 ngày |
| **Resurrection Rate** | % user từng churn đã quay lại |

Charts:
- Weekly churn rate 12 tuần (line)
- Active vs Churned stacked area 90 ngày

### Section 3.3 — At-Risk Users (⭐ feature actionable nhất)

Hệ thống tự flag user at-risk nếu match ≥1 reason:
- **frequency_drop**: tuần này ≤40% median 4w trước
- **silent_active_user**: ≥7d không trade nhưng có ≥3 trade lifetime
- **low_activation**: ≥7d và <3 trade lifetime

**Cách dùng**:
1. Filter theo reason (frequency_drop / silent / low_activation)
2. Click tên user → vào trang chi tiết
3. Click **Log re-engagement** → modal chọn loại action (Email / In-app / Manual / Phone) + notes
4. Hệ thống tự đánh dấu thành công nếu user trade lại trong 30 ngày sau action
5. **Export CSV** để gửi list cho team CS chăm sóc

---

## 6. Tab 4 — Segmentation

**Mục đích**: Hiểu user là ai → focus marketing đúng segment.

### 3 chiều phân khúc

**Chiều 1 — Trading Style** (median trade/tuần 4w qua):
- Scalper (≥20/w)
- Day Trader (8-19/w)
- Swing Trader (3-7/w)
- Position Trader (1-2/w)
- Inactive (0/w)

**Chiều 2 — Account Setup**:
- Single (1 máy)
- Multi (2-3 máy)
- Heavy Multi (4+ máy)

**Chiều 3 — Tenure Stage**:
- New (<30d)
- Growing (30-90d)
- Mature (90d+)

### Bảng so sánh

Mỗi chiều có 1 bảng so sánh:
- User count + % tỉ lệ
- Avg Habit Score
- Median trades/tuần
- Retention 28d (% user còn ở Power/Core/Casual tier)

**Highlight rule**:
- Row có Retention cao nhất → background xanh + "⭐ Top retention"
- Row có Retention thấp nhất → background vàng

**Insight to look for**:
- Segment nào retention cao nhất → đó là PMF target
- Multi-account user retention cao hơn Single → encourage user tạo thêm máy
- Mature user habit thấp → cần product intervention

### Top Users Table

Filter dropdown: Style / Account / Tenure / Sort by (Habit Score / Total trades / Last active). Limit 10-200.

Click tên user → trang chi tiết. Có **Export CSV** với filter hiện tại.

---

## 7. Tab 5 — Voice of Customer

**Mục đích**: Feedback loop từ user.

### Section 5.1 — NPS Score

User được hỏi tự động qua popup khi đã: ≥30 ngày signup + ≥30 trade + chưa dismiss/answer trong 30-90 ngày.

**Phân loại điểm 0-10**:
- Promoter (9-10) → user advocate
- Passive (7-8) → neutral
- Detractor (0-6) → có vấn đề

**NPS Score = %Promoter − %Detractor** (từ -100 đến +100)

Benchmark:
- > 0: ổn
- > 30: rất tốt
- > 50: xuất sắc

**Bảng response gần nhất** — row của detractor highlight đỏ. Click tên user → trang chi tiết để follow up.

### Section 5.2 — User Feedback

User submit qua **floating button góc phải-dưới** (icon `MessageSquarePlus`) ở mọi trang client.

**5 loại feedback**: Bug / Feature / General / Complaint / Praise

**Workflow admin**:
1. Vào tab VOC
2. Filter Status = "New" → xem feedback chưa review
3. Click row để expand xem content đầy đủ
4. Đổi Status qua dropdown inline:
   - `new` → `reviewing` (đã đọc)
   - `reviewing` → `planned` (đã vào roadmap)
   - `planned` → `in_progress` (đang code)
   - `in_progress` → `done` (đã ship)
   - hoặc → `wont_fix` (không làm)
5. Hệ thống tự log timestamp updated_at

### Section 5.3 — External tools

Link đến Microsoft Clarity dashboard (session replay miễn phí). Setup riêng — chưa enable.

---

## 8. Quản lý khách hàng (`/admin/khach-hang`)

### Tabs

- **Chờ duyệt**: user mới đăng ký, chưa được duyệt
- **Đã duyệt**: user đang dùng app
- **Đã khoá**: user bị admin lock

### Per-row actions

| Action | Mô tả |
|---|---|
| **Duyệt** | Cấp quyền truy cập (pending → approved) |
| **Khoá** | Tạm thu hồi quyền (approved → locked) |
| **Mở lại** | Khôi phục quyền (locked → approved) |
| **Xoá** (icon thùng rác) | Xoá row apps_access — user phải đăng ký lại |

Mỗi action ghi log vào `admin_audit_log`.

### Trang chi tiết user `/admin/khach-hang/[userId]`

**Header**: avatar + name + 2 badges (loại + trạng thái) + back link.

**5 KPI**: Cỗ máy active/total · Tổng vốn USD · Đã rút lifetime · Đã nạp lifetime · Hoạt động cuối.

**Panel bên trái**:
- Profile info (email, phone, đăng ký, last seen)
- Quyền truy cập Cỗ Máy (approve/lock/remove)
- **Vai trò** — đổi role Khách hàng / Mentor / Admin
  - Chỉ super_admin mới được promote người khác lên admin
  - Confirm dialog trước khi đổi
- Gán Mentor (chỉ hiện nếu role = Khách hàng)

**Panel bên phải**:
- **Cỗ máy của user** — grid 2 cột, mỗi card 1 máy:
  - Header: tên + status + cycle age + phương pháp
  - 4 stats: Vốn / Anchor / PnL / Số dư
  - Withdraw stats: số lần rút, tổng, khoảng cách TB, ngày chưa rút, win rate
  - Lịch sử nâng/hạ neo: max 8 entry với arrow icon
- **Lịch sử hoạt động**: timeline 30 events gần nhất (login, page view, machine action)

---

## 9. Cỗ máy cá nhân (admin xem máy của chính mình)

Admin click "Cỗ máy cá nhân" trong sidebar → vào `/client/co-may/tong-quan` nhưng **sidebar vẫn admin**.

Đầy đủ tính năng như khách hàng:
- Tổng quan phòng điều hành
- Cỗ máy chi tiết (setup, tạo máy, đổi neo, rút tiền, đóng chu kỳ)
- Nhật ký hoạt động
- Hồ sơ

Admin bypass apps_access gate — kể cả chưa có row `apps_access('comay', 'approved')` vẫn vào được.

---

## 10. Cron Daily Aggregate

Vercel Cron chạy lúc **08:00 sáng VN** (01:00 UTC) mỗi ngày:

| Job | Tác dụng |
|---|---|
| `compute_daily_user_metrics(yesterday)` | Aggregate hôm qua vào `daily_user_metrics` |
| `compute_habit_scores()` | Tính lại habit score cho mọi user active 28d |
| `snapshot_user_tiers()` | Snapshot tier hiện tại vào `user_tier_history` |
| `check_re_engagement_success()` | Đánh dấu re-engagement thành công nếu user trade lại |

**Check log**: Vercel Dashboard → Cron Jobs → daily-metrics. Xem `results` JSON để biết job nào fail.

**Manual trigger**: Vercel Cron Jobs → click ⋯ → Trigger Now (dùng để test sau khi add env var).

---

## 11. Realtime updates

Admin pages tự refresh khi có event mới (qua Supabase Realtime):

| Event source | Effect |
|---|---|
| User submit trade/withdraw/login | Dashboard KPI tự update |
| User đăng ký mới | New Signups KPI +1, Pending tab có user mới |
| Admin khác đổi role/quyền | Status badge user tự update |

**Tab inactive** > 30s → realtime auto-detach (tiết kiệm connection slot Supabase).

---

## 12. Audit log

Mọi action admin được ghi vào `admin_audit_log`:
- `approve_comay` / `lock_comay` / `remove_comay_access`
- `change_role` (metadata: `{from, to}`)
- `assign_mentor` / `unassign_mentor` (metadata: `{mentor_id}`)

**Query log trong Supabase SQL editor**:
```sql
SELECT a.created_at, ap.full_name AS admin_name, a.action,
       tp.full_name AS target_name, a.metadata
FROM admin_audit_log a
LEFT JOIN profiles ap ON ap.id = a.admin_id
LEFT JOIN profiles tp ON tp.id = a.target_user_id
ORDER BY a.created_at DESC
LIMIT 50;
```

---

## 13. Troubleshooting

| Vấn đề | Nguyên nhân & Fix |
|---|---|
| **Tab admin rỗng / RPC not found** | SQL migration chưa chạy. Check Supabase SQL editor → Functions có đủ get_wau_loggers, get_dau, etc. không. |
| **Habit Score = 0 cho mọi user** | Chưa có ai có ≥1 event trong 28d, hoặc `compute_habit_scores()` chưa chạy. Manual trigger cron hoặc chạy `SELECT public.compute_habit_scores();` |
| **Cohort heatmap rỗng** | Chưa có user signup trong 12 tuần qua, hoặc backfill events chưa tốt. Re-run `supabase-admin-dashboard.sql` (idempotent). |
| **At-Risk Users rỗng** | Hệ thống chỉ có user mới (≥7d signup mới được tính). |
| **NPS popup không xuất hiện cho user test** | User cần ≥30d signup + ≥30 trade. Hoặc đã dismiss/answer. Clear localStorage `rova_nps_dismissed_until` để test lại. |
| **Feedback widget không hiện** | Chỉ hiện trong `/client/co-may/*`. Admin context không có (vì admin không gửi feedback cho chính mình). |
| **Realtime không update** | Check Supabase Dashboard → Database → Replication: `events` + `apps_access` đã enable chưa. |
| **Cron không chạy** | Check Vercel → Settings → ENV vars: `CRON_SECRET` + `SUPABASE_SERVICE_ROLE_KEY` đã set chưa. Manual trigger ở Cron Jobs. |
| **Admin tự lock-out sau khi tighten RLS** | Forgot `UPDATE profiles SET role = 'super_admin'` cho chính mình trước khi chạy `supabase-rls-prod.sql`. Vào Supabase SQL editor (bypass RLS) UPDATE lại. |

---

## 14. Quick reference SQL

### Backfill metrics cho 90 ngày qua

```sql
SELECT public.backfill_daily_metrics(90);
SELECT public.compute_habit_scores();
SELECT public.snapshot_user_tiers();
```

### Stats nhanh

```sql
-- Số user theo status
SELECT app, status, COUNT(*) FROM apps_access GROUP BY app, status;

-- Top 10 user trade nhiều nhất 7 ngày
SELECT p.full_name, p.email, COUNT(*) AS trades
FROM events e JOIN profiles p ON p.id = e.user_id
WHERE e.event_name = 'trade_logged'
  AND e.created_at >= NOW() - INTERVAL '7 days'
GROUP BY p.id ORDER BY trades DESC LIMIT 10;

-- NPS detractors gần nhất
SELECT p.full_name, p.email, n.score, n.reason, n.created_at
FROM nps_responses n JOIN profiles p ON p.id = n.user_id
WHERE n.score <= 6 ORDER BY n.created_at DESC LIMIT 20;
```

### Reset (DEV ONLY — không chạy trên prod)

```sql
TRUNCATE TABLE events RESTART IDENTITY CASCADE;
TRUNCATE TABLE daily_user_metrics;
TRUNCATE TABLE user_habit_scores;
TRUNCATE TABLE user_tier_history;
```

---

## 15. Liên hệ kỹ thuật

- Repo: `https://github.com/Sydneynguyen112/comayintien`
- Supabase project: `uxmrvrwaotmctthjiotw`
- Vercel project: `comayintien`
- Cron schedule: `0 1 * * *` (08:00 sáng VN daily)

Khi có lỗi production:
1. Check Vercel Logs (Functions tab)
2. Check Supabase Logs (Database → Logs)
3. Check Cron last run (Vercel → Cron Jobs)
