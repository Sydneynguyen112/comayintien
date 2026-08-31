# Codebase Reference — Client (Khách hàng) Comayintien

**Repo**: `Sydneynguyen112/comayintien` · **Local**: `c:\Users\Administrator\comayintien-temp`
**Stack**: Next.js 16 + React 19 + TypeScript + Supabase + Recharts + Tailwind v4
**Routes prefix**: `/client/*` (URL slug đổi từ `/student/*` ở migration trước)

---

## 1. Sơ đồ thư mục client

```
app/
└── (dashboard)/
    └── client/
        ├── co-may/
        │   ├── layout.tsx                          ← Gate + hydrate + mount FeedbackButton + NpsSurvey
        │   ├── page.tsx                            ← redirect /client/co-may/tong-quan
        │   ├── setup/page.tsx                      ← Wizard initial / allocate
        │   ├── tong-quan/page.tsx                  ← Phòng điều hành KPI
        │   ├── quan-ly/
        │   │   ├── page.tsx                        ← List máy active + closed
        │   │   └── [id]/
        │   │       ├── page.tsx                    ← Detail 1 máy
        │   │       └── dong-chu-ky/page.tsx        ← Close cycle wizard
        │   ├── bao-cao/[reportId]/page.tsx         ← Cycle report read-only
        │   ├── hieu-suat/page.tsx                  ← Performance view (placeholder)
        │   └── lich-su/page.tsx                    ← Activity log
        └── profile/page.tsx

components/
├── co-may/                                         ← 30+ feature components
│   ├── co-may-shell.tsx                            ← Header + role badge wrapper
│   ├── sub-nav.tsx                                 ← 3-tab horizontal (Tổng quan/Chi tiết/Nhật ký)
│   ├── coming-soon-stub.tsx                        ← Placeholder cho hieu-suat
│   ├── setup/
│   │   └── setup-wizard.tsx                        ← 776 dòng — 3-step wizard
│   ├── tong-quan/
│   │   ├── tong-quan-view.tsx                      ← Orchestrator
│   │   ├── phong-dieu-hanh.tsx                     ← 750 dòng — KPI + charts chính
│   │   ├── kpi-grid.tsx                            ← KPI tile grid
│   │   ├── hieu-suat-section.tsx                   ← 448 dòng — performance chart section
│   │   ├── performance-matrix.tsx                  ← Top máy ranking
│   │   └── equity-sparkline.tsx                    ← Inline mini chart
│   ├── quan-ly/
│   │   ├── quan-ly-list-view.tsx                   ← Grid card máy + create button
│   │   ├── machine-card.tsx                        ← Card per máy active
│   │   ├── closed-machine-card.tsx                 ← Card per máy closed (report link)
│   │   ├── create-machine-dialog.tsx               ← 430 dòng — form tạo máy
│   │   ├── machine-detail-view.tsx                 ← 454 dòng — detail page wrapper
│   │   ├── machine-anchor-strip.tsx                ← 382 dòng — M1-M5 ladder + actions
│   │   ├── anchor-card.tsx                         ← 5 ô mốc neo editable
│   │   ├── machine-equity-curve.tsx                ← Equity line chart with withdraw markers
│   │   ├── machine-balance-breakdown.tsx           ← Vốn + PnL − Đã rút = Số dư
│   │   ├── trade-input.tsx                         ← Inline form ghi lệnh
│   │   ├── trade-journal.tsx                       ← 364 dòng — bảng lịch sử lệnh
│   │   ├── transaction-list.tsx                    ← Generic tx list
│   │   ├── withdraw-dialog.tsx                     ← Modal nhập số tiền rút
│   │   ├── withdraw-modal.tsx                      ← Alt modal celebrate
│   │   ├── withdraw-journal.tsx                    ← Bảng lịch sử rút
│   │   ├── symbol-combobox.tsx                     ← Autocomplete trading pair
│   │   ├── close-cycle-dialog.tsx                  ← Confirm dialog
│   │   ├── close-cycle-wizard.tsx                  ← 789 dòng — 4-step close wizard
│   │   └── cycle-report-view.tsx                   ← 322 dòng — read-only report
│   └── lich-su/
│       ├── lich-su-view.tsx                        ← Orchestrator 2 tabs
│       ├── nhat-ky-tab.tsx                         ← Tab "Nhật ký giao dịch"
│       ├── bao-cao-tab.tsx                         ← Tab "Báo cáo chu kỳ"
│       ├── action-log-view.tsx                     ← 367 dòng — bảng all events
│       ├── tx-table.tsx                            ← Tx list rendering
│       ├── tx-filters.tsx                          ← Filter machine/date/type
│       ├── report-table.tsx                        ← Closed reports list
│       └── csv-export.ts                           ← Helper download CSV
└── voc/                                            ← User-side VOC widgets
    ├── feedback-button.tsx                         ← Floating gold button + modal
    └── nps-survey.tsx                              ← Auto-popup eligibility check

lib/
├── co-may/
│   ├── types.ts                                    ← Machine, MachineTransaction, CycleReport
│   ├── mock-data.ts                                ← 734 dòng — localStorage CRUD + sync
│   ├── cloud-sync.ts                               ← 367 dòng — dual-write Supabase
│   ├── setup-store.ts                              ← SetupConfig CRUD
│   ├── senior-ui.ts                                ← isSeniorMode + seniorCx classes
│   ├── celebrate.ts                                ← Canvas confetti withdraw celebrate
│   └── trading-symbols.ts                          ← Symbol list autocomplete
├── analytics.ts                                    ← trackEvent (events table)
├── activity-tracker.ts                             ← trackEvent (activity_events table)
└── access-status.ts                                ← getAccessStatus + touchLastSeen
```

