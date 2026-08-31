# 3-App Architecture — LMS + Cỗ Máy + Admin Internal

## Kiến trúc tổng thể

```
                    ┌─────────────────────┐
                    │  Supabase chung     │
                    │  (canonical)        │
                    │                     │
                    │  - profiles         │
                    │  - apps_access      │
                    │  - courses, etc.    │
                    │  - comay_*          │
                    │  - user_features    │
                    └─────────┬───────────┘
                              │
          ┌───────────────────┼───────────────────┐
          │                   │                   │
    ┌─────▼─────┐       ┌────▼─────┐       ┌─────▼──────┐
    │  LMS      │       │ Cỗ Máy   │       │ Admin Hub  │
    │           │       │          │       │ (internal) │
    │ lmsrova   │       │comayintien│      │admin.rova  │
    │ .com      │       │ .com     │       │ .com       │
    └───────────┘       └──────────┘       └────────────┘
    Public users         Public users       Super-admin only
    Learning             Money machine      Cross-app analytics
    metrics              performance        + user mgmt
```

## Phân quyền per app

| App | Role chấp nhận | View |
|---|---|---|
| LMS | `student`, `mentor`, `admin` | Học tập + admin LMS only |
| Cỗ Máy | `student` (có `money_machine` feature) | Trader dashboard |
| Admin Hub | `super_admin` | Tất cả data tất cả app |

→ Cần thêm role `super_admin` vào CHECK constraint của `profiles.role`.

## Schema thay đổi

