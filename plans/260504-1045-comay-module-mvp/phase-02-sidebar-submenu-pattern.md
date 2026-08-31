# Phase 02 — Sidebar collapsible sub-menu + Cỗ Máy nav entry

## Context Links
- Plan: ../plan.md
- Depends on: phase-01 (cần `hasMoneyMachineAccess` từ `lib/co-may/mock-data.ts`)
- Source: `rova-lms/components/layout/Sidebar.tsx`

## Overview
- Priority: high
- Status: completed
- Est. effort: 3-4h

## Key Insights
- `Sidebar.tsx` (~263 LOC) hiện flat nav per role với `NavItem { href, label, icon, requiresEnrollment? }`.
- Pattern locked-feature đã có (`requiresEnrollment` + `Lock` icon greyed-out) → reuse y hệt cho `requiresMoneyMachineAccess`.
- Active state hiện check `pathname === navItem.href || pathname.startsWith(navItem.href + "/")` → khi expand sub-menu cần refactor logic này.
- Mobile + desktop dùng cùng `NavContent` component → chỉ refactor 1 chỗ.

## Requirements
**Functional:**
- `NavItem` extend với optional `children: NavItem[]` field.
- Khi `children` tồn tại: render parent là button toggle (chevron), expand show children indented 16px.
- Auto-expand parent khi pathname active trên 1 child.
- Click parent toggle expand/collapse, nhưng nếu pathname active trên 1 child thì giữ open.
- Nav entry "Cỗ Máy In Tiền" với 3 children: Tổng quan, Cỗ Máy Chi Tiết, Báo cáo & Nhật ký (đặt trong cả 3 role nav: student/mentor/admin).
- Nếu `!hasMoneyMachineAccess(user.id)` → entry vẫn hiện (để upsell) nhưng có `Lock` icon, click vào dẫn đến paywall page (không lock cứng).

**Non-functional:**
- Backwards-compat: nav item không có `children` render flat như cũ.
- Animate expand/collapse với framer-motion (đã có sẵn).

## Architecture
```
NavItem (extended)
├── href, label, icon (cũ)
├── requiresEnrollment? (cũ)
├── requiresMoneyMachineAccess? (mới)
└── children?: NavItem[] (mới)

Sidebar
├── studentNav   ── + Cỗ Máy entry với 3 children
├── mentorNav    ── + Cỗ Máy entry với 3 children
└── adminNav     ── + Cỗ Máy entry với 3 children
```

Routes target (sẽ tạo ở phase 03):
- `/student/co-may/tong-quan`, `/student/co-may/quan-ly`, `/student/co-may/lich-su`
- Tương tự cho `mentor` và `admin`

## Related Code Files
**Modify:**
- `rova-lms/components/layout/Sidebar.tsx` — extend NavItem type, render logic, add 3 nav entries

**Create:** —

**Delete:** —

## Existing code audit

| File:line | Signature | Fit | Verdict |
|---|---|---|---|
| `Sidebar.tsx:30-35` | `NavItem` interface | 100% | REUSE-EXTEND |
| `Sidebar.tsx:142-172` | nav render loop | 80% | REUSE-EXTEND (recursive) |
| `Sidebar.tsx:79-92` | enrollment check | Pattern only | REUSE-AS-IS (mirror cho moneyMachine) |
| `Sidebar.tsx:148-166` | `Lock` icon greyed | 100% | REUSE-AS-IS |

**Cross-surface duplication:** Nav arrays hiện duplicate 3 lần (student/mentor/admin) — không phải mới do phase này gây ra. Out of scope MVP, ghi chú follow-up.

## Reuse strategy
**REUSE-EXTEND** cho `Sidebar.tsx` — extend `NavItem` interface với `children`, refactor render loop thành recursive component (tách function `renderNavItem(item, depth)`), giữ flat path khi `children == undefined`.

