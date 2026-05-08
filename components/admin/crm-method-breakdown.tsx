"use client";

import { cn } from "@/lib/utils";

interface MethodEntry {
  method: string;
  count: number;
}

interface Props {
  entries: MethodEntry[];
}

const palette = [
  "#CD9C20",
  "#3B6C4F",
  "#7E5BC9",
  "#B8512E",
  "#3081A4",
  "#C46493",
  "#6B7280",
];

/**
 * Bar list dọc — tỷ lệ % phương pháp giao dịch trong toàn hệ thống.
 */
export function CrmMethodBreakdown({ entries }: Props) {
  if (entries.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">
        Chưa có cỗ máy nào được tạo.
      </p>
    );
  }
  const total = entries.reduce((s, e) => s + e.count, 0) || 1;
  const sorted = [...entries].sort((a, b) => b.count - a.count);

  return (
    <div className="space-y-2.5">
      {sorted.map((e, i) => {
        const pct = (e.count / total) * 100;
        const color = palette[i % palette.length];
        return (
          <div key={e.method}>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-foreground font-medium truncate">{e.method || "Chưa khai báo"}</span>
              <span className="text-muted-foreground tabular-nums">
                {e.count} <span className="text-xs">({pct.toFixed(0)}%)</span>
              </span>
            </div>
            <div className={cn("h-2 rounded-full bg-muted overflow-hidden")}>
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${Math.max(2, pct)}%`, background: color }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