```sql
-- 1. Thêm role super_admin
ALTER TABLE profiles DROP CONSTRAINT profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('admin','mentor','student','super_admin'));

-- 2. Track user đến từ app nào (origin)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS source TEXT
  DEFAULT 'lms' CHECK (source IN ('lms','comay','admin','external'));

-- 3. Bảng apps_access — track user có truy cập app nào
CREATE TABLE IF NOT EXISTS apps_access (
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  app TEXT NOT NULL CHECK (app IN ('lms','comay','admin')),
  granted_at TIMESTAMPTZ DEFAULT now(),
  last_seen_at TIMESTAMPTZ,
  PRIMARY KEY (user_id, app)
);
ALTER TABLE apps_access ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_apps_access" ON apps_access
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 4. Audit log cho admin internal (optional, future-proof)
CREATE TABLE IF NOT EXISTS admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES profiles(id),
  action TEXT NOT NULL,
  target_user_id UUID,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

## Cấu trúc 3 repo

### Repo `lmsrova` (hiện có)
**Giữ**: courses, modules, lessons, enrollments, submissions, blog, mentor reviews, forms, học viên (admin), mentor (admin), profile, journal
**Bỏ**:
- Toàn bộ `app/(dashboard)/*/co-may/`
- `components/co-may/*`
- `lib/co-may/*`
- Phần "Doanh thu" trong admin dashboard (`mockEnrollments.reduce(price)`...)
- Sidebar item "Cỗ Máy In Tiền"
- Admin role hiện tại = view LMS only

**Update**:
- Sidebar: nếu user có `apps_access.app = 'comay'` → thêm link external sang `comayintien.com`
- Register: insert `source = 'lms'` + `apps_access (user_id, 'lms')`
- Bỏ admin button cấp `money_machine` feature (chuyển về Admin Hub)

### Repo `comayintien` (hiện có, đang trống)
**Source from**: copy từ `lmsrova` các folder:
- `app/(dashboard)/student/co-may/*` → `app/(dashboard)/co-may/*` (rút gọn URL)
- `app/(dashboard)/admin/co-may/*` → giữ cho admin Cỗ Máy view
- `components/co-may/*`
- `lib/co-may/*`
- `lib/auth.ts`, `lib/supabase.ts`
- `components/ui/*`
- Auth pages (`(auth)/sign-in`, `register`, `auth/callback`)

**Cấu trúc app**:
```
app/
├── (auth)/sign-in, register
├── auth/callback
├── (dashboard)/
│   ├── layout.tsx (sidebar đơn giản: Tổng quan / Chi tiết / Nhật ký)
│   ├── page.tsx → redirect /tong-quan
│   ├── tong-quan/
│   ├── quan-ly/
│   ├── lich-su/
│   ├── bao-cao/
│   └── profile/
└── page.tsx (landing)
```

**Update**:
- Register: insert `source = 'comay'` + `apps_access (user_id, 'comay')`
- Auth gate: check `apps_access` chứa `'comay'` HOẶC `user_features` có `'money_machine'` mới cho vào, không thì paywall
- Branding riêng: tên brand "Cỗ Máy In Tiền", màu/logo

### Repo `admin-hub` (mới)
**Stack**: clone lmsrova làm baseline, strip xuống còn admin shell
**Bỏ**: tất cả `student/*`, `mentor/*`, public pages
**Giữ**:
- Auth flow (chỉ cho `super_admin` và `admin` vào)
- Admin shell + sidebar
- Tất cả admin dashboards: học viên, mentor, courses (read-only), Cỗ Máy reports (read-only)
- Cross-app analytics page mới: tổng users, active per app, conversion LMS↔Cỗ Máy

**Cấu trúc**:
```
app/
├── (auth)/sign-in
├── (admin)/
│   ├── layout.tsx (super_admin gate)
│   ├── dashboard/
│   ├── users/ (toàn bộ profiles, filter theo source/app)
│   ├── apps-access/ (cấp quyền app cho user)
│   ├── lms/ → courses, mentors, students
│   ├── comay/ → reports, machines, performance
│   └── audit-log/
```

## Auth flow chéo

User đã đăng ký ở LMS → muốn dùng Cỗ Máy:
1. Sang `comayintien.com` → click "Đăng nhập"
2. Supabase Auth dùng chung session (qua cookie domain `*.rova.com` hoặc OAuth) → tự nhận user
3. Hoặc nếu khác domain root: user phải sign-in lại bằng cùng email/Google → cùng `profile.id`
4. Comayintien check `apps_access` — thấy user có `'lms'` không có `'comay'` → trigger flow grant `'comay'` (nếu có quyền) hoặc paywall

## Sync Supabase Auth giữa domains

3 domains khác nhau (lmsrova.com / comayintien.com / admin.rova.com) → Supabase Auth cookie KHÔNG chia sẻ tự động (browsers limit cookies to single origin).

**Giải pháp**:
- A. Subdomain pattern: `app1.rova.com`, `app2.rova.com`, `admin.rova.com` → cookie domain `.rova.com` chia sẻ. **Đề xuất**.
- B. SSO via Supabase Auth: user phải sign-in mỗi domain riêng (cùng credentials Google → cùng auth.users). Acceptable.

→ Khuyến nghị **A** nếu mua được domain `rova.com` (hoặc tương tự). Setup DNS: 3 CNAME → 3 Vercel projects.

## Migration plan (ordered)

### Phase 1: Supabase consolidation (45 phút)
1. Chọn 1 Supabase project làm canonical (LMS hiện tại)
2. Chạy SQL migration ở trên (thêm `source`, `apps_access`, `admin_audit_log`, role `super_admin`)
3. Backfill: `UPDATE profiles SET source = 'lms'; INSERT INTO apps_access SELECT id, 'lms', created_at FROM profiles;`
4. Bỏ Supabase project thứ 2 (export data nếu cần)

### Phase 2: Tách repo Cỗ Máy (2-3 giờ)
1. Clone repo `lmsrova` → push mới sang `comayintien`
2. Strip LMS code (xoá folder list ở trên)
3. Update register flow: `source = 'comay'`, insert apps_access
4. Update env vars Vercel `comayintien` → trỏ Supabase canonical
5. Test deploy

### Phase 3: Strip Cỗ Máy khỏi LMS (1 giờ)
1. Xoá toàn bộ `co-may` folder/components/lib trong repo `lmsrova`
2. Update sidebar: bỏ item Cỗ Máy hoặc thay bằng external link
3. Bỏ admin Cỗ Máy view (hoặc giữ làm read-only)
4. Bỏ doanh thu calculation trong admin dashboard
5. Test deploy

### Phase 4: Tạo Admin Hub repo (1 ngày)
1. Clone `lmsrova` → push sang `admin-hub` (hoặc tên mới)
2. Strip xuống còn admin shell
3. Update auth gate: chỉ `super_admin` vào được
4. Cross-app analytics page
5. Setup Vercel project mới + domain `admin.rova.com`

### Phase 5: Domain + DNS (30 phút)
- Mua domain `rova.com` (hoặc dùng `rova-academy.com`...)
- DNS:
  - `lms.rova.com` → Vercel project lmsrova
  - `comay.rova.com` → Vercel project comayintien
  - `admin.rova.com` → Vercel project admin-hub
- Cookie domain `.rova.com` để Supabase Auth share session

## File ownership tóm tắt

| Functionality | LMS | Cỗ Máy | Admin Hub |
|---|---|---|---|
| Khoá học, bài nộp, blog | ✅ | ❌ | 📖 read-only |
| Cỗ Máy CRUD | ❌ | ✅ | 📖 read-only |
| User mgmt + cấp quyền app | ❌ | ❌ | ✅ |
| Doanh thu / analytics | ❌ | ❌ | ✅ |
| Học viên/mentor admin | LMS-only mgmt | ❌ | Cross-app |

## Vấn đề cần quyết

1. **Domain naming**: dùng `rova.com` subdomain hay 3 domain riêng?
2. **Super admin role**: tạo mới hay reuse `admin` hiện tại?
3. **Order migration**: phase 1 → 2 → 3 → 4, hay làm song song?
4. **Branding**: 3 web có CI giống nhau hay khác hoàn toàn?

## Effort tổng

- Phase 1: 45 phút
- Phase 2: 2-3 giờ
- Phase 3: 1 giờ
- Phase 4: 1 ngày
- Phase 5: 30 phút
- **Total**: ~2 ngày làm tập trung

## Next step

Quyết định:
1. Nếu OK approach này → bắt đầu Phase 1 (Supabase consolidation) — tôi gen SQL migration ready-to-run
2. Trước khi tách repo → cần Phase 1 xong
3. Sau Phase 1 → có thể parallel Phase 2 (tách Cỗ Máy) và Phase 3 (strip LMS)
