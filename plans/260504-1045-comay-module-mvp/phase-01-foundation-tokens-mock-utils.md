# Phase 01 — Foundation: tokens verify + mock data + utils

## Context Links
- Plan: ../plan.md
- Spec: ../../rova-lms/cursor-prompt-v5-supabase-aurelian.md
- IA: ../reports/research-260504-1045-comayintien-ia.md

## Overview
- Priority: high
- Status: completed
- Est. effort: 2-3h

## Key Insights
- Aurelian tokens (gold/cream/dark) đã có **đầy đủ** trong `app/globals.css` — chỉ cần verify, không refactor.
- Manrope font đã import trong `app/layout.tsx` với `subsets: ['latin', 'vietnamese']`.
- Button hiện chỉ có shadcn default variants — cần thêm `anchor` variant (gold border + bg + hover translate-y).
- Mock data hiện ở `lib/mock-data.ts` — pattern là export named arrays + helper functions. Sẽ extend cùng pattern.
- `canvas-confetti` chưa có → cần cài.

## Requirements
**Functional:**
- Mock data cho machines, transactions, cycle_reports phục vụ 3 module
- Helper functions: `getMachinesByUser(userId)`, `getTxByMachine(machineId)`, `getReportsByMachine(machineId)`, `hasMoneyMachineAccess(userId)`, `computeKpi(machineId)`
- TypeScript types: `Machine`, `MachineTransaction`, `CycleReport`, `KpiSnapshot`
- `Button` thêm variant `anchor`
- Util `lib/co-may/celebrate.ts` — `fireworks()` với palette Aurelian, SSR-safe (dynamic import)

**Non-functional:**
- Mock deterministic theo userId (seedable random) → reload không reset state.
- Tree-shake friendly (named exports).

## Architecture
```
rova-lms/
├── lib/
│   └── co-may/                      ← NEW folder
│       ├── types.ts                  ← Machine, Transaction, CycleReport, KpiSnapshot
│       ├── mock-data.ts              ← seed-based mock arrays + helpers
│       └── celebrate.ts              ← fireworks() Aurelian palette
├── components/
│   └── ui/
│       └── button.tsx                ← MODIFY: add `anchor` variant
└── package.json                      ← MODIFY: + canvas-confetti
```

## Related Code Files
**Modify:**
- `rova-lms/components/ui/button.tsx` — add `anchor` variant
- `rova-lms/package.json` — add `canvas-confetti` + `@types/canvas-confetti`

**Create:**
- `rova-lms/lib/co-may/types.ts`
- `rova-lms/lib/co-may/mock-data.ts`
- `rova-lms/lib/co-may/celebrate.ts`

**Delete:** —

## Existing code audit
**Inline audit (no separate scout — single phase, additive only):**

| File:line | Signature | Fit | Verdict |
|---|---|---|---|
| `rova-lms/lib/mock-data.ts` | `users`, `getSubmissionsByUser`, etc. | Pattern only | FORK-NEW (new domain `co-may`) |
| `rova-lms/components/ui/button.tsx` | `buttonVariants` cva | 100% | REUSE-EXTEND (add variant) |
| `rova-lms/lib/utils.ts` | `cn`, `formatPrice` | Helpers reused | REUSE-AS-IS |

**Cross-surface duplication:** No — đây là feature mới, chưa có copy nào.

## Reuse strategy
**REUSE-EXTEND** cho `Button` (chỉ append `anchor` variant vào cva config, giữ nguyên 6 variant cũ). **FORK-NEW** cho mock data — domain co-may độc lập với LMS submissions/reviews, đặt trong namespace `lib/co-may/` để tránh ô nhiễm `lib/mock-data.ts`.

## Implementation Steps
1. `npm install canvas-confetti @types/canvas-confetti --save` trong `rova-lms/`
2. Tạo `lib/co-may/types.ts` — export `Machine`, `MachineTransaction` (with `type: 'trade_win' | 'trade_loss' | 'withdraw' | 'anchor_change'`), `CycleReport` (with `decision: 'reset' | 'scale'`), `KpiSnapshot` (totalCapital, pnl, winRate, drawdown, daysActive)
3. Tạo `lib/co-may/mock-data.ts`:
   - 3-4 machines deterministic per `mockUsers[]` (seed = hash userId)
   - 20-30 transactions per machine
   - 2-3 cycle reports per machine
   - Helper: `getMachinesByUser`, `getTxByMachine`, `getReportsByMachine`, `computeKpi(machineId)`, `hasMoneyMachineAccess(userId)` (return true cho student-001 và admin, false cho mentor để demo paywall)
4. Tạo `lib/co-may/celebrate.ts` — wrap `canvas-confetti` với `dynamic import`, palette `['#CD9C20', '#C8AA6F', '#3B6C4F', '#F2ECDD']`, export `fireworks()` 3.2s pattern
5. Modify `components/ui/button.tsx` — add `anchor` variant trong cva: `border-2 border-primary bg-primary text-primary-foreground hover:shadow-md hover:-translate-y-0.5`

## Todo List
- [x] Cài `canvas-confetti` + `@types/canvas-confetti`
- [x] Tạo `lib/co-may/types.ts`
- [x] Tạo `lib/co-may/mock-data.ts` với seed-deterministic data
- [x] Tạo `lib/co-may/celebrate.ts`
- [x] Thêm variant `anchor` vào `Button`
- [x] `tsc --noEmit` pass (build chưa run, sẽ chạy ở phase cuối khi có routes)

## Success Criteria
- `npm run build` không lỗi type
- Import test: `import { fireworks } from '@/lib/co-may/celebrate'` chạy không SSR error
- `<Button variant="anchor">` render với gold bg + border + hover translate
- `getMachinesByUser('student-001')` return ≥3 machines, mỗi machine có ≥10 transactions

## Risk Assessment
- `canvas-confetti` có thể conflict với SSR → dùng `dynamic import` trong client-only file, không import top-level.
- Modify `Button` cva có thể break existing usage → chỉ APPEND variant, không sửa default.

## Next Steps
Unblocks: phase 02 (sidebar pattern), phase 03 (layout/paywall) cần access flag từ `hasMoneyMachineAccess`.
