# Cỗ Máy In Tiền — Wire Supabase backend

## Tóm tắt
Chuyển data layer từ localStorage-only → dual-write (localStorage cache + Supabase persist).
Giữ public API sync để không phải refactor 40+ component consumers.

## Đã làm (commit này)

### 1. SQL schema + RLS — `rova-lms/supabase-comay-setup.sql`
6 bảng:
- `comay_setup` — total_capital, strategy, injected_from_withdrawn (1 row/user)
- `comay_machines` — machines + anchor_milestones[]
- `comay_transactions` — trade_win/loss, withdraw, anchor_change
- `comay_reports` — cycle reports (scorecard + reflection JSONB)
- `comay_dismiss_state` — anchor strip / banner dismiss state
- `user_features` — entitlements (`money_machine`)

RLS bật + permissive `allow_all` (theo pattern của `supabase-setup.sql` hiện tại).
Khi cần khoá chặt: thay bằng `auth.uid()` policies.

### 2. Cloud sync layer — `lib/co-may/cloud-sync.ts`
- `hydrateFromCloud(userId)` — pull từ Supabase → ghi localStorage
- `cloudPush.{setup, machine, deleteMachine, tx, report, dismissState, feature}` — upsert async fire-and-forget

### 3. Mutations dual-write
- `mock-data.ts`: `addMachine`, `updateMachine`, `deleteMachine`, `recordTransaction`, `closeMachine`, `finalizeCycle` đều push lên cloud sau khi ghi local
- `setup-store.ts`: `saveSetup`, `adjustTotalCapital`, `addInjectedFromWithdrawn` push setup
- `feature-flags/store.ts`: `setFeature` push entitlement

### 4. Hydration on login
- 3 layouts (`student/mentor/admin/co-may/layout.tsx`) gọi `hydrateFromCloud(user.id)` → `invalidateLocalCache` → render children
- Show "Đang tải..." cho đến khi hydration xong

## Cách deploy

### Bước 1: Chạy SQL trong Supabase
```sh
# Mở Supabase Dashboard > SQL Editor
# Paste nội dung `rova-lms/supabase-comay-setup.sql` → Run
```

### Bước 2: Cấp quyền Cỗ Máy cho user thật
Sau khi user đăng nhập lần đầu, vào Supabase Table Editor → `user_features`:
```sql
INSERT INTO user_features (user_id, feature)
VALUES ('<uuid-của-user>', 'money_machine');
```
Hoặc dùng admin UI nếu đã có.

### Bước 3: Test flow
1. User đăng nhập Google → profile tạo trong `profiles`
2. Vào `/student/co-may` → layout gọi `hydrateFromCloud` (lần đầu trống)
3. Setup wizard → chọn vốn + chiến lược → `saveSetup` push:
   - 1 row `comay_setup`
   - N rows `comay_machines` (per allocation)
4. Thao tác trade/rút/hạ neo → tự động push `comay_transactions`
5. Đóng chu kỳ → push `comay_reports` + new `comay_machines` (scale/reset) + cập nhật closed `comay_machines`
6. Đổi browser/clear cache → đăng nhập lại → `hydrateFromCloud` pull về toàn bộ

## Edge cases & limitations

### Race conditions
- Local mutate → push fire-and-forget. Nếu network fail → log console, không retry. User mất sync này nếu refresh trước khi push xong.
- Mitigation cho production: queue push trong IndexedDB + background retry.

### Conflict (multi-tab)
- 2 tab cùng user thao tác → cả 2 push, last write wins.
- Hydration không subscribe realtime → tab kia không thấy update của tab này cho tới reload.
- Có thể thêm Supabase realtime subscription sau.

### Mentor/Admin scope
- Hydration hiện chỉ pull data của `user.id` (chính user đang đăng nhập).
- Mentor/Admin xem dữ liệu mentee → cần riêng `getMachinesForScope` query Supabase đa user.
- Hiện tại các view này dùng `getUserScope()` + `getMachinesByUser()` (read mock cache) → chưa pull từ cloud.
- TODO: refactor mentor/admin views để hydrate scope rộng hơn.

### Setup allocations
- Schema KHÔNG lưu `allocations` (đã materialize thành machines).
- Khi hydrate, `setup.allocations = []`. Nếu wizard cần đọc allocations sau khi hydrate → BUG.
- Hiện tại wizard chỉ dùng allocations trong session, không đọc lại sau.

### Dismiss state
- Cloud push KHÔNG wire vào machine-anchor-strip.tsx (component không có userId trực tiếp).
- Hệ quả: user dismiss banner → reload trên thiết bị khác → banner hiện lại.
- Acceptable cho MVP. Fix: pass userId từ MachineDetailView → strip → call cloudPush.dismissState.

### Demo users (`u-student-001`...)
- Vẫn dùng deterministic seed, không push cloud (vì không có profiles row).
- Chỉ user thật (UUID) push cloud.

## Phase 2 (chưa làm)

1. **Mentor/Admin scope hydration** — pull data của tất cả mentee
2. **Realtime subscription** — `supabase.channel` để sync giữa các tab
3. **Push retry queue** — store unsent mutations trong IndexedDB
4. **RLS chặt** — đổi `allow_all` → `auth.uid()`-based khi auth flow ổn định
5. **Migration script** — port localStorage hiện có lên cloud (nếu có user đã chạy mock data)
6. **Dismiss state cloud sync** — wire `cloudPush.dismissState` vào machine-anchor-strip