---

## 2. Routes & purpose

| Route | File | Purpose |
|---|---|---|
| `/client/co-may` | `co-may/page.tsx` | redirect /client/co-may/tong-quan |
| `/client/co-may/setup` | `co-may/setup/page.tsx` | Wizard (initial / allocate) — gate trước khi vào tổng quan |
| `/client/co-may/tong-quan` | `co-may/tong-quan/page.tsx` | Phòng điều hành — auto redirect /setup nếu chưa setup |
| `/client/co-may/quan-ly` | `co-may/quan-ly/page.tsx` | List máy active + closed grid |
| `/client/co-may/quan-ly/[id]` | `co-may/quan-ly/[id]/page.tsx` | Detail 1 máy với anchor strip + actions |
| `/client/co-may/quan-ly/[id]/dong-chu-ky` | `co-may/quan-ly/[id]/dong-chu-ky/page.tsx` | Close cycle wizard 4 bước |
| `/client/co-may/bao-cao/[reportId]` | `co-may/bao-cao/[reportId]/page.tsx` | Cycle report (read-only, link sang next machine nếu reset/scale) |
| `/client/co-may/lich-su` | `co-may/lich-su/page.tsx` | Activity log với filter + CSV |
| `/client/co-may/hieu-suat` | `co-may/hieu-suat/page.tsx` | Placeholder hiện stub |
| `/client/profile` | `client/profile/page.tsx` | Profile editor (shared component) |

Mỗi page support `?owner=<userId>` query param để admin/mentor view máy của user khác (read-only).

---

## 3. Layout composition

```
RootLayout (app/layout.tsx)
└── QueryProvider
    └── ThemeProvider
        └── DashboardLayout (group)
            ├── AuthGuard
            ├── Sidebar (role-aware nav)
            └── ActivityTracker
                └── ClientCoMayLayout
                    ├── useCurrentUser('student')
                    ├── if !admin && status !== 'approved' → /pending
                    ├── hydrateFromCloud(user.id)         ← Supabase → localStorage
                    ├── invalidateLocalCache
                    ├── touchLastSeen('comay')
                    ├── CoMayShell role='client'
                    │   ├── Header (Cỗ Máy Trading + role badge)
                    │   ├── SubNav role='client'           ← 3 tabs: Tổng quan / Chi tiết / Nhật ký
                    │   └── {children}
                    ├── FeedbackButton                     ← floating bottom-right
                    └── NpsSurvey                          ← eligibility-gated popup
```

---

