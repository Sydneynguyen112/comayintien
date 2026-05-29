"use client";

import { useEffect, useState } from "react";
import { Check, Pencil, Sparkles, Target, TrendingDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/co-may/currency";
import type { CurrencyUnit } from "@/lib/co-may/types";

interface Props {
  milestones: number[];
  /** Mốc neo hiện tại (machine.current_anchor) — user-chosen, có thể khác milestone exact. */
  currentAnchor: number;
  balance: number;
  /** Đơn vị hiển thị của cỗ máy (USD mặc định / USC tài khoản cent). */
  unit?: CurrencyUnit;
  /** Lưu mảng milestone mới sau khi user chỉnh. */
  onEditMilestones?: (next: number[]) => void;
  onEdit?: () => void;
  /** Mở WithdrawDialog với amount + target anchor. */
  onWithdraw?: (amount: number, toAnchor: number) => void;
  /** Rút trực tiếp + nâng neo lên mốc cao hơn — không qua dialog (kỷ luật chốt nhanh). */
  onLiftAnchor?: (amount: number, toAnchor: number) => void;
  /** Hạ neo về newAnchor (= balance khi user chấp nhận lỗ). */
  onLowerAnchor?: (newAnchor: number) => void;
  /** User chọn giữ vốn (không rút) — trigger khích lệ kỷ luật. */
  onHold?: (overflow: number, targetAnchor: number) => void;
  readOnly?: boolean;
  /** Số lệnh trade — mỗi lệnh mới sẽ reset dismiss state để panel rút luôn xuất hiện. */
  tradeCount?: number;
  /** Key persist dismiss state (vd: machineId) — để dismiss survive reload. */
  persistKey?: string;
}

export function MachineAnchorStrip({
  milestones,
  currentAnchor,
  balance,
  unit,
  onEdit,
  onEditMilestones,
  onWithdraw,
  onLiftAnchor,
  onLowerAnchor,
  onHold,
  readOnly,
  tradeCount,
  persistKey,
}: Props) {
  const fmt = (n: number) => formatMoney(n, unit);
  // Mỗi lệnh = 1 hành động. Sau khi user rút / hạ neo / giữ vốn → ẩn panel cho tới lệnh tiếp theo.
  // Persist tradeCount lúc dismiss vào localStorage để survive reload.
  const storageKey = persistKey ? `co-may-anchor-dismiss-${persistKey}` : null;
  const [dismissed, setDismissedRaw] = useState(false);

  // Edit mode for milestones
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<string[]>([]);
  function startEdit() {
    setDraft(sorted.map((m) => String(m)));
    setEditing(true);
  }
  function cancelEdit() {
    setEditing(false);
    setDraft([]);
  }
  function saveEdit() {
    const nums = draft.map((s) => Number(s)).filter((n) => Number.isFinite(n) && n > 0);
    if (nums.length === 0) return;
    nums.sort((a, b) => b - a);
    onEditMilestones?.(nums);
    setEditing(false);
    setDraft([]);
  }

  // Single source of truth: dismiss state hydrate từ localStorage theo tradeCount.
  // - Mount: nếu storage[key] === tradeCount → đã dismiss phiên này → ẩn.
  // - tradeCount thay đổi (lệnh mới) → storage stale → reset = false (panel hiện lại).
  useEffect(() => {
    if (typeof window === "undefined" || !storageKey || tradeCount === undefined) {
      setDismissedRaw(false);
      return;
    }
    const stored = window.localStorage.getItem(storageKey);
    if (stored !== null && Number(stored) === tradeCount) {
      setDismissedRaw(true);
    } else {
      setDismissedRaw(false);
      if (stored !== null) window.localStorage.removeItem(storageKey);
    }
  }, [tradeCount, storageKey]);

  function setDismissed(value: boolean) {
    setDismissedRaw(value);
    if (typeof window !== "undefined" && storageKey && tradeCount !== undefined) {
      if (value) {
        window.localStorage.setItem(storageKey, String(tradeCount));
      } else {
        window.localStorage.removeItem(storageKey);
      }
    }
  }

  const sorted = milestones && milestones.length > 0 ? [...milestones].sort((a, b) => b - a) : [];
  const hasMilestones = sorted.length > 0;

  // Index của milestone == currentAnchor (hoặc closest ≤ nếu user nhập custom)
  let currentIdx = -1;
  let prevMilestone: number | null = null;
  let nextLowerMilestone: number | null = null;
  if (hasMilestones) {
    currentIdx = sorted.findIndex((m) => m === currentAnchor);
    if (currentIdx === -1) currentIdx = sorted.findIndex((m) => m <= currentAnchor);
    if (currentIdx === -1) currentIdx = sorted.length - 1;
    // Mốc cũ = milestone CAO HƠN current liền kề
    prevMilestone = currentIdx > 0 ? sorted[currentIdx - 1] : null;
    // Mốc dưới = milestone THẤP HƠN current liền kề (dùng khi balance lọt giữa current và mốc dưới)
    nextLowerMilestone = currentIdx + 1 < sorted.length ? sorted[currentIdx + 1] : null;
  }

  const overflowCurrent = balance - currentAnchor;
  const overflowPrev = prevMilestone !== null ? balance - prevMilestone : 0;
  const underflow = currentAnchor - balance;
  // Có thể rút về mốc dưới nếu balance vẫn cao hơn nó
  const canWithdrawToLower = nextLowerMilestone !== null && balance > nextLowerMilestone;
  const withdrawToLowerAmount = canWithdrawToLower && nextLowerMilestone !== null ? balance - nextLowerMilestone : 0;

  const showPanel = !readOnly && !dismissed && overflowCurrent > 0;
  const showLossPanel = !readOnly && !dismissed && underflow > 0;

  // Wrap action handlers — set dismissed=true sau mỗi lần user act
  function actAndDismiss<T extends unknown[]>(fn?: (...args: T) => void) {
    return (...args: T) => {
      fn?.(...args);
      setDismissed(true);
    };
  }
  const actWithdraw = actAndDismiss(onWithdraw);
  const actLiftAnchor = actAndDismiss(onLiftAnchor);
  // onLowerAnchor KHÔNG wrap dismiss — sau khi hạ neo, panel chuyển sang overflow để user chọn rút.

  return (
    <section className="rounded-2xl border border-border bg-card p-5 space-y-4">
      <header className="flex items-center justify-between">
        <h3 className="text-lg md:text-xl font-bold text-foreground">Mốc neo</h3>
        {!readOnly && (onEdit || onEditMilestones) && !editing && (
          <button
            type="button"
            onClick={onEditMilestones ? startEdit : onEdit}
            className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-[11px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <Pencil className="h-3 w-3" />
            Chỉnh
          </button>
        )}
        {editing && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={cancelEdit}
              className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1 text-[11px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <X className="h-3 w-3" />
              Huỷ
            </button>
            <button
              type="button"
              onClick={saveEdit}
              className="inline-flex items-center gap-1 rounded-md bg-primary hover:bg-primary/90 text-white px-2.5 py-1 text-[11px] font-bold uppercase tracking-widest transition-colors"
            >
              <Check className="h-3 w-3" />
              Lưu
            </button>
          </div>
        )}
      </header>

      {showLossPanel && !showPanel && (
        <div className="rounded-2xl border-2 border-dashed border-primary/50 bg-primary/8 p-4 space-y-3">
          <div className="text-center space-y-1.5">
            <div className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              Số dư hiện tại dưới mốc neo
            </div>
            <div className="text-base md:text-lg italic text-foreground leading-snug">
              Có thể hạ neo xuống{" "}
              <span className="font-bold not-italic tabular-nums">
                {fmt(canWithdrawToLower && nextLowerMilestone !== null ? nextLowerMilestone : balance)}
              </span>
            </div>
          </div>

          <p className="text-xs italic text-muted-foreground/90 leading-relaxed text-center px-2">
            Việc hạ neo không ảnh hưởng đến số dư hiện tại. Sau khi hạ neo, doanh chủ có thể chọn
            rút tiền hằng ngày, rút tiền về neo hoặc giữ vốn để quay về mốc.
          </p>

          <button
            type="button"
            onClick={() =>
              onLowerAnchor?.(
                canWithdrawToLower && nextLowerMilestone !== null ? nextLowerMilestone : balance,
              )
            }
            className="w-full rounded-xl bg-primary hover:bg-primary/90 text-white py-3 text-sm font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
          >
            <TrendingDown className="h-4 w-4" />
            Hạ neo xuống{" "}
            {fmt(
              canWithdrawToLower && nextLowerMilestone !== null ? nextLowerMilestone : balance,
            )}
          </button>
        </div>
      )}

      {showPanel && (
        <div className="rounded-2xl border-2 border-[#3B6C4F]/40 bg-[#3B6C4F]/8 p-4 space-y-3">
          <div className="text-center space-y-1">
            <div className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              Số dư hiện tại trên mốc neo
            </div>
            <div className="text-3xl md:text-4xl font-bold text-[#3B6C4F] dark:text-[#5C9C75] tabular-nums leading-none">
              +{fmt(overflowCurrent)}
            </div>
          </div>

          {/* Case B: balance vượt mốc trên → NÂNG NEO là primary, các nút rút khác = dashed */}
          {prevMilestone !== null && overflowPrev > 0 ? (
            <>
              <button
                type="button"
                onClick={() => actLiftAnchor(overflowPrev, prevMilestone)}
                className="w-full rounded-xl bg-primary hover:bg-primary/90 text-white py-3 text-sm font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
              >
                <Sparkles className="h-4 w-4" />
                Rút {fmt(overflowPrev)} về mốc {fmt(prevMilestone)} · NÂNG NEO ↑
              </button>
              <button
                type="button"
                onClick={() => actWithdraw(0, currentAnchor)}
                className="w-full rounded-xl border-2 border-dashed border-[#3B6C4F]/40 hover:border-[#3B6C4F]/70 hover:bg-[#3B6C4F]/8 py-3 text-sm font-bold uppercase tracking-widest text-[#3B6C4F] dark:text-[#5C9C75] transition-colors flex items-center justify-center gap-2"
              >
                <Sparkles className="h-4 w-4" />
                Rút tiền hằng ngày
              </button>
              <button
                type="button"
                onClick={() => actWithdraw(overflowCurrent, currentAnchor)}
                className="w-full rounded-xl border-2 border-dashed border-[#3B6C4F]/40 hover:border-[#3B6C4F]/70 hover:bg-[#3B6C4F]/8 py-3 text-sm font-bold uppercase tracking-widest text-[#3B6C4F] dark:text-[#5C9C75] transition-colors flex items-center justify-center gap-2"
              >
                <Sparkles className="h-4 w-4" />
                Rút {fmt(overflowCurrent)} về mốc {fmt(currentAnchor)}
              </button>
            </>
          ) : prevMilestone === null ? (
            /* Case A1: anchor đang ở mốc cao nhất (= vốn gốc) → chỉ rút phần dư về mốc, không có rút hằng ngày / giữ vốn */
            <button
              type="button"
              onClick={() => actWithdraw(overflowCurrent, currentAnchor)}
              className="w-full rounded-xl bg-[#3B6C4F] hover:bg-[#2F5840] text-white py-3 text-sm font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
            >
              <Sparkles className="h-4 w-4" />
              Rút {fmt(overflowCurrent)} về mốc {fmt(currentAnchor)}
            </button>
          ) : (
            <>
              {/* Case A2: anchor ở mốc giữa, balance chưa vượt mốc trên → rút hằng ngày là primary */}
              <button
                type="button"
                onClick={() => actWithdraw(0, currentAnchor)}
                className="w-full rounded-xl bg-[#3B6C4F] hover:bg-[#2F5840] text-white py-3 text-sm font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
              >
                <Sparkles className="h-4 w-4" />
                Rút tiền hằng ngày
              </button>
              <button
                type="button"
                onClick={() => actWithdraw(overflowCurrent, currentAnchor)}
                className="w-full rounded-xl border-2 border-dashed border-[#3B6C4F]/40 hover:border-[#3B6C4F]/70 hover:bg-[#3B6C4F]/8 py-3 text-sm font-bold uppercase tracking-widest text-[#3B6C4F] dark:text-[#5C9C75] transition-colors flex items-center justify-center gap-2"
              >
                <Sparkles className="h-4 w-4" />
                Rút {fmt(overflowCurrent)} về mốc {fmt(currentAnchor)}
              </button>
              <button
                type="button"
                onClick={() => {
                  onHold?.(overflowCurrent, prevMilestone);
                  setDismissed(true);
                }}
                className="w-full rounded-xl border-2 border-dashed border-border hover:border-foreground/40 hover:bg-muted/50 py-2 text-xs font-bold uppercase tracking-widest text-muted-foreground transition-colors"
              >
                <Target className="h-3.5 w-3.5 inline mr-1.5" />
                Giữ vốn — quay về mốc {fmt(prevMilestone)}
              </button>
            </>
          )}
        </div>
      )}

      {!hasMilestones && (
        <div className="rounded-xl border border-dashed border-border bg-muted/20 px-4 py-3 text-xs text-muted-foreground italic">
          Cỗ máy này chưa có mốc neo cấu hình. Bấm <strong className="text-foreground">Chỉnh</strong> để thêm
          5 mốc neo theo công thức (M1 = vốn gốc, M2..5 = 80% mốc trước).
        </div>
      )}

      {hasMilestones && !editing && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {sorted.map((m, i) => {
            const isCurrent = i === currentIdx;
            const isAbove = i < currentIdx;
            const isBelow = i > currentIdx;
            const isReachable = isAbove && balance >= m;
            const stateLabel = isCurrent
              ? "Hiện tại"
              : isReachable
                ? "Vượt mốc"
                : isAbove
                  ? "Chưa đến"
                  : "Đã chạm";

            return (
              <div
                key={i}
                className={cn(
                  "rounded-xl border-2 p-3 text-center transition-colors",
                  isCurrent
                    ? "border-[#3B6C4F] bg-[#3B6C4F]/15 text-foreground"
                    : isReachable
                      ? "border-[#3B6C4F]/50 bg-[#3B6C4F]/5 text-foreground"
                      : isBelow
                        ? "border-border bg-muted/30 text-foreground/70"
                        : "border-border/60 bg-card text-muted-foreground/70",
                )}
              >
                <div
                  className={cn(
                    "text-[11px] font-bold uppercase tracking-widest mb-1",
                    isCurrent || isReachable ? "text-[#5C9C75]" : "text-muted-foreground",
                  )}
                >
                  M{i + 1}
                </div>
                <div className="text-lg md:text-xl font-bold tabular-nums">{fmt(m)}</div>
                <div className="text-[10px] uppercase tracking-widest mt-1 opacity-70 font-semibold">
                  {stateLabel}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {editing && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {draft.map((v, i) => (
            <div
              key={i}
              className="rounded-xl border-2 border-primary/40 bg-primary/5 p-3 text-center"
            >
              <div className="text-[11px] font-bold uppercase tracking-widest mb-1 text-primary">
                M{i + 1}
              </div>
              <input
                type="number"
                value={v}
                onChange={(e) =>
                  setDraft((d) => d.map((x, j) => (j === i ? e.target.value : x)))
                }
                className="w-full rounded-md border border-input bg-card px-2 py-1.5 text-center text-lg font-bold tabular-nums focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 outline-none"
              />
            </div>
          ))}
        </div>
      )}

      <div className="rounded-lg border-l-4 border-primary bg-primary/5 px-3 py-2">
        <p className="text-xs md:text-sm italic text-foreground/80 leading-relaxed">
          Vận hành ổn định, rút phần dư trên mốc neo.
        </p>
      </div>
    </section>
  );
}
