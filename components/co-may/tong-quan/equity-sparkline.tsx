"use client";

import type { MachineTransaction } from "@/lib/co-may/types";

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const DAY_MS = 86400_000;

export function EquitySparkline({
  tx,
  days = 30,
  asOf,
}: {
  tx: MachineTransaction[];
  days?: number;
  asOf?: Date;
}) {
  const trades = tx
    .filter((t) => t.type === "trade_win" || t.type === "trade_loss")
    .sort((a, b) => a.created_at.localeCompare(b.created_at));

  const now = (asOf ?? new Date()).getTime();
  const start = now - days * DAY_MS;

  // Bucket per day → cumulative equity points
  const buckets = new Map<number, number>();
  for (const t of trades) {
    const ts = new Date(t.created_at).getTime();
    if (ts < start) continue;
    const dayKey = Math.floor(ts / DAY_MS);
    buckets.set(dayKey, (buckets.get(dayKey) ?? 0) + t.amount);
  }

  const startDay = Math.floor(start / DAY_MS);
  const endDay = Math.floor(now / DAY_MS);
  const points: { x: number; y: number }[] = [];
  let cum = 0;
  for (let d = startDay; d <= endDay; d++) {
    cum += buckets.get(d) ?? 0;
    points.push({ x: d - startDay, y: cum });
  }

  const W = 320;
  const H = 80;
  const PAD_X = 4;
  const PAD_Y = 6;
  const innerW = W - 2 * PAD_X;
  const innerH = H - 2 * PAD_Y;

  if (points.length < 2) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        Chưa đủ dữ liệu để vẽ equity curve.
      </div>
    );
  }

  const minY = Math.min(...points.map((p) => p.y), 0);
  const maxY = Math.max(...points.map((p) => p.y), 0);
  const rangeY = maxY - minY || 1;
  const maxX = points[points.length - 1].x || 1;

  const sx = (x: number) => PAD_X + (x / maxX) * innerW;
  const sy = (y: number) => PAD_Y + (1 - (y - minY) / rangeY) * innerH;

  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${sx(p.x).toFixed(2)} ${sy(p.y).toFixed(2)}`)
    .join(" ");

  const areaPath =
    `M ${sx(points[0].x).toFixed(2)} ${sy(0).toFixed(2)} ` +
    points.map((p) => `L ${sx(p.x).toFixed(2)} ${sy(p.y).toFixed(2)}`).join(" ") +
    ` L ${sx(points[points.length - 1].x).toFixed(2)} ${sy(0).toFixed(2)} Z`;

  const last = points[points.length - 1].y;
  const tone = last >= 0 ? "profit" : "loss";

  return (
    <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Equity curve</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {days} ngày gần nhất • cumulative P&L
          </p>
        </div>
        <div
          className={
            tone === "profit"
              ? "text-2xl font-bold text-[#3B6C4F] dark:text-[#5C9C75] tabular-nums"
              : "text-2xl font-bold text-foreground tabular-nums"
          }
        >
          {last >= 0 ? "+" : ""}
          {usd.format(last)}
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" preserveAspectRatio="none" className="overflow-visible">
        <defs>
          <linearGradient id="eq-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#CD9C20" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#CD9C20" stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* zero line */}
        <line
          x1={PAD_X}
          x2={W - PAD_X}
          y1={sy(0)}
          y2={sy(0)}
          stroke="currentColor"
          strokeOpacity="0.15"
          strokeDasharray="3 3"
        />
        <path d={areaPath} fill="url(#eq-fill)" />
        <path d={linePath} fill="none" stroke="#CD9C20" strokeWidth="2" />
      </svg>
    </div>
  );
}
