---
title: comay-module-mvp
status: completed
mode: fast
scope: hold
priority: high
effort: 1-2 days
created: 2026-05-04
completed: 2026-05-04
blockedBy: []
blocks: []
---

# Cỗ Máy In Tiền — MVP UI Integration vào LMS ROVA

Tích hợp module "Cỗ Máy In Tiền" (`comayintien.vercel.app`) vào LMS dưới dạng premium add-on với 3 mục con. Đợt này build UI shell + mock data, defer Supabase backend / payment / realtime sang plan riêng.

## Goal
Sau khi cook xong: user (student/mentor/admin) thấy "Cỗ Máy In Tiền" trong sidebar (collapsible) với 3 sub-item, click vào mỗi item render được trang đúng UI Aurelian + dữ liệu mock + paywall hiện đẹp khi user chưa "mua".

## Non-goals
- Supabase schema `money_machine` (defer)
- Real subscription check / payment flow (mock flag thôi)
- Realtime P&L qua Supabase channel (defer)
- Vitest tests (defer phase sau)
- Migrate logic Prisma từ `rova-co-may/` repo gốc (chỉ port spec, không port code)

## Phases

| #  | Name                              | Status    | Depends on | Owner     |
|----|-----------------------------------|-----------|------------|-----------|
| 01 | foundation-tokens-mock-utils      | completed | —          | developer |
| 02 | sidebar-submenu-pattern           | completed | 01         | developer |
| 03 | comay-layout-paywall              | completed | 02         | developer |
| 04 | module-tong-quan-hieu-suat        | completed | 03         | developer |
| 05 | module-quan-ly-co-may             | completed | 03         | developer |
| 06 | module-lich-su-bao-cao            | completed | 03         | developer |

Phases 04/05/06 chạy parallel sau 03.

## Dependencies
- Đã có sẵn trong `rova-lms/`: Next 16, Tailwind v4, shadcn/ui, framer-motion, next-themes, Manrope, Aurelian tokens, Supabase client (cho courses/enrollments)
- Cần install mới: `canvas-confetti` + `@types/canvas-confetti` (phase 01)

## Risks & mitigations
- **Sidebar refactor có thể break các role nav hiện tại** → Phase 02 chỉ extend `NavItem` interface với optional `children`, fallback render flat khi không có children (backwards-compat).
- **Mock data không đủ realistic** → dùng deterministic seed theo `currentUser.id` để mỗi user thấy data ổn định khi reload.
- **Paywall trong dashboard layout dễ leak protected route** → check `hasMoneyMachineAccess` flag ở layout, không phải ở từng page.

## Rollback
Tất cả file mới tạo nằm dưới `rova-lms/app/(dashboard)/{role}/co-may/` + `rova-lms/components/co-may/` + `rova-lms/lib/co-may/`. Rollback = xoá các thư mục này + revert `Sidebar.tsx` + revert `lib/mock-data.ts` patches.

## Tech stack reference
- Frontend patterns: see `/frontend-development` + `/react-best-practices` skills khi cook.
- Aurelian design verify: phase 01 confirm tokens, không refactor tokens.

## Spec source of truth
- `rova-lms/cursor-prompt-v5-supabase-aurelian.md` — full spec (DB + UI + 10 bước)
- `plans/reports/research-260504-1045-comayintien-ia.md` — IA + screenshot từ live site
- `plans/reports/comayintien-screenshots/` — 12 PNG (desktop + mobile) for visual reference
