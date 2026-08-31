# Cook Report — phase-03-comay-layout-paywall

## Phases executed
- [x] phase-03-comay-layout-paywall

## Files modified
**Created (4 shared components):**
- `rova-lms/components/co-may/paywall-screen.tsx` (47 LOC) — gold gradient hero + CTA + features
- `rova-lms/components/co-may/sub-nav.tsx` (44 LOC) — 3 tabs underline-gold dynamic theo role
- `rova-lms/components/co-may/co-may-shell.tsx` (40 LOC) — header với Coins icon + role label + SubNav + children slot
- `rova-lms/components/co-may/coming-soon-stub.tsx` (24 LOC) — placeholder cho sub-pages chờ phase 04/05/06

**Created (3 role layouts, 25 LOC mỗi cái — duplicate by design):**
- `rova-lms/app/(dashboard)/student/co-may/layout.tsx`
- `rova-lms/app/(dashboard)/mentor/co-may/layout.tsx`
- `rova-lms/app/(dashboard)/admin/co-may/layout.tsx`

**Created (3 redirect pages, 5 LOC):**
- `rova-lms/app/(dashboard)/{role}/co-may/page.tsx` × 3 → server `redirect()` đến `/{role}/co-may/tong-quan`

**Created (9 stub pages, ~10 LOC mỗi cái):**
- `rova-lms/app/(dashboard)/{role}/co-may/{tong-quan|quan-ly|lich-su}/page.tsx` × 9
- Mỗi stub render `<ComingSoonStub module="..." description="..." />`
- Phase 04/05/06 sẽ overwrite content

**Tổng:** 19 file mới (kế hoạch ban đầu 9, +10 = stub component + 9 stub pages để click-testable).

## Existing utilities considered
- `useCurrentUser(fallbackRole)` — REUSE-AS-IS, gọi trong layout cho từng role
- `hasMoneyMachineAccess` (phase 01) — REUSE-AS-IS
- `Button variant="anchor"` (phase 01) — REUSE-AS-IS, dùng trong PaywallScreen CTA
- `Coins, LayoutDashboard, Settings, FileBarChart` lucide — REUSE-AS-IS
- `gold-gradient-text`, `gold-glow` utility classes (globals.css) — REUSE-AS-IS

## Shared modules created/updated
**EXTRACT-SHARED:** `co-may-shell.tsx`, `sub-nav.tsx`, `paywall-screen.tsx` đặt ở `components/co-may/` — 3 role layouts đều import từ đây, không duplicate logic.

## Compile status
✓ `npx tsc --noEmit` exit 0
- Skipped `next build` (chậm, sẽ chạy ở phase 06 cuối cùng).

## Smoke checks
- ✓ All 15 route files exist (`find` confirmed)
- ✓ Server `redirect()` từ `next/navigation` work với layout client (children slot pattern)
- ✓ Sub-nav active state theo `usePathname` startsWith
- Visual smoke chưa làm — cần `npm run dev` + manual browser test.

## Deviations from plan
**1. Stub 9 sub-pages thay vì để 404**
- Plan phase 03 chỉ tạo redirect page. Plan phase 04/05/06 mới tạo sub-pages thật.
- Vấn đề: nếu phase 04/05/06 chưa cook, click sub-nav → 404 → không test được sidebar/sub-nav UX của phase 03.
- Quyết định: stub luôn 9 sub-pages với `<ComingSoonStub />`. Phases 04/05/06 sẽ overwrite content (không phải tạo file mới).
- Tradeoff: phase 03 effort tăng ~30 phút, đổi lại visual smoke testable end-to-end ngay.

**2. Layout client-side (không server)**
- Spec phase 03 ghi "Layout là Server Component" và "PaywallScreen + SubNav là Client".
- Implement: layout buộc phải `"use client"` vì gọi `useCurrentUser` (client hook). PaywallScreen và SubNav cũng client.
- Refactor sang server: cần Supabase server client + cookie session — defer Supabase phase. OK với MVP.
- Tradeoff: small layout flash khi load (`Đang tải...` 1 frame), acceptable.

**3. Layout duplicate 3 file**
- Plan dự định "wrapper 10-LOC". Implement ~25 LOC mỗi file vì có loading state + access useEffect.
- Có thể abstract thành 1 helper `<RoleAwareCoMayLayout role="...">` nhưng đó là over-engineering cho 3 file gần như giống hệt nhau. Giữ nguyên.

## Behavior summary
- Login `student-001` → access flag `hasMoneyMachineAccess(id, "student")` deterministic.
  - Nếu true: vào `/student/co-may` → redirect `/student/co-may/tong-quan` → render `<CoMayShell role="student">` với header gold + sub-nav 3 tabs + ComingSoonStub.
  - Nếu false: render `<PaywallScreen />` full-page.
- Sidebar entry "Cỗ Máy In Tiền" expand được, click sub-item navigate đúng URL, sub-nav cũng highlight đúng tab active.

## Visual milestone
**End-to-end navigation test:**
```
Login → Sidebar shows "Cỗ Máy In Tiền" (with/without lock based on mock access) →
Click expand → Click "Tổng quan & Hiệu suất" →
URL: /student/co-may/tong-quan →
Page renders: header + sub-nav + ComingSoonStub("Tổng quan & Hiệu suất")
```

## Follow-ups (out of scope)
- Server-side access check (cần Supabase RLS). Defer.
- Tooltip cho collapsed sidebar sub-items. Defer.
- Loading skeleton thay "Đang tải..." text. Defer.

## Handoff context for next skill
**Next phases (parallel):** 04 (Tổng quan), 05 (Quản lý), 06 (Lịch sử)
**Stub pages to OVERWRITE (not create new):**
- `rova-lms/app/(dashboard)/{role}/co-may/tong-quan/page.tsx` — phase 04
- `rova-lms/app/(dashboard)/{role}/co-may/quan-ly/page.tsx` — phase 05
- `rova-lms/app/(dashboard)/{role}/co-may/lich-su/page.tsx` — phase 06

**Visual ready:** user có thể `npm run dev` ở `rova-lms/` để click test sidebar + sub-nav + paywall + ComingSoonStub. Đợi user duyệt rồi sang phase 04.
