# Phase 04 — Module: Tổng quan & Hiệu suất

## Context Links
- Plan: ../plan.md
- Depends on: phase-03 (layout + sub-nav)
- Spec: rova-lms/cursor-prompt-v5-supabase-aurelian.md → "Module 1"

## Overview
- Priority: high
- Status: completed
- Est. effort: 4-5h

## Key Insights
- Đây là **trang đầu tiên** user thấy khi vào Cỗ Máy → cần ấn tượng + đủ thông tin trong 1 viewport.
- KPI cards reuse style từ `student/page.tsx` (đã có pattern grid 6 col gold accent).
- Matrix hiệu suất = bảng cross-tab machine × tuần với cell màu profit/loss.
- Charts: dùng SVG inline đơn giản (sparkline) → không cần thêm dep recharts.
- Role-aware:
  - **student**: chỉ thấy machines của mình
  - **mentor**: thấy aggregate của mentees (`users.where(mentor_id == currentUser.id)`)
  - **admin**: thấy all users aggregate

## Requirements
**Functional:**
- 5 KPI card top: Tổng vốn, P&L (period), Win rate, Drawdown, Days active
  - Days active = `(now - cycle_started_at ?? created_at) / day` lấy từ machine cũ nhất
  - Card thứ nhất + thứ hai (vốn, P&L) highlight với gold border
- Performance matrix: bảng dạng heatmap, hàng = machine name, cột = tuần (4 tuần gần nhất), cell = pnl hoặc rỗng
- 1 sparkline chart equity curve (SVG inline)
- Empty state khi user chưa có machine nào (student fresh)

**Non-functional:**
- Server Component fetch initial data (mock fn không async, ok); Client wrapper cho interactive (hover tooltip)
- Responsive: grid 2 col mobile, 3 col tablet, 5 col desktop cho KPI

## Architecture
```
app/(dashboard)/{role}/co-may/tong-quan/page.tsx   ← Server Component
└── <TongQuanView role={role} userId={...} />     ← Client (cho interactivity)
    ├── <KpiGrid />
    ├── <PerformanceMatrix />
    └── <EquitySparkline />

components/co-may/tong-quan/
├── kpi-grid.tsx
├── performance-matrix.tsx
└── equity-sparkline.tsx
```

3 role page chỉ là wrapper 5-LOC, share logic ở `<TongQuanView />`.

## Related Code Files
**Modify:** —

**Create:**
- `rova-lms/app/(dashboard)/student/co-may/tong-quan/page.tsx`
- `rova-lms/app/(dashboard)/mentor/co-may/tong-quan/page.tsx`
- `rova-lms/app/(dashboard)/admin/co-may/tong-quan/page.tsx`
- `rova-lms/components/co-may/tong-quan/tong-quan-view.tsx`
- `rova-lms/components/co-may/tong-quan/kpi-grid.tsx`
- `rova-lms/components/co-may/tong-quan/performance-matrix.tsx`
- `rova-lms/components/co-may/tong-quan/equity-sparkline.tsx`

**Delete:** —

## Existing code audit

| File:line | Signature | Fit | Verdict |
|---|---|---|---|
| `student/page.tsx:316-372` | KPI cards 6-col grid | 90% | REUSE-EXTEND (copy structure, swap fields) |
| `components/ui/card.tsx` | Card primitives | 100% | REUSE-AS-IS |
| `lib/co-may/mock-data.ts` `computeKpi` | KPI calculator | 100% | REUSE-AS-IS |

**Cross-surface duplication:** 3 role pages duplicate → giải quyết qua `<TongQuanView />` shared.

## Reuse strategy
**REUSE-EXTEND** cho KPI grid pattern từ student dashboard. **EXTRACT-SHARED** cho `<TongQuanView />` để 3 role page không duplicate.

## Implementation Steps
1. `tong-quan-view.tsx` — Client Component, props `{ role, userId }`:
   - useEffect fetch machines + transactions theo role:
     - student: `getMachinesByUser(userId)`
     - mentor: machines của tất cả mentees
     - admin: tất cả machines
   - Compute aggregate KPIs với `computeKpi`
2. `kpi-grid.tsx`:
   - 5 cards trong grid `grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4`
   - Card "Tổng vốn" + "P&L" border-2 border-primary/40 (highlight)
   - 3 card còn lại border default
   - Mỗi card: icon (`Wallet`, `TrendingUp`, `Target`, `TrendingDown`, `Clock`) trong rounded-lg bg-primary/10, value text-2xl font-bold, label text-xs muted
   - P&L color: green nếu > 0 (`text-profit` = `#3B6C4F`), red nếu < 0 (`text-loss` = `#C03B3B`)
3. `performance-matrix.tsx`:
   - Bảng html: cột "Cỗ máy" + 4 cột tuần (W-3, W-2, W-1, W)
   - Cell pnl: bg gradient theo magnitude (`bg-profit/[opacity]` cho positive, `bg-loss/[opacity]` cho negative)
   - Cell empty: dash
   - Header sticky, scroll-x mobile
4. `equity-sparkline.tsx`:
   - SVG inline 200x60, polyline từ cumulative P&L theo ngày (30 ngày)
   - stroke `#CD9C20` (gold), fill gradient bên dưới `#CD9C20/20`
5. Mỗi role page (`{role}/co-may/tong-quan/page.tsx`):
   ```tsx
   "use client";
   import { TongQuanView } from "@/components/co-may/tong-quan/tong-quan-view";
   import { useCurrentUser } from "@/lib/auth";
   export default function Page() {
     const u = useCurrentUser('student');
     if (!u) return null;
     return <TongQuanView role="student" userId={u.id} />;
   }
   ```

## Todo List
- [x] Tạo `tong-quan-view.tsx` với role-aware data fetch
- [x] Tạo `kpi-grid.tsx` 5 cards (Tổng vốn, P&L, Win rate, Drawdown, Days active)
- [x] Tạo `performance-matrix.tsx` heatmap bảng W-3..W với cell magnitude opacity
- [x] Tạo `equity-sparkline.tsx` SVG inline 30 ngày, gold line + area gradient
- [x] Overwrite 3 stub pages (student/mentor/admin)
- [x] Empty state khi 0 machines (matrix + sparkline đều có)
- [x] Extend `mock-data.ts` với `getUserScope`, `getMachinesForScope`, `computeKpiForScope`
- [x] `tsc --noEmit` pass

## Success Criteria
- Vào `/student/co-may/tong-quan` thấy 5 KPI cards + matrix + sparkline với mock data deterministic.
- Mentor thấy aggregate KPI từ mentees (verify số khác student).
- Admin thấy tổng all users.
- Empty state hiển thị khi user không có machine.
- Layout không vỡ ở mobile (375px).

## Risk Assessment
- **Mock aggregate cho mentor cần `users[]` có `mentor_id`** — đã có trong `lib/mock-data.ts`. Verify trước khi cook.
- **SVG sparkline cần normalize range** — handle case all-zero (return flat line).

## Next Steps
Unblocks: nothing (parallel với 05, 06). Sau khi 3 module xong, project-level done.
