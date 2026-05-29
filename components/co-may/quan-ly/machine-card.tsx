"use client";

import Link from "next/link";
import { Sparkles, TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Machine, MachineTransaction } from "@/lib/co-may/types";
import { formatMoney } from "@/lib/co-may/currency";

const DAY_MS = 86400_000;

const SIGNAL_LABEL: Record<string, string> = {
  self: "Tự sản xuất",
  imported: "Nhập tín hiệu",
  both: "Cả hai",
};

export function MachineCard({
  machine,
  tx,
  detailHref,
}: {
  machine: Machine;
  tx: MachineTransaction[];
  detailHref: string;
  role?: string | null;
}) {
  const fmt = (n: number) => formatMoney(n, machine.currency_unit);
  const cycleStart = new Date(machine.cycle_started_at ?? machine.created_at).getTime();
  const trades = tx.filter((t) => t.type === "trade_win" || t.type === "trade_loss");
  const pnl = trades.reduce((s, t) => s + t.amount, 0);
  const withdrawnAbs = -tx
    .filter((t) => t.type === "withdraw")
    .reduce((s, t) => s + t.amount, 0);
  const balance = machine.capital + pnl - withdrawnAbs;
  const days = Math.max(0, Math.floor((Date.now() - cycleStart) / DAY_MS));
  const pnlPct = machine.capital > 0 ? (pnl / machine.capital) * 100 : 0;

  const milestones = (machine.anchor_milestones ?? []).slice().sort((a, b) => a - b);
  const minM = milestones[0] ?? 0;
  const maxM = milestones[milestones.length - 1] ?? Math.max(machine.capital, balance, 1);
  const range = Math.max(1, maxM - minM);
  const balancePct = ((Math.max(minM, Math.min(maxM, balance)) - minM) / range) * 100;
  const anchorPct = ((Math.max(minM, Math.min(maxM, machine.current_anchor)) - minM) / range) * 100;

  const isClosed = machine.status === "closed";
  const overflow = balance - machine.current_anchor;
  const underflow = -overflow;
  const showOverflowCta = !isClosed && overflow > 0;
  const showUnderflowCta = !isClosed && underflow > 0;

  return (
    <Link
      href={detailHref}
      className={cn(
        "group block rounded-2xl border bg-card hover:shadow-sm transition-all p-5 space-y-4",
        isClosed
          ? "border-dashed border-border/60 opacity-90 hover:border-foreground/40"
          : "border-border hover:border-primary/40",
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3
            className={cn(
              "font-semibold text-base transition-colors flex items-center gap-2 flex-wrap",
              isClosed
                ? "text-muted-foreground group-hover:text-foreground"
                : "text-foreground group-hover:text-primary",
            )}
          >
            <span className="truncate">{machine.name}</span>
            {machine.capital > 0 && (
              <span
                className={cn(
                  "inline-flex items-center gap-0.5 text-xs font-bold tabular-nums",
                  pnlPct > 0
                    ? "text-[#3B6C4F] dark:text-[#5C9C75]"
                    : pnlPct < 0
                      ? "text-foreground"
                      : "text-muted-foreground",
                )}
              >
                <TrendingUp className={cn("h-3 w-3", pnlPct < 0 && "rotate-180")} />
                {pnlPct > 0 ? "+" : ""}
                {pnlPct.toFixed(1)}%
              </span>
            )}
          </h3>
          <p className="text-[11px] text-muted-foreground mt-0.5 uppercase tracking-wider">
            {machine.method ?? "—"} · {SIGNAL_LABEL[machine.signal_source ?? "self"] ?? "—"}
          </p>
        </div>
        <span
          className={cn(
            "rounded-md px-2 py-0.5 text-[11px] font-semibold tabular-nums uppercase tracking-widest whitespace-nowrap",
            isClosed
              ? "border border-border text-muted-foreground"
              : "bg-foreground text-background",
          )}
        >
          {isClosed ? "Đã đóng" : `${days} ngày`}
        </span>
      </div>

      {/* Stats */}
      <div className="border-t border-dashed border-border pt-3 space-y-1.5 text-sm">
        <Row label="Vốn gốc" value={fmt(machine.capital)} />
        <Row
          label="PNL"
          value={`${pnl >= 0 ? "+" : ""}${fmt(pnl)}`}
          tone={pnl > 0 ? "profit" : pnl < 0 ? "loss" : undefined}
        />
        <Row label="Đã rút" value={fmt(withdrawnAbs)} tone="gold" />
        <Row label="Số dư hiện tại" value={fmt(balance)} />
      </div>

      {/* Mốc neo strip */}
      {milestones.length > 0 && (
        <div className="rounded-lg bg-muted/30 px-3 py-3 space-y-3">
          <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-muted-foreground">
            <span>Mốc neo</span>
            <span className="tabular-nums">
              Hiện tại: <strong className="text-foreground">{fmt(machine.current_anchor)}</strong>{" "}
              · Số dư: <strong className="text-foreground">{fmt(balance)}</strong>
            </span>
          </div>
          <div className="relative h-2 mx-6">
            <div className="absolute top-1/2 left-0 right-0 h-px bg-border -translate-y-1/2" />
            {milestones.map((m) => {
              const pct = ((m - minM) / range) * 100;
              return (
                <div
                  key={m}
                  className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-2 w-px bg-muted-foreground/40"
                  style={{ left: `${pct}%` }}
                />
              );
            })}
            <div
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-3 w-0.5 bg-primary"
              style={{ left: `${anchorPct}%` }}
            />
            <div
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-2.5 w-2.5 rounded-full bg-[#3B6C4F] dark:bg-[#5C9C75] ring-2 ring-card"
              style={{ left: `${balancePct}%` }}
            />
          </div>
          <div className="relative h-3 mx-6">
            {milestones.map((m) => {
              const pct = ((m - minM) / range) * 100;
              const isCurrent = m === machine.current_anchor;
              return (
                <span
                  key={m}
                  className={cn(
                    "absolute -translate-x-1/2 text-[10px] tabular-nums whitespace-nowrap",
                    isCurrent ? "font-bold text-primary" : "text-muted-foreground",
                  )}
                  style={{ left: `${pct}%` }}
                >
                  {fmt(m)}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {showOverflowCta && (
        <div className="rounded-xl border-2 border-[#3B6C4F] bg-[#3B6C4F]/10 p-3 flex items-start gap-2">
          <Sparkles className="h-4 w-4 text-[#3B6C4F] dark:text-[#5C9C75] shrink-0 mt-0.5" />
          <p className="text-sm leading-relaxed">
            PnL đang{" "}
            <span className="font-bold text-[#3B6C4F] dark:text-[#5C9C75] tabular-nums">
              +{fmt(overflow)}
            </span>
            , vượt mốc neo{" "}
            <span className="font-bold tabular-nums">{fmt(machine.current_anchor)}</span>
            . Rút ngay để giữ kỷ luật.
          </p>
        </div>
      )}

      {showUnderflowCta && (
        <div className="rounded-xl border-2 border-primary bg-primary/10 p-3 flex items-start gap-2">
          <TrendingDown className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <p className="text-sm leading-relaxed">
            Số dư{" "}
            <span className="font-bold tabular-nums">{fmt(balance)}</span>{" "}
            đang dưới mốc neo{" "}
            <span className="font-bold text-primary tabular-nums">
              {fmt(machine.current_anchor)}
            </span>
            . Vào cỗ máy để hạ neo hoặc giữ vốn.
          </p>
        </div>
      )}
    </Link>
  );
}

function Row({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "profit" | "loss" | "gold";
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</span>
      <span
        className={cn(
          "tabular-nums text-sm font-semibold",
          tone === "profit" && "text-[#3B6C4F] dark:text-[#5C9C75]",
          tone === "loss" && "text-foreground",
          tone === "gold" && "text-primary",
          !tone && "text-foreground",
        )}
      >
        {value}
      </span>
    </div>
  );
}