## Implementation Steps
1. Extend `NavItem`:
   ```ts
   interface NavItem {
     href: string;
     label: string;
     icon: React.ElementType;
     requiresEnrollment?: boolean;
     requiresMoneyMachineAccess?: boolean;
     children?: NavItem[];
   }
   ```
2. Extract render thành function `renderNavItem(item, opts: { collapsed, isLocked, ... })` — recursive nếu `children`. Indent depth-1 = `pl-9` (3*ml-3).
3. State `expandedKeys: Set<string>` — auto-add parent key khi pathname match child.
4. Parent button: chevron right/down, click toggle. Active state if any child active.
5. Add `hasMoneyMachineAccess` check in useEffect (mirror pattern `checkEnrollment`):
   ```ts
   const [hasMmAccess, setHasMmAccess] = useState(false);
   useEffect(() => {
     if (!currentUser) return;
     setHasMmAccess(hasMoneyMachineAccess(currentUser.id));
   }, [currentUser]);
   ```
6. Add Cỗ Máy entry vào cả 3 nav arrays với icon `Coins` (lucide):
   ```ts
   {
     href: "/{role}/co-may",   // parent href = paywall fallback
     label: "Cỗ Máy In Tiền",
     icon: Coins,
     requiresMoneyMachineAccess: true,
     children: [
       { href: "/{role}/co-may/tong-quan", label: "Tổng quan", icon: LayoutDashboard },
       { href: "/{role}/co-may/quan-ly",   label: "Cỗ Máy Chi Tiết", icon: Settings },
       { href: "/{role}/co-may/lich-su",   label: "Báo cáo & Nhật ký", icon: FileBarChart },
     ],
   }
   ```
7. Khi `requiresMoneyMachineAccess && !hasMmAccess`: render `Lock` icon, link vẫn click được → dẫn đến paywall (xử lý ở layout phase 03).
8. Animation: framer-motion AnimatePresence cho children, height auto + opacity.

## Todo List
- [x] Extend `NavItem` interface với `children` + `requiresMoneyMachineAccess`
- [x] Refactor render thành `renderNavItem` recursive
- [x] State `expandedKeys` + auto-expand active parent
- [x] Add `hasMmAccess` check (mirror `hasEnrollment`)
- [x] Add Cỗ Máy entry vào studentNav, mentorNav, adminNav (3 children mỗi role)
- [x] Animate expand/collapse với framer-motion (height + opacity, 180ms ease-out)
- [x] Khi collapsed: parent render flat link (children không hiện inline) — tradeoff đơn giản, không thêm popover
- [x] Tách nav config sang `sidebar-nav-config.ts` để Sidebar.tsx focused
- [x] Mobile sheet inherit cùng `NavContent` → render đúng tự động

## Success Criteria
- Run `npm run dev`, login với student-001 (mock has access): sidebar hiện "Cỗ Máy In Tiền" expandable với 3 children, click child → URL update.
- Login với student-002 (mock no access): "Cỗ Máy In Tiền" hiện grey + lock icon.
- Click parent chevron toggle expand/collapse smooth.
- Khi đang ở `/student/co-may/tong-quan`, parent auto-expand và child Tổng quan highlight gold.
- Existing nav (Dashboard, Khoá học, Bài nộp, etc.) không bị regression.

## Risk Assessment
- **Sidebar collapsed mode (icon-only):** Sub-menu sẽ không hiển thị inline → fallback render parent với tooltip; child accessible khi expand sidebar. Document trong code comment.
- **Mobile sheet:** Sub-menu cần test scroll trong sheet height nhỏ. Wrap nav trong `ScrollArea` (đã có ở `components/ui/scroll-area.tsx`).
- **NavItem signature change:** Tất cả callers nội bộ (`adminNav`, `mentorNav`, `studentNav`) — chỉ thêm field optional → no break.

## Next Steps
Unblocks: phase 03 (layout + paywall) — children href dẫn đến routes phase 03 tạo.
