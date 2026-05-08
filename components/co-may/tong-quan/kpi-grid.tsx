"use client";

import { Wallet, TrendingUp, Target, TrendingDown, Clock, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { KpiSnapshot } from "@/lib/co-may/types";
import { isSeniorMode, seniorCx } from "@/lib/co-may/senior-ui";

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

interface KpiCard {
  label: string;
  icon: LucideIcon;
  value: string;
  hint?: string;
  highlight?: boolean;
  tone?: "neutral" | "profit" | "loss";
}

function buildCards(kpi: KpiSnapshot): KpiCard[] {
  const pnlTone: KpiCard["tone"] = kpi.pnl > 0 ? "profit" : kpi.pnl < 0 ? "loss" : "neutral";
  return [
    {
      label: "Tổng vốn",
      icon: Wallet,
      value: usd.format(kpi.total_capital),
      hint: `${kpi.trade_count} lệnh đã ghi`,
      highlight: true,
    },
    {
      label: "P&L",
      icon: TrendingUp,
      value: `${kpi.pnl >= 0 ? "+" : ""}${usd.format(kpi.pnl)}`,
      hint: "Trong chu kỳ hiện tại",
      highlight: true,
      tone: pnlTone,
    },
    {
      label: "Win rate",
      icon: Target,
      value: `${(kpi.win_rate * 100).toFixed(1)}%`,
      hint: kpi.trade_count > 0 ? `${Math.round(kpi.win_rate * kpi.trade_count)}/${kpi.trade_count}` : "—",
    },
    {
      label: "Drawdown",
      icon: TrendingDown,
      value: usd.format(kpi.drawdown),
      hint: "Đáy thấp nhất",
      tone: kpi.drawdown < 0 ? "loss" : "neutral",
    },
    {
      label: "Days active",
      icon: Clock,
      value: `${kpi.days_active}`,
      hint: kpi.days_active > 0 ? "ngày trong chu kỳ" : "Chưa khởi động",
    },
  ];
}

export function KpiGrid({ kpi, role }: { kpi: KpiSnapshot; role?: string | null }) {
  const cards = buildCards(kpi);
  const senior = isSeniorMode(role);
  return (
    <div className={cn("grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5", senior ? "gap-4" : "gap-3")}>
      {cards.map((c) => {
        const Icon = c.icon;
        const valueColor =
          c.tone === "profit"
            ? "text-[#3B6C4F] dark:text-[#5C9C75]"
            : c.tone === "loss"
              ? "text-foreground"
              : "text-foreground";
        return (
          <div
            key={c.label}
            className={cn(
              "rounded-2xl border bg-card transition-colors",
              seniorCx.kpiCardPad(senior),
              c.highlight ? "border-primary/40 shadow-sm" : "border-border",
            )}
          >
            <div className="flex items-center justify-between mb-3">
              <div
                className={cn(
                  "flex items-center justify-center",
                  seniorCx.kpiIconBox(senior),
                  c.highlight ? "bg-primary/15" : "bg-muted",
                )}
              >
                <Icon
                  size={seniorCx.kpiIconSize(senior)}
                  className={c.highlight ? "text-primary" : "text-muted-foreground"}
                />
              </div>
              {c.highlight && (
                <span
                  className={cn(
                    "font-semibold uppercase tracking-wider text-primary/70",
                    senior ? "text-xs" : "text-[10px]",
                  )}
                >
                  KPI
                </span>
              )}
            </div>
            <div className={cn(seniorCx.kpiValue(senior), valueColor, "tabular-nums")}>{c.value}</div>
            <div className={cn(seniorCx.kpiLabel(senior), "mt-1")}>{c.label}</div>
            {c.hint && <div className={cn(seniorCx.kpiHint(senior), "mt-1")}>{c.hint}</div>}
          </div>
        );
      })}
    </div>
  );
}
