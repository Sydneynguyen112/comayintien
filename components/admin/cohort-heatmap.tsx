"use client";

import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import type { CohortGrid } from "@/lib/admin/retention-api";

interface Props {
  data: CohortGrid;
}

/**
 * Triangle heatmap: cohort theo tuần signup × week_number 0..N.
 * Color scale theo retention %.
 */
export function CohortHeatmap({ data }: Props) {
  if (data.cohorts.length === 0) {
    return <p className="text-sm text-muted-foreground py-8 text-center">Chưa đủ dữ liệu để hiển thị cohort.</p>;
  }
  const weekHeaders = Array.from({ length: data.maxWeekNumber + 1 }, (_, i) => i);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr>
            <th className="text-left p-2 font-medium text-muted-foreground sticky left-0 bg-card z-10 min-w-[180px]">
              Cohort tuần
            </th>
            {weekHeaders.map((w) => (
              <th key={w} className="text-center p-2 font-medium text-muted-foreground min-w-[60px]">
                W{w}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.cohorts.map((c) => (
            <tr key={c.week} className="border-t border-border/50">
              <td className="p-2 sticky left-0 bg-card z-10">
                <div className="font-medium text-foreground">{format(parseISO(c.week), "d/M/yyyy")}</div>
                <div className="text-[10px] text-muted-foreground">{c.size} user</div>
              </td>
              {c.cells.map((pct, w) => (
                <td key={w} className="p-1">
                  {pct === null ? (
                    <div className="h-9 rounded bg-transparent" />
                  ) : (
                    <div
                      className={cn(
                        "h-9 rounded flex items-center justify-center text-[11px] font-semibold tabular-nums",
                        colorForRetention(pct),
                      )}
                      title={`${pct}% · ${Math.round((pct / 100) * c.size)}/${c.size} active`}
                    >
                      {pct}%
                    </div>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function colorForRetention(pct: number): string {
  if (pct >= 80) return "bg-emerald-600 text-white";
  if (pct >= 60) return "bg-emerald-500/80 text-white";
  if (pct >= 40) return "bg-yellow-500/80 text-foreground";
  if (pct >= 20) return "bg-orange-500/70 text-white";
  return "bg-red-500/70 text-white";
}
