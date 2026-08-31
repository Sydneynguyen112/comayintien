# Phase 05 — Module: Cỗ Máy Chi Tiết (Quản lý)

## Context Links
- Plan: ../plan.md
- Depends on: phase-03 (layout), phase-01 (celebrate.ts)
- Spec: rova-lms/cursor-prompt-v5-supabase-aurelian.md → "Module 2"

## Overview
- Priority: high
- Status: completed
- Est. effort: 5-6h

## Key Insights
- 2 view: list (card grid) + detail (`/co-may/quan-ly/[id]`).
- Detail page là phần "đặc sản" của Cỗ Máy: anchor card + trade input + withdraw modal với fireworks (UX signature từ handoff gốc).
- CRUD machine: tạo/sửa/xoá/kích hoạt-tạm dừng. Mock = mutate in-memory map; reload reset → đó là acceptable cho MVP.
- Close cycle: dialog 2-decision (Reset / Scale), ghi 1 cycle_report mới.
- Role-aware:
  - **student**: thấy + CRUD machines của mình
  - **mentor**: read-only view machines của mentees (không create/edit)
  - **admin**: read-only view all + có thể disable bất kỳ machine

## Requirements
**Functional:**
- List view: card grid 1/2/3 col, mỗi card: name, capital, anchor hiện tại, status badge (Active/Paused), pnl since cycle, "Days active" badge.
- "Tạo cỗ máy mới" button (chỉ student) → dialog form (name, capital, anchor).
- Detail page khi click card:
  - Anchor card: hiển thị anchor hiện tại, button "Hạ neo xuống $X" variant `anchor` (gold)
  - Trade input: form quick add transaction (type win/loss + amount + note)
  - Withdraw modal: input amount, submit → fireworks() + centered success panel auto-close 3.2s
  - Close cycle dialog: 2 button "Reset" / "Scale", confirm → tạo report + reset cycle_started_at
  - Transaction list 10 mới nhất

**Non-functional:**
- Mutations đều dùng React state local (mock); show optimistic toast với `sonner` (chưa cài → cài thêm hoặc dùng `console.log`).
- Decision: **không cài sonner đợt này** — dùng inline alert đơn giản. Sonner để wire sau cùng Supabase.

## Architecture
```
app/(dashboard)/{role}/co-may/quan-ly/page.tsx       ← list
app/(dashboard)/{role}/co-may/quan-ly/[id]/page.tsx  ← detail

components/co-may/quan-ly/
├── quan-ly-list-view.tsx           ← role-aware list, card grid + create dialog
├── machine-card.tsx                 ← single card
├── create-machine-dialog.tsx        ← form dialog (student only)
├── machine-detail-view.tsx          ← detail layout
├── anchor-card.tsx                  ← anchor display + "Hạ neo" button
├── trade-input.tsx                  ← quick add tx
├── withdraw-modal.tsx               ← withdraw + fireworks
├── close-cycle-dialog.tsx           ← Reset/Scale decision
└── transaction-list.tsx             ← 10 latest
```

## Related Code Files
**Modify:** —

**Create:**
- `rova-lms/app/(dashboard)/student/co-may/quan-ly/page.tsx`
- `rova-lms/app/(dashboard)/student/co-may/quan-ly/[id]/page.tsx`
- `rova-lms/app/(dashboard)/mentor/co-may/quan-ly/page.tsx`
- `rova-lms/app/(dashboard)/mentor/co-may/quan-ly/[id]/page.tsx`
- `rova-lms/app/(dashboard)/admin/co-may/quan-ly/page.tsx`
- `rova-lms/app/(dashboard)/admin/co-may/quan-ly/[id]/page.tsx`
- `rova-lms/components/co-may/quan-ly/quan-ly-list-view.tsx`
- `rova-lms/components/co-may/quan-ly/machine-card.tsx`
- `rova-lms/components/co-may/quan-ly/create-machine-dialog.tsx`
- `rova-lms/components/co-may/quan-ly/machine-detail-view.tsx`
- `rova-lms/components/co-may/quan-ly/anchor-card.tsx`
- `rova-lms/components/co-may/quan-ly/trade-input.tsx`
- `rova-lms/components/co-may/quan-ly/withdraw-modal.tsx`
- `rova-lms/components/co-may/quan-ly/close-cycle-dialog.tsx`
- `rova-lms/components/co-may/quan-ly/transaction-list.tsx`

(15 files — 6 là wrapper 5-LOC; effective code = 9 components.)

⚠️ **NOTE:** Phase này có nhiều file. Acceptable vì mỗi component <100 LOC, focused, có boundary rõ. Nếu cook thấy quá nặng → split thành phase 5a (list) + 5b (detail) khi execute.

## Existing code audit

