# Phase 03 — Cỗ Máy layout + paywall component

## Context Links
- Plan: ../plan.md
- Depends on: phase-01 (mock access fn), phase-02 (sidebar có entry trỏ đến routes này)

## Overview
- Priority: high
- Status: completed
- Est. effort: 3-4h

## Key Insights
- Cỗ Máy nằm **trong** dashboard layout của 3 role (`(dashboard)/student|mentor|admin/co-may/*`) → kế thừa Sidebar + theme sẵn có, không cần wrap thêm Sidebar.
- 3 sub-page của mỗi role share **chung** sub-nav (top tabs hoặc segmented control) → tạo 1 layout riêng cho `co-may` segment, dùng chung cả 3 role.
- Trick: vì 3 role copy structure, **share 1 single source** ở `(dashboard)/_co-may-shared/` và mỗi role chỉ là wrapper mỏng → tránh duplication.
- Paywall: render khi `!hasMoneyMachineAccess(user.id)` — fullscreen card với gold gradient + CTA upgrade.

## Requirements
**Functional:**
- Layout `app/(dashboard)/[role]/co-may/layout.tsx` (tạo cho từng role): check access flag → nếu false render `<PaywallScreen />`, nếu true render sub-nav + `{children}`.
- Sub-nav: 3 tabs underline-gold (Tổng quan / Cỗ Máy Chi Tiết / Báo cáo & Nhật ký), active tab có gold border-bottom + bold.
- Paywall component: hero gradient gold, badge "Premium Add-on", h1 "Nâng cấp Cỗ Máy In Tiền", CTA primary "Nâng cấp ngay - 1.990.000đ/tháng", feature list.
- Role-aware data scope: **TÔ MÀU** logic shared component để mỗi role thấy data scope khác (defer scope rules cho phase 04/05/06; layout chỉ pass `role` prop xuống).

**Non-functional:**
- Layout là Server Component (không cần "use client").
- PaywallScreen + SubNav là Client (cần usePathname).

## Architecture
```
rova-lms/app/(dashboard)/
├── student/co-may/
│   ├── layout.tsx              ← role wrapper, check access, render <CoMayShell role="student">
│   ├── page.tsx                ← redirect to ./tong-quan
│   ├── tong-quan/page.tsx      ← phase 04
│   ├── quan-ly/page.tsx        ← phase 05
│   └── lich-su/page.tsx        ← phase 06
├── mentor/co-may/
│   └── (same as student)
└── admin/co-may/
    └── (same)

rova-lms/components/co-may/         ← NEW shared
├── co-may-shell.tsx                 ← layout wrapper với SubNav
├── sub-nav.tsx                      ← 3 tabs underline-gold
└── paywall-screen.tsx               ← gold gradient hero
```

Each role's `layout.tsx` is ~10 LOC — chỉ check access và pass role prop.

## Related Code Files
**Modify:** —

**Create:**
- `rova-lms/app/(dashboard)/student/co-may/layout.tsx`
- `rova-lms/app/(dashboard)/student/co-may/page.tsx` (redirect)
- `rova-lms/app/(dashboard)/mentor/co-may/layout.tsx`
- `rova-lms/app/(dashboard)/mentor/co-may/page.tsx`
- `rova-lms/app/(dashboard)/admin/co-may/layout.tsx`
- `rova-lms/app/(dashboard)/admin/co-may/page.tsx`
- `rova-lms/components/co-may/co-may-shell.tsx`
- `rova-lms/components/co-may/sub-nav.tsx`
- `rova-lms/components/co-may/paywall-screen.tsx`

(9 files but 6 là 10-LOC wrappers — effective code = 3 file shared.)

## Existing code audit

| File:line | Signature | Fit | Verdict |
|---|---|---|---|
| `components/ui/tabs.tsx` | shadcn Tabs | 60% | FORK-NEW (cần tab style underline-gold custom, Tabs shadcn dùng pill) |
| `components/shared/LockedFeature.tsx` | locked card | 50% | FORK-NEW (paywall có gradient gold + CTA upgrade riêng) |
| `lib/auth.ts` `useCurrentUser` | role-aware user fetch | 100% | REUSE-AS-IS |
| `lib/co-may/mock-data.ts` `hasMoneyMachineAccess` | access check | 100% | REUSE-AS-IS |

**Cross-surface duplication:** 3 role layouts duplicate structure → giải quyết bằng `<CoMayShell />` shared component, role layout chỉ là wrapper 10-LOC.

