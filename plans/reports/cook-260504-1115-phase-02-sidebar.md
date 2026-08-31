# Cook Report — phase-02-sidebar-submenu-pattern

## Phases executed
- [x] phase-02-sidebar-submenu-pattern

## Files modified
**Created:**
- `rova-lms/components/layout/sidebar-nav-config.ts` (98 LOC) — NavItem type + 3 nav arrays + `getNavConfig()` helper. Tách ra để giữ Sidebar.tsx <300 LOC.

**Modified:**
- `rova-lms/components/layout/Sidebar.tsx` (263 → 281 LOC, net +18). Refactor:
  - Import `NavItem`, nav arrays, `getNavConfig` từ sibling config file
  - Add `hasMmAccess` state + useEffect dùng `hasMoneyMachineAccess(userId, role)` từ phase 01
  - Add `expandedKeys: Set<string>` + auto-expand effect khi pathname active trên branch
  - Refactor render loop thành `renderNavItem(item, depth)` recursive
  - Animate expand/collapse với `framer-motion` (height + opacity 180ms ease-out)
  - Khi `collapsed=true`, parent render như flat link (children chỉ hiện khi expand sidebar)

## Existing utilities considered
- `Lock` icon pattern (`requiresEnrollment`) — REUSE-AS-IS, mirror cho `requiresMoneyMachineAccess`
- `framer-motion` AnimatePresence — REUSE-AS-IS, dùng cho expand animation
- `useCurrentUser(fallbackRole)` — REUSE-AS-IS, lấy `role` field cho mock access check
- `cn()` từ `lib/utils` — REUSE-AS-IS

## Shared modules created/updated
None — phase 02 purely extends existing Sidebar.

## Compile status
✓ `npx tsc --noEmit` exit 0

## Smoke checks
- ✓ Typecheck clean với recursive `renderNavItem` + `Set<string>` state
- ✓ NavItem icon type `LucideIcon` import work (replaced ad-hoc `React.ElementType`)
- Visual smoke: cần `next dev` + manual click — defer cho phase 03 khi có route đích cho sub-items.

## Deviations from plan
**1. Collapsed sidebar không render sub-menu inline**
- Spec phase 02 đề xuất "popover hoặc skip render children khi collapsed"
- Implement: chọn skip render children khi collapsed → parent click → vẫn navigate đến `/{role}/co-may` (sẽ redirect đến tong-quan ở phase 03). Đơn giản, ít code, UX vẫn OK.
- Tradeoff: user collapsed sidebar không xem được 3 sub-item trực tiếp, phải expand sidebar hoặc vào parent rồi dùng top sub-nav.

**2. Tách `sidebar-nav-config.ts`**
- Không có trong todo gốc nhưng cần để Sidebar.tsx <300 LOC (project rule >200 split). Giảm Sidebar.tsx khỏi tăng vọt sau khi thêm logic.

## Behavior summary
- Pathname `/student/co-may/tong-quan` → branch "Cỗ Máy In Tiền" auto-expand, child Tổng quan highlight gold.
- User KHÔNG có access (hasMmAccess=false): nav entry hiện grey với Lock icon. Click vẫn dẫn đến `/{role}/co-may` (paywall sẽ render ở phase 03).
- User có enrollment lock + co-may lock đồng thời: enrollment lock thắng (cursor-default, không click được), Lock icon hiện.

## Follow-ups
- Khi sidebar collapsed (icon-only mode), thêm tooltip hover hiện 3 sub-item — defer.
- Pin "Cỗ Máy" cao hơn trong nav (hiện đặt giữa) nếu user feedback cần — defer.

## Handoff context for next skill
**Next phase:** phase-03-comay-layout-paywall.md — sẽ tạo routes `/student|mentor|admin/co-may/{tong-quan,quan-ly,lich-su}`. Sau khi phase 03 xong, sidebar sub-menu mới có URL đích để click thử.