| File:line | Signature | Fit | Verdict |
|---|---|---|---|
| `components/ui/dialog.tsx` | shadcn Dialog | 100% | REUSE-AS-IS |
| `components/ui/input.tsx` | shadcn Input | 100% | REUSE-AS-IS |
| `components/ui/badge.tsx` | shadcn Badge | 100% | REUSE-AS-IS |
| `lib/co-may/celebrate.ts` `fireworks` | celebration | 100% | REUSE-AS-IS |
| `Button` variant `anchor` | gold "Hạ neo" | 100% | REUSE-AS-IS (phase 01 đã thêm) |

**Cross-surface duplication:** 3 role layouts wrapper → handled qua shared component.

## Reuse strategy
**REUSE-AS-IS** primitives shadcn. **EXTRACT-SHARED** components ở `components/co-may/quan-ly/` để 3 role page không duplicate.

## Implementation Steps
1. `machine-card.tsx`: Card với name (lg semibold), capital (text-muted), anchor + pnl row (gold + green/red), status badge, click → navigate `/{role}/co-may/quan-ly/${id}`.
2. `create-machine-dialog.tsx`: Dialog với form (name, capital, anchor), submit → push vào local mock array (in-memory mutation).
3. `quan-ly-list-view.tsx`: Props `{ role, userId }`. Fetch machines theo role (mirror phase 04). Render grid + create button cho student. Mentor/admin: read-only badge "Xem mentee" / "Xem all" + filter dropdown by user.
4. `anchor-card.tsx`: Card riêng top detail page, hiển thị `current_anchor` lớn (text-3xl gold), bên dưới button `<Button variant="anchor">Hạ neo xuống ${suggestedAnchor}</Button>`. Click → open prompt input.
5. `trade-input.tsx`: Inline form select type (win/loss) + amount + note → button "Ghi nhận giao dịch".
6. `withdraw-modal.tsx`: Dialog input amount, button "Rút tiền". On submit:
   - mutate balance
   - close dialog
   - import('@/lib/co-may/celebrate').then(m => m.fireworks())
   - show centered floating panel "Rút thành công $X 🎉" (fixed position, z-50)
   - setTimeout(() => removePanel(), 3200)
7. `close-cycle-dialog.tsx`: Dialog 2 button:
   - "🔄 Reset" — neutral, reset cycle_started_at, anchor giữ nguyên
   - "📈 Scale" — primary, reset + tăng capital theo pnl
   - Tạo cycle_report record
8. `transaction-list.tsx`: List 10 mới nhất, mỗi row: type icon (🟢 win, 🔴 loss, 💰 withdraw), amount, note, date relative.
9. `machine-detail-view.tsx`: layout grid 2 col desktop, stack mobile. Top: anchor-card. Left: trade-input + transaction-list. Right: actions (withdraw, close cycle button → mở modal/dialog).
10. 6 role page wrappers — pattern đồng nhất.

## Todo List
- [x] machine-card.tsx (status badge + KPI grid 3 col)
- [x] create-machine-dialog.tsx (form: name, capital, anchor)
- [x] quan-ly-list-view.tsx (role-aware, scope label, create button student-only)
- [x] anchor-card.tsx (gold gradient + "Hạ neo" anchor variant button + edit inline)
- [x] trade-input.tsx (toggle win/loss + amount + note)
- [x] withdraw-modal.tsx + fireworks integration (centered panel auto-close 3.2s)
- [x] close-cycle-dialog.tsx (2 button Reset / Scale, Scale disabled khi pnl ≤ 0)
- [x] transaction-list.tsx (10 latest, type icon + tone)
- [x] machine-detail-view.tsx (orchestrator + readOnly logic + back link)
- [x] Mutation API in mock-data.ts: addMachine, updateMachine, deleteMachine, recordTransaction, closeCycleMock
- [x] 6 role page wrappers (3 list overwrite + 3 detail [id]/page.tsx new)
- [x] `tsc --noEmit` pass

## Success Criteria
- Student: tạo machine mới → xuất hiện trong list. Click vào → detail. Trade win/loss → balance update. Withdraw $100 → fireworks + panel "Rút thành công" auto close 3.2s.
- Close cycle Reset → cycle_started_at = now, days_active counter về 0 ngay tức thì.
- Close cycle Scale → capital tăng theo pnl, anchor tăng tương ứng (theo formula spec v5: anchor mới = anchor cũ + pnl).
- Mentor vào `/mentor/co-may/quan-ly` → thấy machines của mentees, KHÔNG có nút create/edit.
- Admin vào → thấy all users, có filter dropdown.

## Risk Assessment
- **Mutate in-memory mock array → reload mất state**. Acceptable cho MVP. Nếu user demo nhiều, chuyển sang `localStorage` hoặc Zustand persist. Defer follow-up.
- **Fireworks SSR** — `celebrate.ts` đã guard với dynamic import (phase 01); verify lại trước cook.
- **Phase nặng (15 files)** — nếu cook bí, split 5a (list view + create) + 5b (detail + actions).

## Next Steps
Last in chain (parallel với 04 và 06).