## Reuse strategy
**EXTRACT-SHARED** cho layout/sub-nav/paywall — đặt ở `components/co-may/` shared. Mỗi role layout import + pass `role` prop. Tránh viết logic 3 lần.

**FORK-NEW** cho `SubNav` (underline-gold style đặc thù) và `PaywallScreen` (UI riêng, không dùng `LockedFeature`).

## Implementation Steps
1. Tạo `components/co-may/paywall-screen.tsx` — Client Component:
   - max-w-2xl card centered, `bg-gradient-to-br from-primary/10 to-secondary/10`, `border-2 border-primary/30 rounded-3xl p-8 md:p-12`
   - Badge "✨ Premium Add-on" với `bg-primary text-primary-foreground`
   - H1 với "Nâng cấp" text-foreground + "Cỗ Máy In Tiền" text-primary
   - Sub: "Quản trị kỷ luật trading như pro — đồng bộ với khoá học bạn đang theo."
   - `<Button variant="primary" size="lg">Nâng cấp ngay - 1.990.000đ/tháng</Button>`
   - Feature list 4 items với check icon
2. Tạo `components/co-may/sub-nav.tsx` — Client Component:
   - 3 tabs label + href pattern dynamic theo role
   - Active state: `border-b-2 border-primary text-primary font-semibold`
   - Inactive: `text-muted-foreground hover:text-foreground`
   - Container: flex gap-6 border-b border-border mb-6
3. Tạo `components/co-may/co-may-shell.tsx` — Client Component:
   ```tsx
   export function CoMayShell({ role, children }: { role: 'student'|'mentor'|'admin'; children: ReactNode }) {
     return (
       <div className="space-y-6">
         <header>
           <h1 className="text-2xl font-bold gold-gradient-text">Cỗ Máy In Tiền</h1>
           <p className="text-muted-foreground text-sm">Quản trị kỷ luật rút tiền cho trader</p>
         </header>
         <SubNav role={role} />
         {children}
       </div>
     );
   }
   ```
4. Tạo 3 role layouts (student/mentor/admin) — pattern giống nhau:
   ```tsx
   import { CoMayShell } from '@/components/co-may/co-may-shell';
   import { PaywallScreen } from '@/components/co-may/paywall-screen';
   import { hasMoneyMachineAccess } from '@/lib/co-may/mock-data';
   import { useCurrentUser } from '@/lib/auth';

   export default function StudentCoMayLayout({ children }: { children: React.ReactNode }) {
     const user = useCurrentUser('student');
     if (!user) return null;
     if (!hasMoneyMachineAccess(user.id)) return <PaywallScreen />;
     return <CoMayShell role="student">{children}</CoMayShell>;
   }
   ```
   Note: `useCurrentUser` là client hook → layout cần `"use client"`. Acceptable cho MVP, sẽ refactor server-side khi wire Supabase.
5. Tạo 3 redirect pages (`page.tsx`) — `redirect(\`/${role}/co-may/tong-quan\`)`.

## Todo List
- [x] Tạo `paywall-screen.tsx`
- [x] Tạo `sub-nav.tsx` với role prop dynamic href
- [x] Tạo `co-may-shell.tsx`
- [x] Tạo `student/co-may/layout.tsx` + `page.tsx` redirect
- [x] Tạo `mentor/co-may/layout.tsx` + `page.tsx`
- [x] Tạo `admin/co-may/layout.tsx` + `page.tsx`
- [x] Bonus: stub 9 sub-pages (`tong-quan|quan-ly|lich-su` × 3 role) với `<ComingSoonStub />` để click test sidebar không 404
- [x] Tạo `coming-soon-stub.tsx` shared placeholder component
- [x] `tsc --noEmit` pass

## Success Criteria
- Login student-001, vào `/student/co-may` → redirect `/student/co-may/tong-quan` (placeholder content vì phase 04 chưa làm).
- Sub-nav 3 tabs render đúng, click chuyển URL, active tab có underline gold.
- Mock flag false → toàn bộ `/student/co-may/*` render PaywallScreen.
- Same flow work với `/mentor/co-may` và `/admin/co-may`.

## Risk Assessment
- **Layout dùng `useCurrentUser` client hook** → flash khi user state load. Mitigate: useCurrentUser hiện đã handle với fallback role; show skeleton ngắn khi `user == null`.
- **Trùng `page.tsx` redirect** → có thể replace bằng `useEffect router.replace` nếu Next 16 cần "use client" cho redirect; verify Next 16 server `redirect()` từ `next/navigation` ok.

## Next Steps
Unblocks: phase 04, 05, 06 chạy parallel cho 3 module nội dung.
