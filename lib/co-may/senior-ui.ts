// Senior-friendly UI helpers cho Cỗ Máy module.
// Áp dụng khi role = "student" (target audience u40-60). Admin/mentor giữ dense view.
//
// Triết lý: bump font-size, tap target, contrast — không đổi layout/structure.

export type Role = "student" | "mentor" | "admin";

export function isSeniorMode(role: Role | string | null | undefined): boolean {
  return role === "student";
}

/** Cycle helper — return một trong 2 class strings tuỳ flag. */
function pick<S, D>(senior: boolean, seniorVal: S, defaultVal: D): S | D {
  return senior ? seniorVal : defaultVal;
}

export const seniorCx = {
  // KPI cards
  kpiValue: (s: boolean) =>
    pick(s, "text-3xl md:text-4xl font-bold leading-tight", "text-xl md:text-2xl font-bold leading-tight"),
  kpiLabel: (s: boolean) =>
    pick(s, "text-sm font-medium text-foreground/80", "text-xs text-muted-foreground"),
  kpiHint: (s: boolean) =>
    pick(s, "text-xs text-muted-foreground", "text-[11px] text-muted-foreground/70"),
  kpiCardPad: (s: boolean) => pick(s, "p-5 md:p-6", "p-4"),
  kpiIconBox: (s: boolean) => pick(s, "h-10 w-10 rounded-xl", "h-8 w-8 rounded-lg"),
  kpiIconSize: (s: boolean) => pick(s, 20, 16),

  // Tables / lists
  rowPadY: (s: boolean) => pick(s, "py-3.5", "py-2"),
  rowText: (s: boolean) => pick(s, "text-base", "text-sm"),
  thText: (s: boolean) => pick(s, "text-xs uppercase tracking-wider", "text-[11px] uppercase tracking-wider"),

  // Inputs / forms
  inputClass: (s: boolean) => pick(s, "h-11 text-base", ""),
  // Button size override (size prop value)
  btnSize: (s: boolean): "sm" | "default" | "lg" => pick(s, "default", "sm"),
  btnPrimarySize: (s: boolean): "default" | "lg" => pick(s, "lg", "default"),

  // Sub-nav tabs
  tabClass: (s: boolean) => pick(s, "px-5 py-4 text-base", "px-4 py-3 text-sm"),

  // Card / section
  cardPad: (s: boolean) => pick(s, "p-6", "p-5"),
  sectionGap: (s: boolean) => pick(s, "space-y-6", "space-y-5"),

  // Header (CoMayShell)
  pageTitle: (s: boolean) =>
    pick(s, "text-3xl md:text-4xl font-bold", "text-2xl md:text-3xl font-bold"),
  pageSubtitle: (s: boolean) =>
    pick(s, "text-base text-muted-foreground", "text-sm text-muted-foreground"),

  // Help text inline (replace tooltip pattern for senior — always visible)
  helpInline: (s: boolean) =>
    pick(s, "text-sm text-muted-foreground leading-relaxed", "text-xs text-muted-foreground"),
};
