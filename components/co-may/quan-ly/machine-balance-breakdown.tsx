"use client";

import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/co-may/currency";
import type { CurrencyUnit } from "@/lib/co-may/types";

interface Props {
  capital: number;
  totalPnl: number;
  totalWithdrawn: number; // positive number representing withdrawn amount
  unit?: CurrencyUnit;
}

export function MachineBalanceBreakdown({ capital, totalPnl, totalWithdrawn, unit }: Props) {
  const balance = capital + totalPnl - totalWithdrawn;
  const fmt = (n: number) => formatMoney(n, unit);

  return (
    <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
      <h3 className="text-lg md:text-xl font-bold text-foreground">Số dư tài khoản</h3>

      <dl className="space-y-2.5 text-sm border-t border-dashed border-border pt-3">
        <Row label="Vốn gốc" value={fmt(capital)} />
        <Row
          label="+ Tổng PNL trade"
          value={`${totalPnl >= 0 ? "+" : ""}${fmt(totalPnl)}`}
          tone={totalPnl > 0 ? "profit" : totalPnl < 0 ? "loss" : "neutral"}
        />
        <Row label="− Đã rút" value={`−${fmt(totalWithdrawn)}`} tone="profit" />
        <div className="border-t border-border pt-2.5 mt-1" />
        <Row
          label="= Số dư hiện tại"
          value={fmt(balance)}
          highlight
          tone={balance > capital ? "profit" : balance < capital ? "loss" : "neutral"}
        />
      </dl>

      <p className="text-xs italic text-muted-foreground/80 leading-relaxed">
        Chỉ có lãi đã rút mới là lãi thật. Chu kỳ chưa đóng — con số này có thể còn thay đổi.
      </p>
    </div>
  );
}

function Row({
  label,
  value,
  highlight,
  tone,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  tone?: "profit" | "loss" | "neutral";
}) {
  const valueColor =
    tone === "profit"
      ? "text-[#5C9C75]"
      : tone === "loss"
        ? "text-foreground"
        : highlight
          ? "text-foreground"
          : "text-foreground";
  return (
    <div className="flex items-center justify-between gap-3">
      <dt
        className={cn(
          "uppercase tracking-widest",
          highlight
            ? "text-sm font-bold text-foreground"
            : "text-xs font-bold text-foreground/70",
        )}
      >
        {label}
      </dt>
      <dd
        className={cn(
          "font-bold tabular-nums",
          highlight ? "text-xl md:text-2xl" : "text-base",
          valueColor,
        )}
      >
        {value}
      </dd>
    </div>
  );
}
