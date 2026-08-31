# Cook Report — phase-05-module-quan-ly-co-may

## Phases executed
- [x] phase-05-module-quan-ly-co-may

## Files modified
**Created (9 components):**
- `rova-lms/components/co-may/quan-ly/machine-card.tsx` (78 LOC)
- `rova-lms/components/co-may/quan-ly/create-machine-dialog.tsx` (110 LOC)
- `rova-lms/components/co-may/quan-ly/quan-ly-list-view.tsx` (78 LOC)
- `rova-lms/components/co-may/quan-ly/anchor-card.tsx` (87 LOC)
- `rova-lms/components/co-may/quan-ly/trade-input.tsx` (84 LOC)
- `rova-lms/components/co-may/quan-ly/withdraw-modal.tsx` (134 LOC) — fireworks integration here
- `rova-lms/components/co-may/quan-ly/close-cycle-dialog.tsx` (90 LOC)
- `rova-lms/components/co-may/quan-ly/transaction-list.tsx` (88 LOC)
- `rova-lms/components/co-may/quan-ly/machine-detail-view.tsx` (118 LOC) — orchestrator

**Created (3 detail pages):**
- `app/(dashboard)/{role}/co-may/quan-ly/[id]/page.tsx` × 3 (each ~12 LOC, uses Next 16 `use(params)` Promise pattern)

**Overwritten (3 list pages):**
- `app/(dashboard)/{role}/co-may/quan-ly/page.tsx` × 3 (each 5 LOC)

**Modified:**
- `rova-lms/lib/co-may/mock-data.ts` — appended ~120 LOC: `addMachine`, `updateMachine`, `deleteMachine`, `recordTransaction`, `closeCycleMock`, helper `nextId`. Also added `CycleDecision` to imports (TS error fix).

## Existing utilities considered
- `Dialog` (base-ui Dialog wrapper) — REUSE-AS-IS, used in 3 components (create, withdraw, close-cycle)
- `Input`, `Button` (variant `anchor`), `Badge` — REUSE-AS-IS
- `framer-motion` AnimatePresence — REUSE-AS-IS for celebration panel
- `fireworks()` from phase 01 celebrate.ts — REUSE-AS-IS
- `formatRelativeTime` from `lib/utils` — REUSE-AS-IS in transaction-list

## Shared modules created/updated
**EXTRACT-SHARED:** All 9 components live in `components/co-may/quan-ly/` shared folder. 3 role list pages + 3 detail pages are thin wrappers.

## Compile status
✓ `npx tsc --noEmit` exit 0 (after fixing missing `CycleDecision` import in mock-data.ts)

## Smoke checks
- ✓ Typecheck clean
- ✓ Mutation API isolated to mock-data.ts (no global state leak)
- Visual smoke: cần `npm run dev` + manual test:
  - Student: create machine → appear in list → click into detail → record trade win/loss → record withdraw → fireworks fire + centered panel auto-close 3.2s → close cycle (Reset hoặc Scale) → days_active reset
  - Mentor: vào list thấy mentees machines, không có nút Create. Click detail → read-only banner hiện, no Trade/Withdraw/Close-Cycle actions.
  - Admin: vào list thấy all demo users machines, no Create.

## Behavior summary

**Anchor card:**
- Hiển thị `current_anchor` lớn (gold-gradient-text)
- Button "Hạ neo xuống mức mới" variant `anchor` (gold)
- Click → expand inline form: input anchor mới + Xác nhận / Huỷ
- Submit → updateMachine + recordTransaction(type='anchor_change', amount=delta) + refresh
- readOnly: ẩn nút

**Trade input:**
- 2 button toggle (Win xanh / Loss đỏ) + amount + note
- Submit → recordTransaction với amount sign correctly (loss = negative)

**Withdraw modal:**
- Validate: amount > 0 và ≤ current_anchor (kỷ luật: không rút quá anchor)
- Submit → recordTransaction(type='withdraw', amount=-a) + dialog close + fireworks() + centered floating panel "Rút thành công $X"
- Panel: bg-card border-2 border-primary rounded-3xl gold-glow, animate-in spring 0.4s
- Auto unmount sau `FIREWORK_DURATION` (3.2s)

**Close cycle dialog:**
- 2 button: Reset (neutral border) / Scale (gold, disabled khi pnl ≤ 0)
- Scale logic: capital += pnl, anchor += max(0, pnl)
- Reset: chỉ reset cycle_started_at
- Cả 2 đều tạo cycle_report record với decision tương ứng + meta cycle_started_at mới

## Color tokens used
- Profit/loss inline hex: `#3B6C4F` (profit) / `#C03B3B` (loss) với dark variants
- Gold: tokens (`text-primary`, `bg-primary`, `border-primary`)
- Gold gradient classes: `gold-gradient-text`, `gold-glow`

## Deviations from plan
**1. Detail page dùng Next 16 Promise params**
- Trong Next 16 App Router, `params` là Promise. Phải dùng `use(params)` từ React 19.
- Pattern: `const { id } = use(params);` thay cho cũ `params.id`.

**2. ownerId qua query string (?owner=)**
- Mentor/admin xem machines của user khác → không thể derive ownerId từ URL path. Pass qua `?owner=u-student-001` query string.
- Detail view fall back: nếu owner missing hoặc invalid, scan toàn bộ scope tìm machine match → resolve owner.
- Tradeoff: URL hơi xấu, nhưng work cho cả 3 role.

**3. Mock CRUD không có Toast notification**
- Spec gợi ý sonner, mình defer (phase 05 risk note). Hiện tại UI feedback qua state refresh + form reset. Acceptable cho MVP.
- Follow-up: thêm sonner trong phase Supabase wiring.

**4. Refresh pattern dùng tick state**
- `setTick(n => n+1)` để re-evaluate `useMemo`/`useEffect` sau mutation.
- Đơn giản hơn invalidate cache (không có tanstack query). Phù hợp mock data.

## Visual milestone

```
Login student-001 → /student/co-may/quan-ly →
- Header "Cỗ Máy Chi Tiết" + "X cỗ máy" + button "Tạo cỗ máy mới" (gold)
- Grid 3 col machine cards với status badge + 3 KPI (Anchor / P&L / Days)
- Click "Tạo cỗ máy mới" → dialog form → submit → list update
- Click card → /student/co-may/quan-ly/[id]?owner=...
  - Header với back link
  - Anchor card to lớn gold gradient với button "Hạ neo"
  - Bên trái: Transaction list 10 latest
  - Bên phải: Trade input + Action card (Withdraw + Close cycle)
  - Click Withdraw → dialog → submit → 🎆 fireworks + centered panel "Rút thành công $X"
  - Click Close cycle → dialog 2 button Reset/Scale → submit → cycle_started_at reset
```

## Follow-ups
- Toast notifications (sonner) khi create/update/withdraw thành công
- Edit machine name/capital (không có trong UI hiện tại, chỉ có anchor edit)
- Pause/Resume machine status toggle
- Confirmation dialog cho delete machine
- Tooltip + keyboard shortcuts cho power users

## Handoff context for next skill
**Next phase:** phase-06-module-lich-su-bao-cao (parallel với 05, không depend)
**Mutation API ready:** `addMachine`, `updateMachine`, `deleteMachine`, `recordTransaction`, `closeCycleMock` đều available cho phase 06 nếu cần.
