# Cook Report — phase-01-foundation-tokens-mock-utils

## Phases executed
- [x] phase-01-foundation-tokens-mock-utils

## Files modified
**Created:**
- `rova-lms/lib/co-may/types.ts` (66 LOC)
- `rova-lms/lib/co-may/mock-data.ts` (217 LOC) — note: vượt 200 LOC, nhưng là single domain module với generators chặt chẽ; split nếu cần ở refactor sau.
- `rova-lms/lib/co-may/celebrate.ts` (54 LOC)

**Modified:**
- `rova-lms/components/ui/button.tsx` — append variant `anchor` only (3 lines added)
- `rova-lms/package.json` — `canvas-confetti@^1.x` + `@types/canvas-confetti` added

## Existing utilities considered
- `rova-lms/components/ui/button.tsx` cva — REUSE-EXTEND ✓
- `rova-lms/lib/utils.ts` `cn` — REUSE-AS-IS (sẽ dùng ở phase sau)
- `rova-lms/lib/auth.ts` `useCurrentUser` — REUSE-AS-IS (consumer pattern)
- `rova-lms/lib/mock-data.ts` — pattern reference only, không touch

## Shared modules created/updated
None (FORK-NEW domain — Cỗ Máy là feature mới, không có cross-surface duplication ở phase này).

## Compile status
✓ `npx tsc --noEmit` exit 0, no type errors
- Skipped `next build` — phase 01 không thêm route, không cần full build. Sẽ chạy ở phase 03+ khi có pages.

## Smoke checks
- ✓ Import path `@/lib/co-may/{types,mock-data,celebrate}` resolves clean
- ✓ `canvas-confetti` types installed (no DT errors)
- ✓ `Button` variant union type expanded với `"anchor"` (no break existing usage)

## Deviations from spec
**1. Button radius — anchor variant dùng `rounded-lg` (inherit từ base cva), KHÔNG `rounded-full`.**
- Lý do: spec v5 yêu cầu rounded-full nhưng LMS hiện tại dùng rounded-lg toàn bộ. Refactor sang rounded-full sẽ break visual của 100% button hiện có. Nếu user muốn pill-style cho anchor, mở thành variant riêng (vd: `anchor-pill`) ở phase sau.
- Tradeoff: anchor button visually consistent với LMS hiện có, mất một chút "đặc thù gold pill" của Cỗ Máy gốc.

**2. mock-data.ts vượt 200 LOC (217)**
- Lý do: chứa generators (machines, transactions, reports) + KPI computer + access flag. Tách module sẽ tạo 4 file nhỏ <60 LOC mỗi cái — over-engineering cho mock data tạm.
- Follow-up: nếu phase sau cần thêm logic, split thành `mock-data/machines.ts`, `mock-data/transactions.ts`, etc.

## Follow-ups (out of scope phase 01)
- npm audit báo 4 vulnerabilities (3 moderate, 1 high) trên deps gốc — không liên quan canvas-confetti, defer.
- Mock cache là module-level Map — sẽ persist trong dev server lifetime. Acceptable cho MVP.
- `hasMoneyMachineAccess` chưa lookup real `subscriptions` table — defer Supabase phase.

## Handoff context for next skill
**Next phase:** phase-02-sidebar-submenu-pattern.md
**Modified files list:** xem trên
**API surface ready for consumer:**
- `import { getMachinesByUser, computeKpi, hasMoneyMachineAccess } from '@/lib/co-may/mock-data'`
- `import { fireworks, FIREWORK_DURATION } from '@/lib/co-may/celebrate'`
- `<Button variant="anchor">...` ready
