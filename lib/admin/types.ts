export type Direction = "up" | "down" | "flat";
export type ValueFormat = "number" | "percent" | "currency";

export interface KPIMetric {
  label: string;
  value: number | string;
  hint?: string;
  changePercent?: number;
  changeDirection?: Direction;
  trendData?: TimeSeriesPoint[];
  format?: ValueFormat;
  highlight?: boolean;
}

export interface TimeSeriesPoint {
  date: string;
  value: number;
  label?: string;
}

export type DateRange = "7d" | "30d" | "90d";

export interface OverviewKpis {
  wau_loggers: { current: number; previous: number };
  dau: { current: number; previous: number };
  mau: { current: number };
  stickiness: { current: number; previous: number };
  new_signups: { current: number; previous: number };
  activation_rate: { current: number };
  at_risk_users: { current: number };
  trades_today: { current: number; previous: number };
}

export function pctChange(current: number, previous: number): { pct: number; dir: Direction } {
  if (previous === 0) {
    if (current === 0) return { pct: 0, dir: "flat" };
    return { pct: 100, dir: "up" };
  }
  const pct = ((current - previous) / Math.abs(previous)) * 100;
  const dir: Direction = Math.abs(pct) < 0.5 ? "flat" : pct > 0 ? "up" : "down";
  return { pct, dir };
}

export function formatValue(v: number | string, fmt: ValueFormat = "number"): string {
  if (typeof v === "string") return v;
  if (fmt === "percent") return `${v.toFixed(1)}%`;
  if (fmt === "currency") return `$${v.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  return v.toLocaleString("en-US");
}
