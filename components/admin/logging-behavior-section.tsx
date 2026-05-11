"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Activity, Flame, Clock, Wallet } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { KPICard } from "./kpi-card";
import { fetchLoggingBehavior, fetchActivityHeatmap, fetchStreakDistribution } from "@/lib/admin/engagement-api";

const DAY_LABELS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

export function LoggingBehaviorSection() {
  const behaviorQ = useQuery({
    queryKey: ["admin", "engagement", "logging-behavior"],
    queryFn: fetchLoggingBehavior,
  });
  const heatmapQ = useQuery({
    queryKey: ["admin", "engagement", "heatmap"],
    queryFn: fetchActivityHeatmap,
  });
  const streakQ = useQuery({
    queryKey: ["admin", "engagement", "streak-distribution"],
    queryFn: fetchStreakDistribution,
  });

  // Pivot heatmap
  const heatmapGrid = useMemo(() => {
    const grid: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
    let max = 0;
    (heatmapQ.data ?? []).forEach((c) => {
      grid[c.day_of_week][c.hour_of_day] = c.event_count;
      if (c.event_count > max) max = c.event_count;
    });
    return { grid, max };
  }, [heatmapQ.data]);

  function heatColor(count: number, max: number): string {
    if (count === 0 || max === 0) return "bg-muted/30";
    const intensity = count / max;
    if (intensity < 0.2) return "bg-gold/15";
    if (intensity < 0.4) return "bg-gold/30";
    if (intensity < 0.6) return "bg-gold/50";
    if (intensity < 0.8) return "bg-gold/70";
    return "bg-gold";
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Activity className="h-4 w-4 text-gold" />
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gold">2.3 Logging Behavior</h2>
        <span className="text-xs text-muted-foreground">Hành vi nhập liệu — heatmap, streak, gap</span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard
          label="Median trades/tuần"
          icon={Activity}
          value={Number(behaviorQ.data?.median_trades_per_week ?? 0).toFixed(1)}
          hint="4 tuần qua"
          loading={behaviorQ.isLoading}
        />
        <KPICard
          label="Median sessions/ngày"
          icon={Clock}
          value={Number(behaviorQ.data?.median_sessions_per_day ?? 0).toFixed(1)}
          hint="30 ngày qua"
          loading={behaviorQ.isLoading}
        />
        <KPICard
          label="Median gap (giờ)"
          icon={Clock}
          value={`${Number(behaviorQ.data?.median_gap_hours ?? 0).toFixed(1)}h`}
          hint="giữa 2 lần trade"
          loading={behaviorQ.isLoading}
        />
        <KPICard
          label="% có rút tiền"
          icon={Wallet}
          value={Number(behaviorQ.data?.withdrawal_user_pct ?? 0).toFixed(1)}
          format="percent"
          hint="trong 30 ngày"
          loading={behaviorQ.isLoading}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-5">
            <h3 className="text-sm font-semibold mb-3">Thời điểm user vào app · 30 ngày</h3>
            {heatmapQ.isLoading ? (
              <div className="h-56 rounded-lg bg-muted/30 animate-pulse" />
            ) : (
              <div className="overflow-x-auto">
                <table className="border-collapse">
                  <thead>
                    <tr>
                      <th className="w-8 text-[10px] text-muted-foreground" />
                      {Array.from({ length: 24 }, (_, h) => (
                        <th key={h} className="text-[9px] text-muted-foreground font-normal w-5 px-px">
                          {h % 3 === 0 ? h : ""}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[1, 2, 3, 4, 5, 6, 0].map((dow) => (
                      <tr key={dow}>
                        <td className="text-[10px] text-muted-foreground pr-1 align-middle">{DAY_LABELS[dow]}</td>
                        {Array.from({ length: 24 }, (_, h) => {
                          const v = heatmapGrid.grid[dow][h];
                          return (
                            <td key={h} className="px-px">
                              <div
                                className={cn("h-4 w-4 rounded-sm", heatColor(v, heatmapGrid.max))}
                                title={`${DAY_LABELS[dow]} ${h}h · ${v} event`}
                              />
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="flex items-center gap-2 mt-2 text-[10px] text-muted-foreground">
                  <span>Ít</span>
                  <div className="h-3 w-3 rounded-sm bg-gold/15" />
                  <div className="h-3 w-3 rounded-sm bg-gold/30" />
                  <div className="h-3 w-3 rounded-sm bg-gold/50" />
                  <div className="h-3 w-3 rounded-sm bg-gold/70" />
                  <div className="h-3 w-3 rounded-sm bg-gold" />
                  <span>Nhiều</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            <h3 className="text-sm font-semibold mb-3">Streak phân bố · trade liên tục</h3>
            {streakQ.isLoading ? (
              <div className="h-44 rounded-lg bg-muted/30 animate-pulse" />
            ) : streakQ.data?.length === 0 ? (
              <p className="text-sm text-muted-foreground py-12 text-center">
                Chưa có streak active. Cần user trade liên tục trong nhiều ngày.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={streakQ.data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.08} />
                  <XAxis dataKey="bucket" fontSize={11} />
                  <YAxis fontSize={10} />
                  <Tooltip
                    contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
                  />
                  <Bar dataKey="user_count" fill="#3B6C4F" radius={[3, 3, 0, 0]} name="User">
                    {(streakQ.data ?? []).map((d, idx) => {
                      // Highlight buckets ≥15d
                      const isLong = d.bucket === "15-30d" || d.bucket === "31-60d" || d.bucket === "60d+";
                      return <Bar key={idx} dataKey="user_count" fill={isLong ? "#CD9C20" : "#3B6C4F"} />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
