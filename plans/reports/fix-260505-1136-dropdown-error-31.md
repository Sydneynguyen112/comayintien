# Fix Report — Base UI error #31 trên FeatureAccessMenu

## Symptom
Click nút `🛡️ 0/1` trong `/admin/students` → trang trắng + Edge/Chromium hiện browser-level error "This page couldn't load. Reload to try again, or go back."

Reproducible 100% trên Vercel deploy `e93c523` và `0bb0969` (commit fix trước cũng không fix).

## Scout
- File: `rova-lms/components/admin/feature-access-menu.tsx`
- Stack chunk: `_next/static/chunks/0lsha5lglc_1z.js:1:6615`
- Error message minified: `Base UI error #31` → resolved bằng cách đọc bytes around offset 6615 trong chunk:
  ```js
  let{setLabelId:s}=function(){
    let e=o.useContext(eo);
    if(void 0===e) throw Error(formatErrorMessage(31));
    return e
  }()
  ```
- Đây là pattern của `MenuGroupLabel` đọc `MenuGroupContext`.

## Diagnosis
**Hypothesis 1 (RULED OUT):** `<DropdownMenuTrigger render={<Button>}>` double-wrap base-ui ButtonPrimitive context conflict.
- Đã sửa ở commit `0bb0969` — error vẫn fire → KHÔNG phải root cause này.

**Hypothesis 2 (CONFIRMED):** `<DropdownMenuLabel>` rendered without `<DropdownMenuGroup>` parent.
- DropdownMenuLabel = `MenuPrimitive.GroupLabel`
- GroupLabel reads `useContext(MenuGroupContext)`
- Không có Group parent → context = undefined → throw error #31
- Stack trace at chunk offset 6615 match exact pattern.

**Why hypothesis 1 commit didn't help:** That fix only changed Trigger render. CheckboxItems mount only AFTER click → Label trong content cũng mount sau → error fires sau click. Cả 2 hypothesis đều fire post-click → confused timing.

## Patch
File: `rova-lms/components/admin/feature-access-menu.tsx`

Replace `<DropdownMenuLabel>` với plain `<div>` styled identical:
```diff
-<DropdownMenuLabel className="text-xs text-muted-foreground">
+<div className="px-1.5 py-1 text-xs font-medium text-muted-foreground">
   Bật/tắt chức năng cho học viên
-</DropdownMenuLabel>
+</div>
```

Bỏ import `DropdownMenuLabel`.

**Why div, not DropdownMenuGroup wrapper:** Label là decorative text only. Group context không cần thiết cho 1 group đơn (no nested labels, no a11y group benefit). Plain div = ít moving parts.

## Verification
- ✓ `tsc --noEmit` exit 0
- ✓ `npm run build` exit 0 (production build)
- ⏳ Vercel deploy + manual click verify (auto-push policy)

## Regression prevention
Repo không có test framework setup (`hasTests=false`). Document rule trong `docs/aurelian-design-conventions.md` section "Base UI primitive gotchas":
1. `DropdownMenuLabel` cần parent `DropdownMenuGroup` — dùng `<div>` cho label đơn lẻ
2. `<DropdownMenuTrigger render={<Button>}>` conflict — dùng children + className

## Follow-ups
- Khi setup Vitest sau (plan Supabase wiring): viết test render `<FeatureAccessMenu>` + simulate click → assert no console error.
- Cân nhắc thêm dev-only assertion trong wrapper `DropdownMenuLabel` warning khi không có Group parent (custom dev-warning utility).
