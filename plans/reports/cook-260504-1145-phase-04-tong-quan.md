# Cook Report — phase-04-module-tong-quan-hieu-suat

## Phases executed
- [x] phase-04-module-tong-quan-hieu-suat

## Files modified
**Created (4 components):**
- `rova-lms/components/co-may/tong-quan/kpi-grid.tsx` (75 LOC) — 5 cards với 2 highlighted (Tổng vốn + P&L), profit/loss color, USD formatter
- `rova-lms/components/co-may/tong-quan/performance-matrix.tsx` (122 LOC) — bảng heatmap machines × 4 weeks, cell magnitude scale (3 alpha tiers), sticky machine name col, total col
- `rova-lms/components/co-may/tong-quan/equity-sparkline.tsx` (110 LOC) — SVG inline 30-day cumulative P&L, gold line + area gradient + zero-line dashed
- `rova-lms/components/co-may/tong-quan/tong-quan-view.tsx` (62 LOC) — orchestrator, role-aware via `getUserScope()`, scope label, useMemo cho aggregation

**Modified:**
- `rova-lms/lib/co-may/mock-data.ts` — appended ~75 LOC: `DEMO_USER_IDS`, `DEMO_MENTEE_BY_MENTOR`, `getUserScope`, `getMachinesForScope`, `getTxForScope`, `getReportsForScope`, `computeKpiForScope`

**Overwritten (3 stub pages → real content):**
- `app/(dashboard)/student/co-may/tong-quan/page.tsx` (5 LOC)
- `app/(dashboard)/mentor/co-may/tong-quan/page.tsx` (5 LOC)
- `app/(dashboard)/admin/co-may/tong-quan/page.tsx` (5 LOC)

## Existing utilities considered
- `cn()` from `lib/utils` — REUSE-AS-IS
- `useCurrentUser(fallbackRole)` — REUSE-AS-IS
- `Card`/shadcn primitives — REUSE-AS-IS (mặc dù mình dùng `<div className="bg-card rounded-2xl border ...">` inline cho fine-grained control gold border highlight)
- `lucide-react` icons (Wallet, TrendingUp, Target, TrendingDown, Clock) — REUSE-AS-IS
- `KpiSnapshot`, `Machine`, `MachineTransaction` types từ phase 01 — REUSE-AS-IS

## Shared modules created/updated
- Extended `lib/co-may/mock-data.ts` với scope helpers — sẽ reuse cho phase 05/06.
- 4 component dưới `components/co-may/tong-quan/` — domain-specific cho module 1, không reuse cross-module.

## Compile status
✓ `npx tsc --noEmit` exit 0

## Smoke checks
- ✓ Typecheck clean
- Visual smoke chưa làm — cần `npm run dev` + login student/mentor/admin để verify scope khác nhau.

## Behavior summary

**Student view (`/student/co-may/tong-quan`):**
- Scope = chỉ user.id của student
- KPI: total từ ~3 cỗ máy của student
- Matrix: rows = các cỗ máy student có
- Sparkline: equity từ trades của student

**Mentor view (`/mentor/co-may/tong-quan`):**
- Scope = `DEMO_MENTEE_BY_MENTOR[mentor.id] ?? top 3 students`
- KPI: aggregate từ machines của ~3 mentees
- Matrix: rows = tất cả cỗ máy của mentees (10-12 rows)
- Sparkline: cumulative P&L từ tất cả trades của mentees

**Admin view (`/admin/co-may/tong-quan`):**
- Scope = `DEMO_USER_IDS` (5 students seed)
- KPI/Matrix/Sparkline = aggregate full demo cohort

## Color tokens used
- Profit: `#3B6C4F` (light) / `#5C9C75` (dark) — match spec v5
- Loss: `#C03B3B` (light) / `#E06464` (dark)
- Gold line: `#CD9C20` direct hex
- Card border highlight: `border-primary/40`

Một số chỗ dùng hex direct vì cần fine alpha control trong matrix cell (`bg-[#3B6C4F]/40`). Tradeoff: nếu user đổi tokens, manual update hex. Acceptable cho MVP.

## Deviations from plan
**1. KPI grid không dùng `Card` shadcn primitive**
- Lý do: cần custom border (gold cho highlighted card), custom rounded-2xl. Card shadcn có `gap-6 py-6` cố định không phù hợp dense KPI grid.
- Implement: `<div>` inline với `bg-card rounded-2xl p-4 border`. ~10 LOC tiết kiệm.

**2. Matrix dùng raw HTML table thay shadcn Table**
- Lý do: cần sticky-left col + cell-level coloring. Table primitive shadcn workflow không thân thiện với cell-level styling.
- Implement: native `<table>` với Tailwind classes.

**3. Aggregate cho mentor/admin chỉ scope ~3-5 users (mock)**
- Hardcode trong `DEMO_USER_IDS` + `DEMO_MENTEE_BY_MENTOR`. Không reach out Supabase profiles table.
- Khi wire backend, replace `getUserScope` với Supabase query `profiles where mentor_id = ?` hoặc full list.

## Visual milestone

```
Login student-001 → /student/co-may/tong-quan →
- Header gold gradient với role label "Cỗ máy của bạn"
- Sub-text "1 tài khoản • 3 cỗ máy" (số chính xác varies theo seed)
- KPI grid: 5 cards, 2 highlighted gold border (Tổng vốn, P&L)
  - P&L card có color profit (xanh) hoặc loss (đỏ) tuỳ seed
- Performance matrix: bảng 3-4 hàng × 5 cột (W-3, W-2, W-1, W, Tổng)
  - Cell có pnl: bg green/red gradient theo magnitude
  - Cell rỗng: dash trong muted bg
- Equity sparkline: SVG card, gold line + area, hiện cumulative P&L bên phải
```

## Follow-ups
- Tooltip hover cho matrix cells (show absolute amount + machine + week range)
- Empty state đẹp hơn khi user mới chưa có trade
- Filter machine multi-select để lọc matrix
- Time-period toggle (7/30/90/365 days) cho sparkline

## Handoff context for next skill
**Next phases (parallel ok):** 05 (Quản lý) và 06 (Lịch sử) — đều có thể overwrite các stub page tương ứng.
**Helpers ready:** `getUserScope`, `getMachinesForScope`, `getTxForScope`, `getReportsForScope`, `computeKpiForScope` đều dùng được.
