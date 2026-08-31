# Phase 06 — Module: Báo cáo & Nhật ký (Lịch sử)

## Context Links
- Plan: ../plan.md
- Depends on: phase-03 (layout)
- Spec: rova-lms/cursor-prompt-v5-supabase-aurelian.md → "Module 3"

## Overview
- Priority: high
- Status: completed
- Est. effort: 3-4h

## Key Insights
- Hai sub-tab nội bộ: "Nhật ký" (transactions) + "Báo cáo" (cycle reports). Default = Nhật ký.
- Đây là tab nesting thứ 2 (sau sub-nav 3 module ở phase 03) — visual cần phân biệt rõ: sub-nav module dùng underline gold; tab phụ ở đây dùng pill style hoặc thinner underline.
- Filter: machine select + date range + tx type (cho Nhật ký); decision (Reset/Scale) + date range (cho Báo cáo).
- Export PDF/CSV: defer hoặc làm CSV-only (download Blob, không cần lib). PDF defer.
- Role-aware: student own data, mentor mentees data, admin all (cùng pattern phase 04/05).

## Requirements
**Functional:**
- Page wrapper với 2 tab phụ (Nhật ký active default).
- "Nhật ký" tab:
  - Filter row: select machine, date range (last 7/30/90/all), select tx type
  - Bảng: Date | Machine | Type icon | Amount (color profit/loss) | Note
  - Pagination 20/page (client-side)
  - Empty state
- "Báo cáo" tab:
  - Bảng: Period (start_date - end_date) | Machine | Decision badge | P&L | Withdrawn | Action "Tải CSV"
  - CSV export per row (transactions của cycle đó)
- Sticky header, scroll-x mobile

**Non-functional:**
- Tabs sync URL với search param `?tab=nhat-ky|bao-cao` (Next 16 useSearchParams)
- CSV blob: tạo client-side, không cần API

## Architecture
```
app/(dashboard)/{role}/co-may/lich-su/page.tsx     ← role wrapper

components/co-may/lich-su/
├── lich-su-view.tsx              ← role-aware, owns tabs state
├── nhat-ky-tab.tsx               ← transactions list + filters
├── bao-cao-tab.tsx               ← cycle reports list
├── tx-filters.tsx                ← machine/date/type selects
├── tx-table.tsx                  ← table render
├── report-table.tsx              ← table render
└── csv-export.ts                 ← util Blob CSV download
```

## Related Code Files
**Modify:** —

**Create:**
- `rova-lms/app/(dashboard)/student/co-may/lich-su/page.tsx`
- `rova-lms/app/(dashboard)/mentor/co-may/lich-su/page.tsx`
- `rova-lms/app/(dashboard)/admin/co-may/lich-su/page.tsx`
- `rova-lms/components/co-may/lich-su/lich-su-view.tsx`
- `rova-lms/components/co-may/lich-su/nhat-ky-tab.tsx`
- `rova-lms/components/co-may/lich-su/bao-cao-tab.tsx`
- `rova-lms/components/co-may/lich-su/tx-filters.tsx`
- `rova-lms/components/co-may/lich-su/tx-table.tsx`
- `rova-lms/components/co-may/lich-su/report-table.tsx`
- `rova-lms/components/co-may/lich-su/csv-export.ts`

## Existing code audit

| File:line | Signature | Fit | Verdict |
|---|---|---|---|
| `components/ui/tabs.tsx` | shadcn Tabs (pill style) | 80% | REUSE-AS-IS (đủ cho tab phụ, khác sub-nav module dùng underline) |
| `components/ui/table.tsx` | shadcn Table | 100% | REUSE-AS-IS |
| `lib/utils.ts` `formatPrice` | currency format | 100% | REUSE-AS-IS |

**Cross-surface duplication:** 3 role pages wrapper — handled qua `<LichSuView />` shared.

## Reuse strategy
**REUSE-AS-IS** shadcn Tabs + Table primitives. **EXTRACT-SHARED** logic ở `<LichSuView />`. CSV utility custom (FORK-NEW, cần 15 LOC).

## Implementation Steps
1. `csv-export.ts`:
   ```ts
   export function downloadCsv(filename: string, rows: Record<string, unknown>[]) {
     if (!rows.length) return;
     const headers = Object.keys(rows[0]);
     const csv = [
       headers.join(','),
       ...rows.map(r => headers.map(h => JSON.stringify(r[h] ?? '')).join(','))
     ].join('\n');
     const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
     const url = URL.createObjectURL(blob);
     const a = document.createElement('a');
     a.href = url; a.download = filename; a.click();
     URL.revokeObjectURL(url);
   }
   ```
2. `lich-su-view.tsx`: Client Component, `{ role, userId }`. Tabs với value sync `useSearchParams` → useRouter.replace khi change. Default 'nhat-ky'.
3. `tx-filters.tsx`: 3 select (Machine, Date range, Type) + reset button. Lift state up to parent.
4. `tx-table.tsx`: shadcn Table với cột Date | Machine | Type | Amount | Note. Type icon màu (green/red/gold). Amount color theo profit/loss. Pagination footer 20/page.
5. `nhat-ky-tab.tsx`: orchestrator — filter + table. Fetch transactions theo role (mirror logic phase 04/05) + apply filters.
6. `report-table.tsx`: cột Period | Machine | Decision (badge) | P&L | Withdrawn | "📥 CSV" button. Click button → fetch transactions của cycle đó (filter `created_at` between report.start_date và report.end_date) → downloadCsv.
7. `bao-cao-tab.tsx`: orchestrator cho reports.
8. 3 role page wrapper.

## Todo List
- [x] `csv-export.ts` util với UTF-8 BOM cho Excel hiểu Vietnamese
- [x] `tx-filters.tsx` (machine + date range + type + reset button)
- [x] `tx-table.tsx` với pagination 20/page
- [x] `nhat-ky-tab.tsx` orchestrator với CSV export filtered
- [x] `report-table.tsx` + per-row CSV button (export tx của cycle đó)
- [x] `bao-cao-tab.tsx` với filter machine + decision
- [x] `lich-su-view.tsx` với Suspense + URL `?tab=` sync
- [x] 3 role pages overwrite stub
- [x] `tsc --noEmit` pass
- [x] `npm run build` pass — production build clean

## Success Criteria
- Tab default Nhật ký, click "Báo cáo" → URL `?tab=bao-cao`, refresh giữ tab.
- Filter machine + tx type cho Nhật ký lọc đúng.
- Báo cáo row có button CSV → click download file `.csv` mở được trong Excel với headers Vietnamese OK.
- Mentor + admin: filter có thêm "Học viên" select để xem cross-user.

## Risk Assessment
- **CSV với UTF-8 Vietnamese** — cần BOM đầu file để Excel hiểu encoding. Add `'﻿'` prefix.
- **shadcn Tabs trigger styling vs sub-nav module** — verify visual khác biệt đủ rõ (sub-nav underline gold vs tab phụ pill bg).
- **`useSearchParams` cần Suspense boundary trong Next 16 App Router** — wrap `<LichSuView />` trong `<Suspense>` ở page.tsx.

## Next Steps
Last phase. Sau khi xong, project MVP done. Plan kế tiếp: phase Supabase wiring (schema + RLS + replace mock).