## 4. Setup wizard (`components/co-may/setup/setup-wizard.tsx`)

**776 dòng — file lớn nhất**. 3-step flow:

| Step | Mục đích | Output |
|---|---|---|
| 1 | Tổng vốn doanh chủ | `setup.total_capital` |
| 2 | Chiến lược | `setup.strategy: 'concentrated' \| 'diversified'` |
| 3 | Tạo cỗ máy đầu | Insert vào `comay_machines` |

**Modes**:
- `initial`: lần đầu — bắt buộc 3 bước
- `allocate`: thêm máy từ reserve pool — skip step 1/2

Wizard có:
- Validation real-time (vốn ≤ reserve pool)
- Anchor milestones M1-M5 tự gợi ý theo vốn (smart defaults)
- Persistence: write `comay_setup` + `comay_machines` qua `cloud-sync.cloudPush.*`

---

## 5. Tổng quan (`phong-dieu-hanh.tsx`)

**750 dòng — file Tổng quan chính**. Bao gồm:

### 8 KPI (2 hàng × 4 cards)
**Row 1 (lifetime)**:
- Tổng dòng tiền đã rút
- Vốn đang vận hành
- PnL hiện tại
- Cỗ máy đang hoạt động

**Row 2 (theo tháng)**:
- Dòng tiền rút tháng này
- ROI tháng này
- Tăng trưởng vs cùng kỳ
- Ngày có rút / Tổng ngày

### Phân bổ vốn
3 ô dashed-border: Tổng doanh chủ / Phân bổ / Dự trữ + nút "Hoạch định lại" (mở SetupWizard mode allocate).

### Sections con
- **Hiệu suất** — `hieu-suat-section.tsx` 448 dòng:
  - Chart dòng tiền 6 tháng
  - Ranking máy theo PnL
  - Performance matrix
- **Heatmap dòng tiền** — render lưới ngày × tháng

Sub-components: `kpi-grid.tsx`, `equity-sparkline.tsx`, `performance-matrix.tsx`.

---

## 6. Quản lý máy chi tiết — file lớn

### `machine-detail-view.tsx` (454 dòng) — orchestrator

Composed:
- Header với tên máy + status badge + growth tag
- `machine-anchor-strip.tsx` — 5 mốc ladder + alert banners
- 4 KPI tile (Đã rút / Số dư / Vốn gốc / PnL)
- `anchor-card.tsx` — 5 ô anchor editable
- `machine-equity-curve.tsx` — line chart equity
- `machine-balance-breakdown.tsx` — breakdown card
- 3 nút action: Ghi lệnh / Rút tiền / Đóng chu kỳ
- Tabs bottom: `trade-journal.tsx` + `withdraw-journal.tsx`

### `machine-anchor-strip.tsx` (382 dòng) — anchor logic core

**Cases UI render**:
- **A1** (số dư > anchor): hiện nút "Nâng neo" → chuyển M cao hơn
- **A2** (số dư > anchor, đạt M5): nút "Rút phần dư"
- **B** (số dư ≈ anchor): normal
- **C** (số dư < anchor, dismissed): collapsed
- **D** (số dư < anchor, banner active): nút "Hạ neo"

Dismiss state lưu localStorage per machine (key `dismiss-anchor-{machineId}-{tradeCount}`) — reset khi có trade mới.

### `close-cycle-wizard.tsx` (789 dòng) — file lớn thứ 2

4 bước:
1. **Tổng kết**: auto-compute từ `getTxByMachine`
2. **Scorecard**: 5 tiêu chí × thang 1-5
3. **Phản tư**: 3 câu hỏi text input
4. **Quyết định**: reset / scale / close

Side effects khi confirm:
- `closeMachine(machineId)` — set status=closed
- Insert `comay_reports` row với scorecard + reflection
- Nếu reset/scale: tạo new machine, link `next_machine_id`
- Trigger confetti celebrate (`celebrate.ts`)

### `create-machine-dialog.tsx` (430 dòng)

Form fields:
- Tên, vốn (validated ≤ reserve), phương pháp (text), signal source
- Risk per trade %, max drawdown %, target withdraw count, target profit
- 5 anchor milestones (auto-suggest theo vốn, user có thể override)

