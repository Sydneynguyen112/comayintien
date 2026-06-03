"use client";

// Bảng xếp hạng giải đấu (dùng chung admin + client). Highlight cột metric chính.

import { Crown } from "lucide-react";
import { cn } from "@/lib/utils";
import { METRIC_LABEL } from "@/lib/co-may/tournament-format";
import type { LeaderboardEntry, LeaderboardMetric } from "@/lib/co-may/types";

function fmtPct(n: number) {
  return `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
}
function fmtWr(n: number) {
  return `${Math.round(n * 100)}%`;
}
function fmtVol(n: number) {
  return n.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

function scoreText(e: LeaderboardEntry, metric: LeaderboardMetric) {
  if (metric === "win_rate") return fmtWr(e.win_rate);
  if (metric === "volume") return `${fmtVol(e.volume)} lot`;
  return fmtPct(e.pnl_pct);
}

const RANK_TONE = ["text-amber-400", "text-zinc-300", "text-amber-700"];

export function LeaderboardTable({
  entries,
  metric,
}: {
  entries: LeaderboardEntry[];
  metric: LeaderboardMetric;
}) {
  if (entries.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
        Chưa có cỗ máy nào trên bảng xếp hạng. Sẽ hiện khi có máy được duyệt + có giao dịch.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr className="text-left text-[11px] uppercase tracking-widest text-muted-foreground">
              <th className="px-4 py-2 w-14">Hạng</th>
              <th className="px-4 py-2">Cỗ máy / Người chơi</th>
              <th className="px-4 py-2 text-right">{METRIC_LABEL[metric]}</th>
              <th className="px-4 py-2 text-right hidden md:table-cell">% tăng trưởng</th>
              <th className="px-4 py-2 text-right hidden md:table-cell">Win rate</th>
              <th className="px-4 py-2 text-right hidden lg:table-cell">Volume</th>
              <th className="px-4 py-2 text-right hidden lg:table-cell">Số lệnh</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.registration_id} className="border-t border-border/60 hover:bg-muted/15 transition-colors">
                <td className="px-4 py-2.5">
                  <span className={cn("inline-flex items-center gap-1 font-bold tabular-nums", e.rank <= 3 && RANK_TONE[e.rank - 1])}>
                    {e.rank <= 3 && <Crown className="h-3.5 w-3.5" />}
                    {e.rank}
                  </span>
                </td>
                <td className="px-4 py-2.5">
                  <div className="font-medium text-foreground truncate max-w-[220px]">{e.machine_name}</div>
                  <div className="text-[11px] text-muted-foreground truncate max-w-[220px]">
                    {e.display_name}
                    {!e.mt5_linked && (
                      <span className="ml-1.5 text-[10px] text-amber-600 dark:text-amber-400">
                        · chưa kết nối MT5
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-2.5 text-right font-bold tabular-nums text-primary">{scoreText(e, metric)}</td>
                <td className="px-4 py-2.5 text-right tabular-nums hidden md:table-cell">
                  <span className={e.pnl_pct >= 0 ? "text-[#5C9C75]" : "text-foreground"}>{fmtPct(e.pnl_pct)}</span>
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums hidden md:table-cell">{fmtWr(e.win_rate)}</td>
                <td className="px-4 py-2.5 text-right tabular-nums hidden lg:table-cell">{fmtVol(e.volume)}</td>
                <td className="px-4 py-2.5 text-right tabular-nums hidden lg:table-cell">{e.trade_count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
