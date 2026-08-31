# Phase 1 — Approval Gate

## Goal
User đăng ký xong → trạng thái `pending` → vào `/pending` page chờ admin duyệt.
Admin approve → status='approved' → unlock dashboard.
Admin lock → status='locked' → đẩy về /pending.

## Schema delta
`apps_access` thêm column `status`:
- `pending` — mới đăng ký, chưa được admin duyệt
- `approved` — admin duyệt, full access
- `locked` — admin khoá, không vào được app

Default cho row mới: `pending`.
Backfill rows hiện có: `approved` (giữ nguyên cho users hiện tại không bị lock-out).

## Files affected (comayintien-temp)
- `supabase-phase2-approval.sql` (new) — migration
- `lib/auth.ts` — sửa `ensureProfile`: insert pending instead of approved
- `app/(auth)/register/page.tsx` — sửa: insert pending
- `app/(dashboard)/student/co-may/layout.tsx` — gate logic
- `app/(dashboard)/admin/co-may/layout.tsx` — admin bypass
- `app/(dashboard)/mentor/co-may/layout.tsx` — gate logic
- `app/pending/page.tsx` (new) — waiting screen
- `lib/access-status.ts` (new) — helper `getAccessStatus(userId, app)`

## Files affected (lmsrova)
- `rova-lms/supabase-phase2-approval.sql` (mirror, idempotent)
- LMS dashboard layouts: NO change (LMS apps_access đã backfill = 'approved' cho users cũ)

## Acceptance
- User mới đăng ký → /pending hiển thị "Đang chờ duyệt"
- Admin login → bypass gate (admin role không cần approval)
- Existing users → vẫn login bình thường (backfill 'approved')

## Effort
~1.5h (15 phút schema, 30 phút auth code, 30 phút UI page, 15 phút verify)