---

## 7. State management pattern — localStorage + Supabase dual-write

### `lib/co-may/mock-data.ts` (734 dòng)

**Pattern**: localStorage là source of truth, Supabase là backup. Đọc nhanh, write fire-and-forget.

```typescript
// Read:
getMachinesByUser(userId): Machine[]              // sync, từ localStorage
getTxByUser(userId): MachineTransaction[]
getReportsByUser(userId): CycleReport[]
getUserScope(role, userId): string[]              // student=[self], mentor=mentees, admin=all

// Write (mỗi mutation gọi cloudPush.*):
addMachine(userId, input) → insert local + cloudPush.machine()
addTx(userId, machineId, input) → insert local + cloudPush.tx() + trackEvent
updateMachine(userId, machineId, patch)
closeMachine(userId, machineId)
deleteMachine(userId, machineId)
```

`assertOwnership(userId, machineId)` throws `OwnershipError` (parallel với Supabase RLS denial) — caller handle uniformly.

### `lib/co-may/cloud-sync.ts` (367 dòng)

```typescript
hydrateFromCloud(userId): Promise<void>           // Supabase → localStorage
  → fetch comay_machines, comay_transactions, comay_reports, comay_setup, comay_dismiss_state
  → merge vào localStorage cache

cloudPush.machine(userId, m) → fire upsert comay_machines
cloudPush.tx(userId, t)     → fire upsert comay_transactions
cloudPush.report(userId, r) → fire upsert comay_reports
cloudPush.setup(userId, s)  → fire upsert comay_setup
cloudPush.deleteMachine(userId, machineId)
cloudPush.dismissState(userId, machineId, tradeCount)
```

Mỗi function `fire(promise)` swallow errors — không block UI.

### `lib/co-may/setup-store.ts`

```typescript
SetupConfig = { totalCapital, strategy, injectedFromWithdrawn, completedAt }
getSetup(userId): SetupConfig | null
saveSetup(userId, config)
hasCompletedSetup(userId, role): boolean
adjustTotalCapital(userId, delta)                 // khi đóng máy hoàn toàn
recordInjectionFromWithdrawn(userId, amount)      // khi rút quay vốn dự trữ
```

---

## 8. Types (`lib/co-may/types.ts`)

```typescript
type MachineStatus = 'active' | 'paused' | 'closed';

interface Machine {
  id: string;                    // local format "mach-new-{timestamp}-{seq}"
  user_id: string;
  name: string;
  capital: number;
  current_anchor: number;
  cycle_started_at: string | null;
  status: MachineStatus;
  method?: string;
  signal_source?: 'self' | 'mentor' | 'paid' | 'free';
  risk_per_trade_pct?: number;
  max_drawdown_pct?: number;
  target_withdraw_count?: number;
  target_profit?: number;
  anchor_milestones?: number[];          // [M1, M2, M3, M4, M5]
  created_at: string;
  updated_at: string;
}

type TxType = 'trade_win' | 'trade_loss' | 'withdraw' | 'anchor_change';

interface MachineTransaction {
  id: string;
  machine_id: string;
  user_id: string;
  type: TxType;
  amount: number;
  note?: string | null;
  direction?: 'long' | 'short';
  symbol?: string;
  volume?: number;
  entry_reason?: string;
  exit_reason?: string;
  emotion?: string;
  created_at: string;
}

interface CycleReport {
  id: string;
  machine_id: string;
  user_id: string;
  machine_name?: string;
  machine_method?: string;
  start_date: string;
  end_date: string;
  decision: 'reset' | 'scale' | 'close';
  pnl: number;
  withdrawn: number;
  starting_capital?: number;
  ending_balance?: number;
  peak_pnl?: number;
  max_drawdown?: number;
  trade_count?: number;
  win_count?: number;
  next_machine_id?: string;
  scorecard?: { discipline, risk, emotion, withdraw, learning };
  reflection?: { best_action, biggest_mistake, key_lesson };
  meta?: Record<string, unknown>;
  created_at: string;
}
```

---

