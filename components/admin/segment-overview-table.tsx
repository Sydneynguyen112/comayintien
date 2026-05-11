"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import {
  Table, TableHeader, TableRow, TableHead, TableBody, TableCell,
} from "@/components/ui/table";
import type { SegmentMetric } from "@/lib/admin/segments-api";

interface Props {
  title: string;
  rows: SegmentMetric[];
  labelMap: Record<string, { label: string; color?: string }>;
  showMultiAccountCol?: boolean;
}

/**
 * Bảng so sánh segment trong 1 chiều. Highlight row có retention cao nhất (xanh)
 * và thấp nhất (vàng). Mini bar trong cột Users để so sánh tỉ lệ.
 */
export function SegmentOverviewTable({ title, rows, labelMap, showMultiAccountCol = true }: Props) {
  const maxUsers = useMemo(() => Math.max(1, ...rows.map((r) => r.user_count)), [rows]);
  const maxRetention = useMemo(() => Math.max(...rows.map((r) => r.retention_28d_pct ?? 0)), [rows]);
  const minRetention = useMemo(() => Math.min(...rows.map((r) => r.retention_28d_pct ?? 100)), [rows]);

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <div className="rounded-2xl border border-border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Segment</TableHead>
              <TableHead>Users</TableHead>
              <TableHead>%</TableHead>
              <TableHead>Avg Habit</TableHead>
              <TableHead>Median trades/tuần</TableHead>
              <TableHead>Retention 28d</TableHead>
              {showMultiAccountCol && <TableHead>Multi-acct %</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={showMultiAccountCol ? 7 : 6} className="text-center py-6 text-muted-foreground">
                  Chưa có dữ liệu segment.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((r) => {
                const meta = labelMap[r.segment_value];
                const isTop = r.user_count > 0 && r.retention_28d_pct === maxRetention && rows.length > 1;
                const isBottom = r.user_count > 0 && r.retention_28d_pct === minRetention && rows.length > 1;
                return (
                  <TableRow
                    key={r.segment_value}
                    className={cn(
                      isTop && "bg-emerald-500/5",
                      isBottom && !isTop && "bg-amber-500/5",
                    )}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {meta?.color && (
                          <span className="h-2.5 w-2.5 rounded-sm shrink-0" style={{ background: meta.color }} />
                        )}
                        <span className="font-medium text-foreground">{meta?.label ?? r.segment_value}</span>
                        {isTop && <span className="text-[10px] text-emerald-500 font-semibold">⭐ Top retention</span>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-16 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full bg-gold rounded-full"
                            style={{ width: `${(r.user_count / maxUsers) * 100}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium tabular-nums">{r.user_count}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground tabular-nums">{r.pct_of_total}%</TableCell>
                    <TableCell className="text-sm tabular-nums">{Number(r.avg_habit_score ?? 0).toFixed(1)}</TableCell>
                    <TableCell className="text-sm tabular-nums">{Number(r.median_trades_per_week).toFixed(1)}</TableCell>
                    <TableCell className={cn(
                      "text-sm font-semibold tabular-nums",
                      r.retention_28d_pct >= 60 ? "text-emerald-500" : r.retention_28d_pct >= 30 ? "text-foreground" : "text-amber-500",
                    )}>
                      {r.retention_28d_pct}%
                    </TableCell>
                    {showMultiAccountCol && (
                      <TableCell className="text-xs text-muted-foreground tabular-nums">{r.multi_account_pct}%</TableCell>
                    )}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
