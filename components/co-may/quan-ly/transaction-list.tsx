"use client";

import { TrendingUp, TrendingDown, Wallet, Anchor } from "lucide-react";
import { cn, formatRelativeTime } from "@/lib/utils";
import type { MachineTransaction, TransactionType } from "@/lib/co-may/types";
import { isSeniorMode } from "@/lib/co-may/senior-ui";

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const TYPE_META: Record<
  TransactionType,
  { label: string; icon: React.ElementType; tone: "profit" | "loss" | "neutral" | "primary" }
> = {
  trade_win: { label: "Lệnh thắng", icon: TrendingUp, tone: "profit" },
  trade_loss: { label: "Lệnh thua", icon: TrendingDown, tone: "loss" },
  withdraw: { label: "Rút tiền", icon: Wallet, tone: "primary" },
  anchor_change: { label: "Đổi anchor", icon: Anchor, tone: "neutral" },
};

export function TransactionList({
  tx,
  limit = 10,
  role,
}: {
  tx: MachineTransaction[];
  limit?: number;
  role?: string | null;
}) {
  const senior = isSeniorMode(role);
  const sorted = [...tx]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, limit);

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div
        className={cn(
          "border-b border-border flex items-center justify-between",
          senior ? "px-6 py-4" : "px-5 py-3",
        )}
      >
        <h3 className={cn("font-semibold text-foreground", senior ? "text-base" : "text-sm")}>
          Lịch sử giao dịch
        </h3>
        <span className={cn("text-muted-foreground", senior ? "text-sm" : "text-xs")}>
          {limit} mới nhất
        </span>
      </div>

      {sorted.length === 0 ? (
        <div className="p-6 text-center text-sm text-muted-foreground">
          Chưa có giao dịch nào trong cỗ máy này.
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {sorted.map((t) => {
            const meta = TYPE_META[t.type];
            const Icon = meta.icon;
            const toneClass =
              meta.tone === "profit"
                ? "bg-[#3B6C4F]/10 text-[#3B6C4F] dark:text-[#5C9C75]"
                : meta.tone === "loss"
                  ? "bg-primary/10 text-foreground"
                  : meta.tone === "primary"
                    ? "bg-primary/10 text-primary"
                    : "bg-muted text-muted-foreground";
            const amountClass =
              t.type === "withdraw" || t.amount > 0
                ? "text-[#3B6C4F] dark:text-[#5C9C75]"
                : t.amount < 0
                  ? "text-foreground"
                  : "text-muted-foreground";
            return (
              <li
                key={t.id}
                className={cn(
                  "flex items-center gap-3",
                  senior ? "px-6 py-4" : "px-5 py-3",
                )}
              >
                <div
                  className={cn(
                    "flex items-center justify-center rounded-lg shrink-0",
                    senior ? "h-10 w-10" : "h-8 w-8",
                    toneClass,
                  )}
                >
                  <Icon size={senior ? 18 : 14} />
                </div>
                <div className="flex-1 min-w-0">
                  <div
                    className={cn(
                      "font-medium text-foreground truncate",
                      senior ? "text-base" : "text-sm",
                    )}
                  >
                    {meta.label}
                  </div>
                  <div
                    className={cn(
                      "text-muted-foreground truncate",
                      senior ? "text-sm" : "text-xs",
                    )}
                  >
                    {t.note ?? formatRelativeTime(t.created_at)}
                  </div>
                </div>
                <div
                  className={cn(
                    "font-semibold tabular-nums whitespace-nowrap",
                    senior ? "text-base" : "text-sm",
                    amountClass,
                  )}
                >
                  {t.amount > 0 ? "+" : ""}
                  {usd.format(t.amount)}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
