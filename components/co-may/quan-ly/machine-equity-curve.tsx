"use client";

import type { CurrencyUnit, MachineTransaction } from "@/lib/co-may/types";
import { formatMoney } from "@/lib/co-may/currency";

interface Props {
  capital: number;
  /** Tx của machine, sorted ASC theo time. */
  tx: MachineTransaction[];
  milestones?: number[];
  unit?: CurrencyUnit;
}

interface Point {
  x: number;
  y: number;
  amount?: number;
}

export function MachineEquityCurve({ capital, tx, milestones, unit }: Props) {
  const fmt = (n: number) => formatMoney(n, unit);
  // Trades + withdraws (excluding anchor changes), chronological
  const events = [...tx]
    .filter((t) => t.type !== "anchor_change")
    .sort((a, b) => a.created_at.localeCompare(b.created_at));

  // Build cumulative-growth curve.
  // y(t) = capital + ΣPnL(t)    — KHÔNG trừ withdraws
  // Withdraws thành markers tại x của event đó, y = curve hiện thời.
  const linePoints: Point[] = [{ x: 0, y: capital }];
  const withdrawMarkers: Point[] = [];
  let cum = 0;
  events.forEach((t, i) => {
    const x = i + 1;
    if (t.type === "trade_win" || t.type === "trade_loss") {
      cum += t.amount;
      linePoints.push({ x, y: capital + cum, amount: t.amount });
    } else if (t.type === "withdraw") {
      withdrawMarkers.push({ x, y: capital + cum, amount: -t.amount });
    }
  });

  const ms = milestones ?? [];
  const collectY = [...linePoints.map((p) => p.y), ...ms, capital];
  const minRaw = Math.min(...collectY);
  const maxRaw = Math.max(...collectY);
  const padding = Math.max(1, (maxRaw - minRaw) * 0.08);
  const minY = minRaw - padding;
  const maxY = maxRaw + padding;
  const rangeY = maxY - minY || 1;
  const maxX = Math.max(1, events.length);

  const sortedMilestones = [...ms].sort((a, b) => b - a);

  const H_PX = 220;
  const PAD_TOP = 16;
  const PAD_BOTTOM = 16;
  const svgViewW = 100;
  const svgViewH = 100;

  const sx = (x: number) => (x / maxX) * svgViewW;
  const sy = (y: number) => (1 - (y - minY) / rangeY) * svgViewH;

  const linePath = linePoints
    .map((p, i) => `${i === 0 ? "M" : "L"} ${sx(p.x).toFixed(2)} ${sy(p.y).toFixed(2)}`)
    .join(" ");

  const areaPath =
    `M ${sx(linePoints[0].x).toFixed(2)} ${svgViewH} ` +
    linePoints.map((p) => `L ${sx(p.x).toFixed(2)} ${sy(p.y).toFixed(2)}`).join(" ") +
    ` L ${sx(linePoints[linePoints.length - 1].x).toFixed(2)} ${svgViewH} Z`;

  return (
    <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
      <header className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-lg md:text-xl font-bold text-foreground">Đường tăng trưởng</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Vốn + lãi tích luỹ (chưa trừ tiền đã rút) — kỹ năng trading thuần
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block w-3 h-0.5 bg-[#CD9C20] rounded" />
            Tăng trưởng tích luỹ
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-[#3B6C4F] dark:bg-[#5C9C75] text-white text-[9px] font-bold">
              $
            </span>
            Đã rút phần dư ({withdrawMarkers.length} lần)
          </span>
        </div>
      </header>

      <div className="relative" style={{ height: H_PX }}>
        <div
          className="absolute inset-y-0 left-0 right-[84px]"
          style={{ paddingTop: PAD_TOP, paddingBottom: PAD_BOTTOM }}
        >
          <div className="relative h-full w-full">
            <svg
              viewBox={`0 0 ${svgViewW} ${svgViewH}`}
              preserveAspectRatio="none"
              className="absolute inset-0 h-full w-full overflow-visible"
            >
              <defs>
                <linearGradient id="eq-machine-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#CD9C20" stopOpacity="0.28" />
                  <stop offset="100%" stopColor="#CD9C20" stopOpacity="0" />
                </linearGradient>
              </defs>

              {sortedMilestones.map((m) => {
                if (m < minY || m > maxY) return null;
                const y = sy(m);
                return (
                  <line
                    key={m}
                    x1={0}
                    x2={svgViewW}
                    y1={y}
                    y2={y}
                    stroke="currentColor"
                    strokeOpacity="0.18"
                    strokeDasharray="0.4 0.8"
                    vectorEffect="non-scaling-stroke"
                  />
                );
              })}

              <path d={areaPath} fill="url(#eq-machine-fill)" />
              <path
                d={linePath}
                fill="none"
                stroke="#CD9C20"
                strokeWidth="2"
                vectorEffect="non-scaling-stroke"
                strokeLinejoin="round"
                strokeLinecap="round"
              />

              {/* Trade markers rendered as HTML overlay — keep dots round, không bị méo do preserveAspectRatio="none" */}
            </svg>

            {/* Trade dots — HTML overlay, perfectly round small yellow */}
            {linePoints.map((p, i) => {
              const xPct = (p.x / maxX) * 100;
              const yPct = (1 - (p.y - minY) / rangeY) * 100;
              const isLast = i === linePoints.length - 1;
              return (
                <div
                  key={`pt-${i}`}
                  className={
                    isLast
                      ? "absolute -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-[#CD9C20] ring-2 ring-card pointer-events-none"
                      : "absolute -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-[#CD9C20] pointer-events-none"
                  }
                  style={{ left: `${xPct}%`, top: `${yPct}%` }}
                />
              );
            })}

            {/* Withdraw $ markers — HTML overlay */}
            {withdrawMarkers.map((w, i) => {
              const xPct = (w.x / maxX) * 100;
              const yPct = (1 - (w.y - minY) / rangeY) * 100;
              return (
                <div
                  key={`wd-html-${i}`}
                  className="absolute -translate-x-1/2 -translate-y-1/2 flex items-center justify-center w-5 h-5 rounded-full bg-[#3B6C4F] dark:bg-[#5C9C75] text-white text-[10px] font-bold ring-2 ring-card pointer-events-none"
                  style={{ left: `${xPct}%`, top: `${yPct}%` }}
                  title={`Rút ${fmt(w.amount ?? 0)}`}
                >
                  $
                </div>
              );
            })}
          </div>
        </div>

        {/* Y-axis labels — căn phải, đều */}
        <div
          className="absolute right-0 top-0 bottom-0 w-[84px]"
          style={{ paddingTop: PAD_TOP, paddingBottom: PAD_BOTTOM }}
        >
          <div className="relative h-full w-full">
            {sortedMilestones.map((m) => {
              if (m < minY || m > maxY) return null;
              const yPct = (1 - (m - minY) / rangeY) * 100;
              return (
                <div
                  key={m}
                  className="absolute right-0 -translate-y-1/2 text-sm font-bold text-foreground/80 tabular-nums tracking-tight text-right pl-2"
                  style={{ top: `${yPct}%`, minWidth: 76 }}
                >
                  {fmt(m)}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
