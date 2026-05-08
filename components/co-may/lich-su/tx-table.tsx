"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Wallet, Anchor } from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import type { MachineTransaction, Machine, TransactionType } from "@/lib/co-may/types";
import { isSeniorMode } from "@/lib/co-may/senior-ui";

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const PAGE_SIZE = 20;

const TYPE_META: Record<TransactionType, { label: string; icon: React.ElementType; tone: string }> = {
  trade_win: { label: "Thắng", icon: TrendingUp, tone: "text-[#3B6C4F] dark:text-[#5C9C75]" },
  trade_loss: { label: "Thua", icon: TrendingDown, tone: "text-foreground" },
  withdraw: { label: "Rút", icon: Wallet, tone: "text-primary" },
  anchor_change: { label: "Anchor", icon: Anchor, tone: "text-muted-foreground" },
};

export function TxTable({
  tx,
  machines,
  role,
}: {
  tx: MachineTransaction[];
  machines: Machine[];
  role?: string | null;
}) {
  const senior = isSeniorMode(role);
  const [page, setPage] = useState(0);
  const machineNameById = new Map(machines.map((m) => [m.id, m.name]));
  const totalPages = Math.max(1, Math.ceil(tx.length / PAGE_SIZE));
  const slice = tx.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const cellY = senior ? "py-3.5" : "py-2";
  const tdText = senior ? "text-base" : "text-sm";

  if (tx.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
        Không có giao dịch nào khớp filter.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className={cn("w-full", tdText)}>
          <thead className="bg-muted/40 sticky top-0">
            <tr className={cn("text-left uppercase tracking-wider text-muted-foreground", senior ? "text-xs" : "text-[11px]")}>
              <th className={cn("px-4 font-medium", cellY)}>Ngày</th>
              <th className={cn("px-4 font-medium", cellY)}>Cỗ máy</th>
              <th className={cn("px-4 font-medium", cellY)}>Loại</th>
              <th className={cn("px-4 font-medium text-right", cellY)}>Số tiền</th>
              <th className={cn("px-4 font-medium", cellY)}>Ghi chú</th>
            </tr>
          </thead>
          <tbody>
            {slice.map((t) => {
              const meta = TYPE_META[t.type];
              const Icon = meta.icon;
              return (
                <tr key={t.id} className="border-t border-border hover:bg-muted/20 transition-colors">
                  <td className={cn("px-4 text-muted-foreground whitespace-nowrap", cellY)}>
                    {formatDate(t.created_at)}
                  </td>
                  <td className={cn("px-4 text-foreground max-w-[200px] truncate", cellY)}>
                    {machineNameById.get(t.machine_id) ?? "—"}
                  </td>
                  <td className={cn("px-4", cellY)}>
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 font-medium",
                        senior ? "text-sm" : "text-xs",
                        meta.tone,
                      )}
                    >
                      <Icon className={senior ? "h-3.5 w-3.5" : "h-3 w-3"} />
                      {meta.label}
                    </span>
                  </td>
                  <td
                    className={cn(
                      "px-4 text-right tabular-nums font-semibold whitespace-nowrap",
                      cellY,
                      t.type === "withdraw" || t.amount > 0
                        ? "text-[#3B6C4F] dark:text-[#5C9C75]"
                        : t.amount < 0
                          ? "text-foreground"
                          : "text-muted-foreground",
                    )}
                  >
                    {t.amount > 0 ? "+" : ""}
                    {usd.format(t.amount)}
                  </td>
                  <td className={cn("px-4 text-muted-foreground max-w-[280px] truncate", cellY)}>
                    {t.note ?? "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-border px-4 py-2 text-xs">
          <span className="text-muted-foreground">
            Trang {page + 1}/{totalPages} • {tx.length} giao dịch
          </span>
          <div className="flex gap-1">
            <button
              type="button"
              disabled={page === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              className="p-1 rounded-md border border-border hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              className="p-1 rounded-md border border-border hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
