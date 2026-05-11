"use client";

import { LineChart, Line, ResponsiveContainer } from "recharts";
import { ArrowUp, ArrowDown, Minus, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatValue, pctChange, type TimeSeriesPoint, type ValueFormat, type Direction } from "@/lib/admin/types";

interface Props {
  label: string;
  value: number | string;
  hint?: string;
  current?: number;
  previous?: number;
  trendData?: TimeSeriesPoint[];
  format?: ValueFormat;
  icon?: LucideIcon;
  highlight?: boolean;
  onClick?: () => void;
  loading?: boolean;
}

const directionTone: Record<Direction, string> = {
  up: "text-emerald-500",
  down: "text-red-500",
  flat: "text-muted-foreground",
};

const directionIcon: Record<Direction, LucideIcon> = {
  up: ArrowUp,
  down: ArrowDown,
  flat: Minus,
};

export function KPICard({
  label,
  value,
  hint,
  current,
  previous,
  trendData,
  format = "number",
  icon: Icon,
  highlight = false,
  onClick,
  loading = false,
}: Props) {
  const change = typeof current === "number" && typeof previous === "number" ? pctChange(current, previous) : null;
  const ArrowIcon = change ? directionIcon[change.dir] : null;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={cn(
        "text-left rounded-2xl border bg-card p-4 transition-all w-full",
        highlight ? "border-gold/40 bg-gold/5" : "border-border",
        onClick && "hover:border-gold/30 hover:bg-gold/5 cursor-pointer",
        !onClick && "cursor-default",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {Icon && <Icon className="h-3.5 w-3.5" />}
          {label}
        </div>
        {trendData && trendData.length > 1 && (
          <div className="h-7 w-16 shrink-0 -mr-1 -mt-1">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#CD9C20"
                  strokeWidth={1.5}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className={cn("mt-2 font-bold tabular-nums leading-none", highlight ? "text-2xl text-gold" : "text-xl text-foreground")}>
        {loading ? <span className="inline-block w-12 h-6 rounded bg-muted/40 animate-pulse" /> : formatValue(value, format)}
      </div>

      <div className="mt-1.5 flex items-center gap-2 text-[11px]">
        {change && ArrowIcon && (
          <span className={cn("inline-flex items-center gap-0.5 font-medium tabular-nums", directionTone[change.dir])}>
            <ArrowIcon className="h-3 w-3" />
            {Math.abs(change.pct).toFixed(1)}%
          </span>
        )}
        {hint && <span className="text-muted-foreground">{hint}</span>}
      </div>
    </button>
  );
}
