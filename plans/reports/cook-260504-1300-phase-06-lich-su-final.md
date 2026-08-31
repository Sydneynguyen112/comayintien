# Cook Report — phase-06-module-lich-su-bao-cao + FINAL MVP

## Phases executed
- [x] phase-06-module-lich-su-bao-cao

## Files modified (phase 06)
**Created (7):**
- `rova-lms/components/co-may/lich-su/csv-export.ts` (28 LOC) — UTF-8 BOM cho Excel
- `rova-lms/components/co-may/lich-su/tx-filters.tsx` (87 LOC) — 3 select + reset
- `rova-lms/components/co-may/lich-su/tx-table.tsx` (115 LOC) — pagination 20/page, type icon
- `rova-lms/components/co-may/lich-su/nhat-ky-tab.tsx` (66 LOC) — orchestrator + CSV button
- `rova-lms/components/co-may/lich-su/report-table.tsx` (115 LOC) — decision badge + per-row CSV
- `rova-lms/components/co-may/lich-su/bao-cao-tab.tsx` (60 LOC)
- `rova-lms/components/co-may/lich-su/lich-su-view.tsx` (88 LOC) — Suspense + URL tab sync

**Overwritten (3 stub pages):**
- `app/(dashboard)/{role}/co-may/lich-su/page.tsx` × 3

## Compile status
✓ `npx tsc --noEmit` exit 0
✓ `npm run build` exit 0 — **PRODUCTION BUILD PASS**

15 co-may routes built successfully:
- `○ /{role}/co-may` (static, redirects)
- `○ /{role}/co-may/{tong-quan|quan-ly|lich-su}` (static)
- `ƒ /{role}/co-may/quan-ly/[id]` (dynamic, server-rendered on demand)

## Existing utilities considered
- `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent` (base-ui) — REUSE-AS-IS với variant `line`
- `useSearchParams` + `useRouter` — REUSE-AS-IS for URL tab sync
- `formatDate` from `lib/utils` — REUSE-AS-IS
- `getMachinesForScope`, `getTxForScope`, `getReportsForScope`, `getUserScope` (phase 04 helpers) — REUSE-AS-IS

---

# 🎉 MVP DELIVERY SUMMARY

## Plan: comay-module-mvp — COMPLETED
**Path:** `c:/Users/Administrator/LMS_ROVA/plans/260504-1045-comay-module-mvp/`
**Duration:** 1 session
**Total phases:** 6 / 6 ✓
**Compile status:** Production build pass

## Files delivered

| Phase | Files |
|---|---|
| 01 — Foundation | 3 new (`lib/co-may/{types,mock-data,celebrate}.ts`) + 1 modify (Button) + canvas-confetti dep |
| 02 — Sidebar | 1 new (`sidebar-nav-config.ts`) + 1 refactor (`Sidebar.tsx`) |
| 03 — Layout/Paywall | 4 new components + 3 layouts + 3 redirects + 9 stub pages = 19 files |
| 04 — Tổng quan | 4 new components + 3 page overwrites + mock-data extension |
| 05 — Quản lý | 9 new components + 3 page overwrites + 3 detail pages + mutation API |
| 06 — Lịch sử | 7 new components + 3 page overwrites |

**Net:** ~50 new files, ~3 modified, ~9 stub pages overwritten with real content.

## What works end-to-end

1. **Login** as student/mentor/admin
2. **Sidebar** shows "Cỗ Máy In Tiền" entry with collapsible 3 sub-items
3. **Access gate**: mock `hasMoneyMachineAccess(userId, role)` deterministic per id
   - User without access → PaywallScreen (gold gradient + CTA)
   - User with access → CoMayShell with role label + sub-nav
4. **Module 1 (Tổng quan)**: 5 KPI cards (2 highlighted gold) + 4-week heatmap matrix + 30-day equity sparkline
5. **Module 2 (Quản lý)**:
   - List: card grid + Create dialog (student only)
   - Detail: anchor card "Hạ neo" gold button + trade input + withdraw modal with **fireworks 🎆 + centered panel** + close cycle dialog (Reset/Scale)
6. **Module 3 (Lịch sử)**: tab Nhật ký + Báo cáo, URL `?tab=` synced, filters, **CSV export** with UTF-8 BOM

## Role-aware data scope (mock)

- **Student**: own machines (deterministic seeded ~3 machines, 50+ tx)
- **Mentor**: aggregate ~3 mentees (`DEMO_MENTEE_BY_MENTOR`)
- **Admin**: aggregate 5 demo students

## Aurelian design adherence

- ✓ Gold tokens `#CD9C20`, `#C8AA6F` — used consistently
- ✓ Profit `#3B6C4F` / Loss `#C03B3B` for trading colors
- ✓ Manrope font (already in LMS layout)
- ✓ Dark + Light mode synced (CSS vars)
- ✓ Button anchor variant `border-2 border-primary bg-primary` với hover translate-y
- ✓ Card style: `rounded-2xl border bg-card`, gold-glow on celebration

**Deviations from spec v5:**
- Button radius `rounded-lg` (LMS standard) thay vì `rounded-full` (spec) — chosen consistency với LMS hiện có
- KHÔNG dùng Prisma/tRPC vì scope mock-only

## Demo flow (cho user test)

```bash
cd c:/Users/Administrator/LMS_ROVA/rova-lms
npm run dev
```

1. Login với account có sẵn (Google OAuth hoặc fallback emails)
2. Sidebar → click "Cỗ Máy In Tiền" → expand
3. Tổng quan: xem KPI grid + matrix + sparkline
4. Quản lý → click vào machine → bấm "Rút tiền" → 🎆
5. Báo cáo & Nhật ký → toggle tab → filter + CSV download

## Defer to next plan (Supabase wiring)

Phase 1 plan `comay-supabase-wiring` (chưa tạo) sẽ:
- Schema `money_machine` (machines, transactions, cycle_reports)
- RLS policies (helper `has_money_machine_access`)
- RPC `close_cycle` (atomic, fix race condition)
- Server Actions thay mock mutations
- Realtime P&L
- Replace `hasMoneyMachineAccess` với real subscription check
- Payment flow + webhook
- Vitest tests

## Phase reports

- [phase-01](cook-260504-1100-phase-01-foundation.md)
- [phase-02](cook-260504-1115-phase-02-sidebar.md)
- [phase-03](cook-260504-1130-phase-03-layout-paywall.md)
- [phase-04](cook-260504-1145-phase-04-tong-quan.md)
- [phase-05](cook-260504-1230-phase-05-quan-ly.md)
- [phase-06 — this report]

## Handoff
**Plan status updated to `completed`.**
Next workflow chain step: `/simplify` → `/review` → `/git` (per workflow-chaining.md, since `hasTests=false` filtered out test step).
