# Phase 2 — Tách repo Cỗ Máy

## Tóm tắt

1. Clone `lmsrova` → push sang `comayintien` repo
2. Xoá toàn bộ LMS code, giữ Cỗ Máy + auth + UI
3. Update routing (URL gọn) + register flow (`source='comay'`)
4. Set Vercel env vars trỏ Supabase chung
5. Deploy

---

## Bước 1: Clone + push sang repo comayintien

```bash
# Ở thư mục cha (vd Documents)
git clone https://github.com/Sydneynguyen112/lmsrova.git comayintien-temp
cd comayintien-temp

# Đổi remote
git remote set-url origin https://github.com/Sydneynguyen112/comayintien.git

# Reset history (optional — cleaner)
# Nếu muốn giữ history: skip 2 dòng dưới
rm -rf .git
git init -b main
git remote add origin https://github.com/Sydneynguyen112/comayintien.git
```

---

## Bước 2: Strip LMS code

Vào thư mục `comayintien-temp/rova-lms/` và **xoá**:

### Folder & files
```bash
cd rova-lms

# Admin LMS pages
rm -rf "app/(dashboard)/admin/courses"
rm -rf "app/(dashboard)/admin/users"
rm -rf "app/(dashboard)/admin/students"
rm -rf "app/(dashboard)/admin/mentors"
rm -rf "app/(dashboard)/admin/blog"
rm -rf "app/(dashboard)/admin/forms"
rm -rf "app/(dashboard)/admin/reviews"
rm -rf "app/(dashboard)/admin/profile"
rm -f "app/(dashboard)/admin/page.tsx"

# Student LMS pages
rm -rf "app/(dashboard)/student/courses"
rm -rf "app/(dashboard)/student/checkout"
rm -rf "app/(dashboard)/student/blog"
rm -rf "app/(dashboard)/student/journal"
rm -rf "app/(dashboard)/student/submissions"
rm -rf "app/(dashboard)/student/review"
rm -rf "app/(dashboard)/student/profile"
rm -f "app/(dashboard)/student/page.tsx"

# Mentor LMS pages
rm -rf "app/(dashboard)/mentor/students"
rm -rf "app/(dashboard)/mentor/submissions"
rm -rf "app/(dashboard)/mentor/reviews"
rm -rf "app/(dashboard)/mentor/profile"
rm -f "app/(dashboard)/mentor/page.tsx"

# Public LMS pages
rm -rf "app/(public)/blog"
rm -rf "app/(public)/courses"
rm -rf "app/(public)/mentors"
rm -rf "app/(public)/pricing"
rm -f "app/(public)/page.tsx"

# Components LMS
rm -rf components/admin
rm -rf components/blog
rm -rf components/courses
rm -rf components/forms
rm -rf components/landing
rm -rf components/mentor
rm -rf components/student

# Lib LMS
rm -f lib/mock-data.ts
rm -rf lib/types.ts  # nếu có conflict, giữ lại + dọn types không dùng
```

### File dọn thủ công (giữ + edit)

#### `components/layout/Sidebar.tsx`
- Bỏ tất cả menu items LMS
- Giữ: Dashboard (Tổng quan Cỗ Máy), Hồ sơ, Đăng xuất

#### `components/layout/sidebar-nav-config.ts`
- Xoá hết items courses/blog/forms/students...
- Giữ: chỉ items Cỗ Máy

#### `app/(dashboard)/student/co-may/layout.tsx`
- Bỏ check `hasMoneyMachineAccess` paywall (vì web này 100% là Cỗ Máy, ai vào được rồi thì xem)
- Hoặc giữ check nhưng base trên `apps_access`

#### `app/page.tsx` (root)
- Đổi sang redirect:
```tsx
import { redirect } from "next/navigation";
export default function HomePage() {
  redirect("/student/co-may/tong-quan");
}
```

Hoặc nếu muốn URL gọn `/co-may/tong-quan` thay vì `/student/co-may/tong-quan`:
- Move toàn bộ `app/(dashboard)/student/co-may/*` → `app/(dashboard)/co-may/*`
- Update import paths

---

## Bước 3: Update register flow — set `source = 'comay'`

### File `app/(auth)/register/page.tsx`

Tìm khối INSERT và thêm `source`:

```tsx
const { data: profile, error: insertError } = await supabase
  .from("profiles")
  .insert({
    full_name: form.full_name,
    email: form.email.trim().toLowerCase(),
    phone: form.phone,
    role: "student",
    classification: "newbie",
    risk_tag: "normal",
    source: "comay",  // ← THÊM DÒNG NÀY
  })
  .select()
  .single();

// Sau khi profile tạo thành công, thêm apps_access
if (profile) {
  await supabase.from("apps_access").insert({
    user_id: profile.id,
    app: "comay",
  });
  // Tự cấp money_machine feature
  await supabase.from("user_features").insert({
    user_id: profile.id,
    feature: "money_machine",
  });
}
```

### File `lib/auth.ts` — function `ensureProfile`

Tìm INSERT block (Google OAuth flow), thêm:

```ts
const { data: newProfile, error: insertError } = await supabase
  .from("profiles")
  .insert({
    full_name: fullName,
    email: user.email!,
    avatar_url: user.user_metadata?.avatar_url || null,
    role: "student",
    classification: "newbie",
    risk_tag: "normal",
    source: "comay",  // ← THÊM
  })
  .select()
  .single();

if (newProfile) {
  await supabase.from("apps_access").upsert(
    { user_id: newProfile.id, app: "comay" },
    { onConflict: "user_id,app" }
  );
  await supabase.from("user_features").upsert(
    { user_id: newProfile.id, feature: "money_machine" },
    { onConflict: "user_id,feature" }
  );
}
```

### Auth gate — `lib/auth.ts useCurrentUser`

Sau khi load profile, kiểm tra apps_access:

```ts
// Sau khi setUser(data)
if (data) {
  // Ensure user có 'comay' access — nếu chưa thì grant
  const { data: access } = await supabase
    .from("apps_access")
    .select("app")
    .eq("user_id", data.id)
    .eq("app", "comay")
    .maybeSingle();

  if (!access) {
    await supabase.from("apps_access").upsert(
      { user_id: data.id, app: "comay" },
      { onConflict: "user_id,app" }
    );
  }
}
```

→ User cũ từ LMS sang Cỗ Máy → tự động được cấp quyền `comay`. Mở rộng: thêm payment gate sau.

---

## Bước 4: Update branding

### `components/co-may/co-may-shell.tsx`
- Đổi tên app từ "ROVA" → "Cỗ Máy In Tiền"
- Logo / màu giữ nguyên (gold) hoặc đổi nếu muốn

### `app/layout.tsx`
- Đổi `metadata.title` → "Cỗ Máy In Tiền"

### `package.json`
- Đổi `name`: `"comayintien"`

---

## Bước 5: Push lên GitHub

```bash
cd ../  # về thư mục comayintien-temp gốc
git add -A
git commit -m "init(comayintien): split from lmsrova, strip LMS code"
git push -u origin main
```

---

## Bước 6: Vercel setup

1. Vào Vercel Dashboard → project `comayintien` → Settings > Git
2. Connect repo `Sydneynguyen112/comayintien`
3. Settings > Environment Variables → set 2 biến chung Supabase với LMS:
   ```
   NEXT_PUBLIC_SUPABASE_URL = <copy từ project lmsrova>
   NEXT_PUBLIC_SUPABASE_ANON_KEY = <copy từ project lmsrova>
   ```
4. Deployments > Redeploy (hoặc push commit mới)
5. Test: vào `comayintien.vercel.app` → đăng ký tài khoản mới → check Supabase Table Editor:
   - `profiles` có row với `source='comay'`
   - `apps_access` có row `(user_id, 'comay')`
   - `user_features` có row `(user_id, 'money_machine')`

---

## Verify cross-app

1. Đăng ký user mới ở `comayintien.vercel.app`
2. Vào `lmsrova.vercel.app` → đăng nhập cùng email/Google
3. Phải thấy tài khoản đó trong Admin > Quản lý Học viên (cùng email)
4. Source column cho thấy `comay` (cần thêm filter UI sau — Phase 3 hoặc Phase 4)

---

## Edge cases

- **User register ở comay xong sang LMS**: profile đã có, login Google → reuse. Cần thêm logic ở `lmsrova` ensureProfile: nếu profile.source = 'comay' và user vào lms → cập nhật `source = 'both'` hoặc thêm row `apps_access (user_id, 'lms')`
- **User cũ ở LMS chưa có apps_access row**: backfill SQL Phase 1 đã insert sẵn `'lms'`. Ngoài ra useCurrentUser bên LMS có thể tự upsert nếu thiếu

---

## File commits sau khi xong

Trong repo `comayintien` chỉ còn:
```
rova-lms/
├── app/
│   ├── (auth)/sign-in, register
│   ├── auth/callback
│   ├── (dashboard)/
│   │   ├── layout.tsx (đơn giản hoá)
│   │   ├── student/co-may/  (hoặc /co-may/)
│   │   ├── admin/co-may/    (giữ admin Cỗ Máy)
│   │   └── mentor/co-may/   (giữ mentor xem mentee)
│   ├── onboarding/
│   ├── page.tsx → redirect /co-may/tong-quan
│   └── layout.tsx
├── components/
│   ├── co-may/
│   ├── ui/
│   ├── layout/Sidebar.tsx (đơn giản)
│   └── shared/ProfileEditor.tsx
├── lib/
│   ├── co-may/
│   ├── feature-flags/
│   ├── auth.ts
│   ├── supabase.ts
│   └── utils.ts
└── supabase-phase1-consolidate.sql (reference)
```

---

## Effort thực tế

- Bước 1-2: 30 phút (chạy script + verify)
- Bước 3: 30 phút (sửa 2 file)
- Bước 4: 15 phút
- Bước 5-6: 15 phút
- Verify: 30 phút

**Total**: ~2 giờ.

## Khi xong Phase 2 → báo lại để tôi tiếp Phase 3 (strip Cỗ Máy khỏi LMS)
