"use client";

import { cn } from "@/lib/utils";
import type { Machine, MachineTransaction } from "@/lib/co-may/types";

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const DAY_MS = 86400_000;
const WEEK_MS = 7 * DAY_MS;

function startOfWeek(d: Date): number {
  const day = d.getUTCDay();
  const diff = (day === 0 ? -6 : 1 - day);
  const monday = new Date(d);
  monday.setUTCDate(d.getUTCDate() + diff);
  monday.setUTCHours(0, 0, 0, 0);
  return monday.getTime();
}

export function PerformanceMatrix({
  machines,
  tx,
  weeks = 4,
  asOf,
}: {
  machines: Machine[];
  tx: MachineTransaction[];
  weeks?: number;
  asOf?: Date;
}) {
  if (machines.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        Chưa có cỗ máy nào để hiển thị hiệu suất.
      </div>
    );
  }

  const now = (asOf ?? new Date()).getTime();
  const currentWeekStart = startOfWeek(new Date(now));
  const weekStarts: number[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    weekStarts.push(currentWeekStart - i * WEEK_MS);
  }

  const cellPnL: Record<string, Record<number, number>> = {};
  for (const m of machines) cellPnL[m.id] = {};

  for (const t of tx) {
    if (t.type !== "trade_win" && t.type !== "trade_loss") continue;
    const ts = new Date(t.created_at).getTime();
    const wStart = startOfWeek(new Date(ts));
    if (!cellPnL[t.machine_id]) cellPnL[t.machine_id] = {};
    cellPnL[t.machine_id][wStart] = (cellPnL[t.machine_id][wStart] ?? 0) + t.amount;
  }

  // Magnitude scale for opacity
  const allValues = Object.values(cellPnL).flatMap((row) => Object.values(row));
  const maxAbs = Math.max(1, ...allValues.map((v) => Math.abs(v)));

  function cellClass(value: number | undefined): string {
    if (value === undefined || value === 0) return "bg-muted/30 text-muted-foreground/60";
    const ratio = Math.min(1, Math.abs(value) / maxAbs);
    const alphaTier = ratio > 0.66 ? 40 : ratio > 0.33 ? 25 : 15;
    if (value > 0) {
      return alphaTier === 40
        ? "bg-[#3B6C4F]/40 text-[#1F4030] dark:text-[#A6D9B8]"
        : alphaTier === 25
          ? "bg-[#3B6C4F]/25 text-[#1F4030] dark:text-[#A6D9B8]"
          : "bg-[#3B6C4F]/15 text-[#1F4030] dark:text-[#A6D9B8]";
    }
    return alphaTier === 40
      ? "bg-primary/40 text-[#5C1818] dark:text-[#F0A8A8]"
      : alphaTier === 25
        ? "bg-primary/25 text-[#5C1818] dark:text-[#F0A8A8]"
        : "bg-primary/15 text-[#5C1818] dark:text-[#F0A8A8]";
  }

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="px-5 py-3 border-b border-border">
        <h3 className="text-sm font-semibold text-foreground">Hiệu suất {weeks} tuần gần nhất</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          P&L theo tuần, từng cỗ máy
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr>
              <th className="text-left px-4 py-2 font-medium text-muted-foreground sticky left-0 bg-muted/40 z-10">
                Cỗ máy
              </th>
              {weekStarts.map((ws, idx) => (
                <th
                  key={ws}
                  className="text-right px-3 py-2 font-medium text-muted-foreground whitespace-nowrap"
                >
                  W{idx === weeks - 1 ? "" : `-${weeks - 1 - idx}`}
                </th>
              ))}
              <th className="text-right px-4 py-2 font-medium text-muted-foreground">Tổng</th>
            </tr>
          </thead>
          <tbody>
            {machines.map((m) => {
              const total = weekStarts.reduce((s, w) => s + (cellPnL[m.id]?.[w] ?? 0), 0);
              return (
                <tr key={m.id} className="border-t border-border">
                  <td className="px-4 py-2 font-medium text-foreground sticky left-0 bg-card z-10 max-w-[200px] truncate">
                    {m.name}
                  </td>
                  {weekStarts.map((w) => {
                    const v = cellPnL[m.id]?.[w];
                    return (
                      <td key={w} className="px-1 py-1.5">
                        <div
                          className={cn(
                            "rounded-md px-2 py-1.5 text-right font-medium tabular-nums",
                            cellClass(v),
                          )}
                        >
                          {v === undefined || v === 0 ? "—" : `${v > 0 ? "+" : ""}${usd.format(v)}`}
                        </div>
                      </td>
                    );
                  })}
                  <td
                    className={cn(
                      "px-4 py-2 text-right font-semibold tabular-nums",
                      total > 0
                        ? "text-[#3B6C4F] dark:text-[#5C9C75]"
                        : total < 0
                          ? "text-foreground"
                          : "text-muted-foreground",
                    )}
                  >
                    {total === 0 ? "—" : `${total > 0 ? "+" : ""}${usd.format(total)}`}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
