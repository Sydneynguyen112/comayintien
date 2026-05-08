"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import type { CycleReport } from "@/lib/co-may/types";

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const DECISION_LABEL: Record<string, string> = {
  scale: "SCALE",
  reset: "RESET",
  close: "CLOSE",
};

export function ClosedMachineCard({
  report,
  detailHref,
}: {
  report: CycleReport;
  detailHref: string;
}) {
  const startCap = report.starting_capital ?? 0;
  const ending = report.ending_balance ?? 0;
  const trades = report.trade_count ?? 0;
  const wr = trades > 0 ? Math.round(((report.win_count ?? 0) / trades) * 100) : 0;
  const growth = startCap > 0 ? (report.pnl / startCap) * 100 : 0;
  const decisionLabel = DECISION_LABEL[report.decision] ?? report.decision.toUpperCase();

  return (
    <Link
      href={detailHref}
      className="group block rounded-2xl border-2 border-border bg-card hover:border-foreground/40 hover:shadow-sm transition-all p-5 space-y-3"
    >
      <div className="space-y-1">
        <h3 className="font-serif text-xl text-foreground italic group-hover:text-primary transition-colors">
          {report.machine_name ?? "Cỗ máy"}
        </h3>
        <p className="text-xs uppercase tracking-widest text-muted-foreground tabular-nums">
          {formatDmy(report.start_date)} <span className="mx-1">→</span> {formatDmy(report.end_date)}
        </p>
      </div>

      <div className="border-t border-dashed border-border pt-3 grid grid-cols-3 gap-3">
        <Cell label="Vốn đầu" value={usd.format(startCap)} />
        <Cell label="Vốn cuối" value={usd.format(ending)} />
        <Cell label="Đã rút" value={usd.format(report.withdrawn ?? 0)} />
      </div>

      <div className="border-t border-dashed border-border pt-3 flex items-center justify-between gap-2 flex-wrap">
        <div className="text-[11px] uppercase tracking-widest text-muted-foreground tabular-nums">
          {trades} lệnh · WR {wr}%
        </div>
        <div
          className={cn(
            "text-[11px] font-bold tabular-nums",
            growth > 0
              ? "text-[#3B6C4F] dark:text-[#5C9C75]"
              : growth < 0
                ? "text-foreground"
                : "text-muted-foreground",
          )}
        >
          {growth > 0 ? "+" : ""}
          {growth.toFixed(1)}%
        </div>
      </div>

      <div className="text-[11px] uppercase tracking-widest text-muted-foreground">
        Quyết định: <span className="text-foreground font-bold">{decisionLabel}</span>
      </div>
    </Link>
  );
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="text-sm font-semibold text-foreground tabular-nums">{value}</div>
    </div>
  );
}

function formatDmy(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}
