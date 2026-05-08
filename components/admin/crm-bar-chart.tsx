"use client";

import { cn } from "@/lib/utils";

export interface BarSeries {
  label: string;
  color: string;
  values: number[];
}

interface Props {
  labels: string[];
  series: BarSeries[];
  height?: number;
  formatValue?: (n: number) => string;
}

/**
 * Bar chart đơn giản dùng SVG. Mỗi label hiện 1 nhóm bars (1 hoặc nhiều series).
 * Auto-scale theo max value. Hover hiện value.
 */
export function CrmBarChart({ labels, series, height = 180, formatValue = (n) => String(n) }: Props) {
  const allValues = series.flatMap((s) => s.values);
  const max = Math.max(1, ...allValues);
  const padding = { top: 16, right: 8, bottom: 28, left: 8 };
  const groupCount = labels.length;
  const barsPerGroup = series.length;
  const groupGap = 16;
  const barGap = 2;

  return (
    <div className="w-full">
      <svg viewBox={`0 0 600 ${height}`} className="w-full" preserveAspectRatio="none">
        {/* Grid lines */}
        {[0.25, 0.5, 0.75].map((p) => (
          <line
            key={p}
            x1={padding.left}
            x2={600 - padding.right}
            y1={padding.top + (height - padding.top - padding.bottom) * (1 - p)}
            y2={padding.top + (height - padding.top - padding.bottom) * (1 - p)}
            stroke="currentColor"
            strokeOpacity={0.08}
            strokeDasharray="2 2"
          />
        ))}

        {labels.map((label, gi) => {
          const groupWidth = (600 - padding.left - padding.right - groupGap * (groupCount - 1)) / groupCount;
          const barWidth = (groupWidth - barGap * (barsPerGroup - 1)) / barsPerGroup;
          const groupX = padding.left + gi * (groupWidth + groupGap);

          return (
            <g key={label}>
              {series.map((s, si) => {
                const v = s.values[gi] ?? 0;
                const h = ((height - padding.top - padding.bottom) * v) / max;
                const x = groupX + si * (barWidth + barGap);
                const y = height - padding.bottom - h;
                return (
                  <g key={s.label}>
                    <rect
                      x={x}
                      y={y}
                      width={barWidth}
                      height={Math.max(2, h)}
                      fill={s.color}
                      rx={2}
                    >
                      <title>{`${label} — ${s.label}: ${formatValue(v)}`}</title>
                    </rect>
                  </g>
                );
              })}
              <text
                x={groupX + groupWidth / 2}
                y={height - 8}
                textAnchor="middle"
                className="fill-muted-foreground text-[10px]"
              >
                {label}
              </text>
            </g>
          );
        })}
      </svg>

      {series.length > 1 && (
        <div className="flex flex-wrap gap-3 mt-2 justify-center text-xs">
          {series.map((s) => (
            <div key={s.label} className="flex items-center gap-1.5">
              <span className={cn("h-2.5 w-2.5 rounded-sm")} style={{ background: s.color }} />
              <span className="text-muted-foreground">{s.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