## 9. VOC widgets (user-side)

### `components/voc/feedback-button.tsx` (139 dòng)

Floating gold button góc phải-dưới (z-40). Click → modal:
- 5 type pills: Bug / Feature / Khen / Phàn nàn / Khác
- Title (max 120 char) + Content textarea
- Auto-attach pathname
- Submit → `voc-api.submitFeedback()` → 1.5s celebration → close

### `components/voc/nps-survey.tsx` (159 dòng)

**Eligibility gates** (cumulative):
1. User signup ≥30 ngày
2. Đã có ≥30 `trade_logged` events (count from Supabase)
3. Chưa dismiss trong 30 ngày qua
4. Chưa answer trong 90 ngày qua

3-step popup:
- Step 1: 11 nút 0-10 (color: red 0-6, amber 7-8, emerald 9-10)
- Step 2: Reason textarea (optional)
- Step 3: Thanks

Dismiss state:
- X close → `nps_dismissed_until = now + 30 days` (localStorage)
- Submit → `nps_dismissed_until = now + 90 days`

---

## 10. Senior UI mode (`lib/co-may/senior-ui.ts`)

App target audience là trader u40-60 — `isSeniorMode(role)` returns `true` khi role='client'.

Senior mode bump styles:
- Font: text-base/text-3xl instead of text-sm/text-2xl
- Padding: p-5 instead of p-4
- Tap targets: h-11 inputs
- Button size: 'default' instead of 'sm'
- KPI icons: 20px instead of 16px

Helper class `seniorCx.kpiValue(s)`, `seniorCx.rowPadY(s)`, etc.

Admin/mentor view (`isSeniorMode('admin') === false`) → dense layout.

---

## 11. Analytics & tracking

### `lib/analytics.ts` — domain events (events table)

```typescript
trackEvent(eventName, properties, userId?)         // fire-and-forget
maybeTrackSessionStart(userId)                     // check 30min idle → fire SESSION_START

Events = {
  USER_SIGNUP, USER_LOGIN, SESSION_START,
  TRADING_ACCOUNT_CREATED, TRADE_LOGGED, TRADE_EDITED, TRADE_DELETED,
  WITHDRAWAL_LOGGED, PAGE_VIEW,
}
```

Wired vào:
- `lib/auth.ts` ensureProfile/signInWithEmail → USER_SIGNUP / USER_LOGIN
- `app/(auth)/register/page.tsx` → USER_SIGNUP
- `lib/co-may/mock-data.ts` addMachine → TRADING_ACCOUNT_CREATED
- `lib/co-may/mock-data.ts` addTx → TRADE_LOGGED hoặc WITHDRAWAL_LOGGED
- `components/layout/activity-tracker.tsx` → PAGE_VIEW + SESSION_START

### `lib/activity-tracker.ts` — granular events (activity_events table)

Tracking page view + login. Separate table cho:
- `apps_access.last_seen_at` update via `touchLastSeen()`
- `getAccessStatus()` query

### `lib/access-status.ts`

```typescript
getAccessStatus(userId, app): 'pending' | 'approved' | 'locked' | 'none'
touchLastSeen(userId, app)                         // update apps_access.last_seen_at
```

Gate logic trong layout: `if status !== 'approved' && !isAdmin → router.replace('/pending')`.

---

## 12. Symbol autocomplete (`lib/co-may/trading-symbols.ts`)

Static list ~95 symbols cho `symbol-combobox.tsx`:
- FX majors: EURUSD, GBPUSD, USDJPY, AUDUSD, ...
- Commodities: XAUUSD, XAGUSD, OIL
- Indices: US30, SPX500, NAS100, ...
- Crypto: BTCUSD, ETHUSD, ...

Combobox UI dùng @base-ui/react Combobox primitive.

---

## 13. Celebrate animation (`lib/co-may/celebrate.ts`)

```typescript
celebrateWithdraw(amount): void          // canvas-confetti
celebrateMilestone(label): void          // gold burst
```

Trigger:
- Sau khi rút tiền thành công (withdraw-modal)
- Đóng chu kỳ với decision = scale (close-cycle-wizard)

---

