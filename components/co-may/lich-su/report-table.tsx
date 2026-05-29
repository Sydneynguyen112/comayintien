"use client";

import { Download, RotateCcw, TrendingUp } from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import type { CycleReport, Machine, MachineTransaction } from "@/lib/co-may/types";
import { isSeniorMode } from "@/lib/co-may/senior-ui";
import { formatMoney } from "@/lib/co-may/currency";
import { downloadCsv } from "./csv-export";

export function ReportTable({
  reports,
  machines,
  tx,
  role,
}: {
  reports: CycleReport[];
  machines: Machine[];
  tx: MachineTransaction[];
  role?: string | null;
}) {
  const senior = isSeniorMode(role);
  const cellY = senior ? "py-3.5" : "py-2";
  const tdText = senior ? "text-base" : "text-sm";
  const machineNameById = new Map(machines.map((m) => [m.id, m.name]));

  function exportCycle(r: CycleReport) {
    const start = new Date(r.start_date).getTime();
    const end = new Date(r.end_date).getTime();
    const cycleTx = tx
      .filter(
        (t) =>
          t.machine_id === r.machine_id &&
          new Date(t.created_at).getTime() >= start &&
          new Date(t.created_at).getTime() <= end,
      )
      .sort((a, b) => a.created_at.localeCompare(b.created_at));

    const machineName = machineNameById.get(r.machine_id) ?? r.machine_id;
    const slug = machineName.replace(/\s+/g, "-").toLowerCase();
    downloadCsv(
      `bao-cao-${slug}-${formatDate(r.start_date).replace(/\//g, "")}`,
      cycleTx.map((t) => ({
        Ngày: formatDate(t.created_at),
        Loại: t.type,
        Số_tiền: t.amount,
        Ghi_chú: t.note ?? "",
      })),
    );
  }

  if (reports.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
        Chưa có chu kỳ nào được đóng. Từ trang &quot;Cỗ Máy Chi Tiết&quot;, chọn một cỗ máy và bấm &quot;Đóng chu kỳ&quot;.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className={cn("w-full", tdText)}>
          <thead className="bg-muted/40">
            <tr className={cn("text-left uppercase tracking-wider text-muted-foreground", senior ? "text-xs" : "text-[11px]")}>
              <th className={cn("px-4 font-medium", cellY)}>Chu kỳ</th>
              <th className={cn("px-4 font-medium", cellY)}>Cỗ máy</th>
              <th className={cn("px-4 font-medium", cellY)}>Quyết định</th>
              <th className={cn("px-4 font-medium text-right", cellY)}>P&L</th>
              <th className={cn("px-4 font-medium text-right", cellY)}>Đã rút</th>
              <th className={cn("px-4 font-medium text-right", cellY)}>CSV</th>
            </tr>
          </thead>
          <tbody>
            {reports.map((r) => (
              <tr key={r.id} className="border-t border-border hover:bg-muted/20 transition-colors">
                <td className={cn("px-4 text-muted-foreground whitespace-nowrap", cellY)}>
                  <div>{formatDate(r.start_date)}</div>
                  <div className={senior ? "text-xs text-muted-foreground" : "text-[11px] text-muted-foreground/70"}>
                    → {formatDate(r.end_date)}
                  </div>
                </td>
                <td className={cn("px-4 text-foreground max-w-[200px] truncate", cellY)}>
                  {machineNameById.get(r.machine_id) ?? "—"}
                </td>
                <td className={cn("px-4", cellY)}>
                  {r.decision === "scale" ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 text-primary px-2 py-0.5 text-xs font-semibold">
                      <TrendingUp className="h-3 w-3" />
                      Scale
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-muted text-muted-foreground px-2 py-0.5 text-xs font-medium">
                      <RotateCcw className="h-3 w-3" />
                      Reset
                    </span>
                  )}
                </td>
                <td
                  className={cn(
                    "px-4 text-right tabular-nums font-semibold whitespace-nowrap",
                    cellY,
                    r.pnl > 0
                      ? "text-[#3B6C4F] dark:text-[#5C9C75]"
                      : r.pnl < 0
                        ? "text-foreground"
                        : "text-muted-foreground",
                  )}
                >
                  {r.pnl > 0 ? "+" : ""}
                  {formatMoney(r.pnl, r.currency_unit)}
                </td>
                <td className={cn("px-4 text-right tabular-nums text-foreground whitespace-nowrap", cellY)}>
                  {formatMoney(r.withdrawn, r.currency_unit)}
                </td>
                <td className={cn("px-4 text-right", cellY)}>
                  <button
                    type="button"
                    onClick={() => exportCycle(r)}
                    className={cn("inline-flex items-center gap-1 text-primary hover:underline", senior ? "text-sm font-medium" : "text-xs")}
                  >
                    <Download className={senior ? "h-3.5 w-3.5" : "h-3 w-3"} />
                    Tải
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
