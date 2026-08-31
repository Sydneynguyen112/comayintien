# Code review — comay-module-mvp

## Scope

- Plan: `plans/260504-1045-comay-module-mvp/`
- Files reviewed: ~25 (lib + components + pages + sidebar refactor)
- Stack: Next 16 App Router, React 19, TS, Tailwind v4, base-ui, mock data
- Build: clean (`npm run build` exit 0; `tsc --noEmit` exit 0)

## Stage 1 — Spec compliance

| Phase | Todo items shipped | Spec divergence |
|---|---|---|
| 01 — Foundation | 6/6 ✓ | Button uses `rounded-lg` instead of spec v5 `rounded-full` — **documented in cook report**, accepted (consistency với LMS hiện có). |
| 02 — Sidebar submenu | 9/9 ✓ | None |
| 03 — Layout + Paywall | 9/9 ✓ | Layout client-side check thay server-side (spec gợi ý server). **Trade off documented**, but **resulted in P0 race window** (see Stage 2). |
| 04 — Tổng quan | 8/8 ✓ | None |
| 05 — Quản lý | 12/12 ✓ | **AnchorCard "Hạ neo" cho phép tăng anchor** — vi phạm intent kỷ luật của spec ("anchor only goes down"). Caught as P1 #5. |
| 06 — Lịch sử | 10/10 ✓ | None |

**Stage 1 verdict:** PASS với 2 divergence — 1 đã pre-document (button radius), 1 lỗi mới (anchor monotonic) cần fix ở Stage 2.

## Verdict

**Ship with fixes** — 1 P0 (paywall race window leaks data before access resolves) + 4 P1 worth fixing now. Architecture and TS are clean; mutation API needs ownership guards before Supabase wire happens.

---

## P0 — Critical (block merge)

### 1. Paywall race: detail page renders BEFORE access check completes

Files:
- app/(dashboard)/student/co-may/layout.tsx:17-22
- app/(dashboard)/mentor/co-may/layout.tsx:17-22
- app/(dashboard)/admin/co-may/layout.tsx (same shape)

The layout gates with useEffect → setAccess. For one paint cycle access === null → renders "Đang tải...". The access check is **synchronous-pure** (mulberry32 hash, no async, no IO), but is hidden behind a useState+useEffect dance that:

1. Forces a guaranteed null-render window on every mount.
2. While the layout is in null-state, the child page mounts in parallel; its useMemo reads getMachineById synchronously. With React concurrent rendering this means data-read happens during the access-loading window — defense-in-depth fail.
3. Same for tong-quan-view.tsx / lich-su-view.tsx — they all execute their data-fetching useMemo regardless of layout loading state.

**Fix:** Compute access synchronously since it has no async dependencies.

```diff
-const [access, setAccess] = useState<boolean | null>(null);
-useEffect(() => {
-  if (!user) return;
-  setAccess(hasMoneyMachineAccess(user.id, user.role));
-}, [user]);
-if (!user || access === null) return <Loading/>;
-if (!access) return <PaywallScreen />;
+if (!user) return <Loading/>;
+const access = hasMoneyMachineAccess(user.id, user.role);
+if (!access) return <PaywallScreen />;
```

Apply to all 3 layouts. **Defense-in-depth:** also gate MachineDetailView on hasMoneyMachineAccess so future Supabase wiring cannot regress the gate.


---

## P1 — High (fix this PR)

### 2. Mock CRUD has zero ownership validation

File: lib/co-may/mock-data.ts:211-228, 186-200

```ts
export function recordTransaction(userId, machineId, input) {
  const data = getDataFor(userId);
  const tx = { ...input, machine_id: machineId, user_id: userId };
  data.tx.unshift(tx);
  return tx;
}
```

updateMachine checks findIndex (returns null on miss) — OK. But recordTransaction blindly accepts any (userId, machineId) pair and shoves a tx into that user tx list. Combined with MachineDetailView resolvedOwner resolution via URL ?owner=, a buggy caller could silently corrupt state.