## 14. Workflow điển hình của user

### Day 1 — first login
1. Login → trang Pending (admin chưa duyệt) → đợi
2. Admin duyệt → user login lần 2 → tự redirect `/client/co-may/setup`
3. Hoàn tất 3-step wizard → vào `/client/co-may/tong-quan`

### Daily usage
1. Mở `/client/co-may/tong-quan` xem máy nào cần rút
2. Click vào máy có alert → trang detail
3. Nếu vượt mốc → click **Nâng neo** hoặc **Rút tiền**
4. Sau khi trade → mở detail máy → **Ghi nhận lệnh mới**
5. Update PnL + lý do vào/thoát + cảm xúc → submit

### End of cycle (sau 50+ lệnh hoặc 1-3 tháng)
1. Click **Đóng chu kỳ** → wizard 4 bước
2. Review tổng kết → tự chấm scorecard → viết reflection
3. Quyết định reset/scale/close
4. → tạo báo cáo, optional new machine

### Cuối tháng
1. Mở `/client/co-may/lich-su` → export CSV
2. Review nhật ký → so với tháng trước

---

## 15. Backend schema (Supabase) — relevant cho client

```
profiles (id, full_name, email, role, mentor_id, classification, risk_tag,
          source='comay', onboarding_survey JSONB, created_at, ...)
apps_access (user_id, app='comay', status, approved_at, locked_at, last_seen_at)

comay_setup (user_id PK, total_capital, strategy, injected_from_withdrawn, completed_at)
comay_machines (id, user_id, name, capital, current_anchor, cycle_started_at,
                status, method, signal_source, risk_per_trade_pct, max_drawdown_pct,
                target_withdraw_count, target_profit, anchor_milestones[], created_at)
comay_transactions (id, machine_id, user_id, type CHECK trade_win/trade_loss/withdraw/anchor_change,
                    amount, note, direction, symbol, volume, entry_reason, exit_reason,
                    emotion, created_at)
comay_reports (id, machine_id, user_id, machine_name, machine_method,
               start_date, end_date, decision, pnl, withdrawn, starting_capital,
               ending_balance, peak_pnl, max_drawdown, trade_count, win_count,
               next_machine_id, scorecard JSONB, reflection JSONB, meta JSONB, created_at)
comay_dismiss_state (user_id, machine_id, trade_count, updated_at PK)

-- Cross-cutting:
events (id BIGSERIAL, user_id, event_name, properties JSONB, session_id, created_at)
activity_events (id UUID, user_id, type, path, metadata JSONB, created_at)
nps_responses (id, user_id, score, reason, context, created_at)
user_feedback (id, user_id, type, title, content, status, admin_notes,
               attached_url, upvotes, created_at, updated_at)
```

Initial setup SQL: `supabase-setup.sql` + `supabase-comay-setup.sql` (đã chạy long ago).
Admin dashboard SQL: xem `docs/codebase-admin-comayintien.md` section 6.

---

## 16. Performance & UX notes

- **localStorage cache + dual-write**: read sync, write async — UI never blocks waiting for Supabase
- **Hydrate once per session**: `hydrateFromCloud` chỉ chạy 1 lần ở layout mount, sau đó dùng cache
- **`invalidateLocalCache(userId)`**: gọi sau hydrate để force re-read trong session — vd khi user khác (admin) modify
- **Owner query param**: `?owner=<uuid>` cho admin/mentor xem máy user khác — UI tự detect read-only
- **`mutationSeq` counter**: thêm vào ID local để tránh collision (vd `mach-new-abc123-3`)
- **Confetti**: canvas-confetti bundle nhỏ (~5KB), trigger lazy khi celebrate
- **Recharts**: lazy loaded khi vào tổng quan/detail — bundle main không bị penalty
- **Bundle size**: client routes giữ ~600KB (Recharts + framer-motion + base-ui)

---

## 17. Tham khảo chéo

- **User docs (hướng dẫn sử dụng)**: `docs/co-may-user-guide.md`
- **Admin docs**: `docs/admin-comayintien-handbook.md`
- **Admin codebase**: `docs/codebase-admin-comayintien.md`