**Fix:** Add ownership guard at API boundary — same shape Supabase RLS will enforce later.

```ts
if (!data.machines.some(m => m.id === machineId)) {
  throw new Error("Machine not owned by user");
}
```

Apply to recordTransaction + updateMachine + deleteMachine. Lifts to a real guard for free at Supabase migration.

---

### 3. CSV formula injection on user-controlled note

File: components/co-may/lich-su/csv-export.ts:5-10

Current escape only handles quote/comma/newline. Misses leading =, +, -, @ for Excel formula injection. The note field flows from TradeInput where note is free user text. CSV opened in Excel/Sheets can execute =cmd|/c calc!A0 style payloads. Same applies if a machine name starts with =.

**Fix:**

```ts
function escapeCsv(value: unknown): string {
  if (value === null || value === undefined) return "";
  let s = String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  if (/[",\n\r]/.test(s)) return `"` + s.replace(/"/g, `""`) + `"`;
  return s;
}
```

---

### 4. Withdraw modal — double-fire + setTimeout leak

File: components/co-may/quan-ly/withdraw-modal.tsx:47-65

Two issues:

(a) **No submit guard.** Spam-click "Rút" before setOpen(false) closes the dialog → multiple recordTransaction calls + multiple fireworks() bursts. Easy repro on slow devices.

(b) **setTimeout leak.** If component unmounts (route change) inside the 3200ms FIREWORK_DURATION, the setCelebrating(null) fires on unmounted component → React warning + memory hold.

**Fix:** add submitting state + useRef for timeoutId + cleanup effect; disabled={submitting} on submit button.

---

### 5. AnchorCard "Hạ neo" silently allows raising the anchor

File: components/co-may/quan-ly/anchor-card.tsx:30-42

UI label says "Hạ neo xuống mức mới" (lower the anchor) — the entire kỷ luật value-prop is **anchor-only-goes-down**. But handleSet only validates newAnchor > 0. User can type a higher anchor and bypass kỷ luật, defeating the product central mechanic.

**Fix:** add `if (newAnchor >= machine.current_anchor) { setError(...); return; }`. AnchorCard currently has no error state — add one. Or rename label to "Đặt anchor mới" if business actually wants both directions — clarify with PO.


---

## P2 — Medium

### 6. KPI/equity sort runs on every call

tong-quan-view.tsx:26-35 wraps the call in useMemo, good. But computeKpiForScope itself does [...trades].sort() (mock-data.ts:419) on every call — fine at 150 items, flag for >5k. When wired to Supabase, push KPI to a SQL view or RPC, not the client.

### 7. expandedKeys set never shrinks (Sidebar.tsx:55-60)

Effect *merges* but never prunes. Navigating across many parents accumulates keys forever in component state. Cheap fix: filter prev against current items before merging next.

### 8. eslint-disable masks real issue

lich-su-view.tsx:34 disables exhaustive-deps. Real fix: drop the `if (next !== tab)` comparison entirely — setState already bails if value is identical:

```diff
useEffect(() => {
  const next = sp.get("tab") === "bao-cao" ? "bao-cao" : "nhat-ky";
-  if (next !== tab) setTab(next);
-  // eslint-disable-next-line react-hooks/exhaustive-deps
+  setTab(next);
}, [sp]);
```

### 9. AnchorCard initial draft value is bizarre

anchor-card.tsx:28 — useState(String(Math.max(machine.capital, machine.current_anchor - 200))). Mixing capital and anchor as initial draft makes no sense; user expects current anchor as starting point. Use String(machine.current_anchor).

---

## P3 — Low / defer

### 10. Mock cache "race" — not a real race in single-threaded JS

mock-data.ts:138-154. JS is single-threaded; module-level Map mutation across consumers is sequential. Stale-data risk is purely from React render timing — already mitigated by tick re-render counter pattern. **No action**, but document this assumption breaks under Supabase concurrent writes.

### 11. Sidebar recursion has no depth limit

Sidebar.tsx:111-189 recurses on item.children. Nav config is hand-coded in sidebar-nav-config.ts (depth 2 max), no cycle possible. Add `if (depth > 5) return null;` only if config ever becomes user-editable.

### 12. TypeScript strictness — clean

No any, no unsafe as casts. `as typeof decision` (bao-cao-tab.tsx:45) and `as DateRange` (tx-filters.tsx:65) are appropriate enum narrowings.

### 13. z-[60] on celebration overlay vs sidebar (z-50)

withdraw-modal.tsx:128 uses z-[60]. Sidebar mobile drawer is z-50 (Sidebar.tsx:291). No conflict in current setup, but **document the z-index ladder** before more overlays land.

---

## What is done well

- Deterministic mulberry32 + FNV hash for stable mock data per userId — clean reproducibility
- getUserScope correctly scopes student to [user.id] only — student CANNOT spy other students even with URL tampering: candidate-iteration in MachineDetailView (scope.includes(ownerId) + fallback [user.id, ...scope]) cleanly filters cross-user IDs because mock IDs embed the userId
- Strong TS shape — Machine, MachineTransaction, CycleReport map 1:1 to expected Supabase schema
- readOnly flag on MachineDetailView correctly hides mutation UIs for mentor/admin viewing mentee data
- fireworks() properly guards `typeof window === "undefined"` for SSR safety
- Sidebar refactor pulls nav config to dedicated file; isItemActive separates root-exact vs prefix matching cleanly
- CSV export handles UTF-8 BOM correctly for Excel/Vietnamese
- useMemo + tick re-render pattern is sensible for mock; will translate cleanly to SWR/React Query later
- Paywall screen design is on-brand (gold), no obvious a11y issues

---

## Action items (priority order)

1. **P0:** Make hasMoneyMachineAccess synchronous in all 3 layouts — kill the null-render window. Also gate MachineDetailView for defense-in-depth.
2. **P1:** Add ownership guards in recordTransaction / updateMachine / deleteMachine.
3. **P1:** Fix CSV formula-injection on leading =+-@.
4. **P1:** Withdraw modal — submit lock + setTimeout cleanup on unmount + disabled on submit button.
5. **P1:** AnchorCard — enforce monotonic-decrease (or rename label) + add error state.
6. **P2:** Sidebar expandedKeys pruning, fix lich-su-view deps lint, AnchorCard initial draft.
7. **P3:** Document z-index ladder + mock-vs-real concurrency assumption.

## Unresolved questions

- **Q1:** Is "Hạ neo" intended to be strictly monotonic-decrease, or can business require both directions? Affects P1 #5 fix shape.
- **Q2:** Should mock CRUD throw on ownership mismatch (matches RLS denial) or silently no-op (matches current updateMachine style)? Pick one and standardize.
- **Q3:** Pre-Supabase, do we want to surface "machine not found" vs "permission denied" differently? Current code conflates both into "Không tìm thấy hoặc không có quyền" — fine for UX, but logging will need to distinguish for Supabase debugging.

## Knowledge capture

User accepted all 3 candidates:
- **Saved → memory** (`project_anchor-monotonic-rule.md`): Cỗ Máy anchor monotonic-decrease là kỷ luật mechanic. AnchorCard phải validate `< current`. Q1 above resolves: business intent confirmed monotonic, P1 #5 fix shape là enforce, không rename.
- **Saved → memory** (`feedback_mock-to-rls-ownership-guard.md`): Mock mutation luôn validate ownership tại boundary, throw same shape error mà Supabase RLS sẽ throw. Resolves Q2: standardize on throw.
- **Saved → docs** (`docs/aurelian-design-conventions.md`): Button radius `rounded-lg` (không `rounded-full`), Aurelian palette tokens, profit/loss inline hex, z-index ladder.
