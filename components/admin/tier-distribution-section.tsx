"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Layers, ArrowUpRight, ArrowDownRight } from "lucide-react";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
} from "recharts";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  fetchTierDistribution, fetchTierHistorySeries, fetchTierMovements, TIER_META,
} from "@/lib/admin/engagement-api";

const TIER_ORDER = ["power", "core", "casual", "at_risk", "dormant", "churned"];

export function TierDistributionSection() {
  const distQ = useQuery({
    queryKey: ["admin", "engagement", "tier-distribution"],
    queryFn: fetchTierDistribution,
  });
  const historyQ = useQuery({
    queryKey: ["admin", "engagement", "tier-history"],
    queryFn: () => fetchTierHistorySeries(12),
  });
  const movementsQ = useQuery({
    queryKey: ["admin", "engagement", "tier-movements"],
    queryFn: () => fetchTierMovements(4),
  });

  const pieData = useMemo(() => {
    return TIER_ORDER.map((t) => {
      const row = distQ.data?.find((d) => d.tier === t);
      return { tier: t, value: row?.user_count ?? 0, label: TIER_META[t]?.label ?? t };
    }).filter((d) => d.value > 0);
  }, [distQ.data]);

  const stackedData = useMemo(() => {
    if (!historyQ.data) return [];
    const byWeek = new Map<string, Record<string, number | string>>();
    historyQ.data.forEach((row) => {
      const wk = row.week_start;
      if (!byWeek.has(wk)) byWeek.set(wk, { week_start: wk });
      byWeek.get(wk)![row.tier] = row.user_count;
    });
    return Array.from(byWeek.values()).sort((a, b) => String(a.week_start).localeCompare(String(b.week_start)));
  }, [historyQ.data]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Layers className="h-4 w-4 text-gold" />
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gold">2.2 Engagement Tier</h2>
        <span className="text-xs text-muted-foreground">Phân khúc theo số ngày active trong 28 ngày qua</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-5">
            <h3 className="text-sm font-semibold mb-3">Phân bố tier hiện tại</h3>
            {distQ.isLoading || pieData.length === 0 ? (
              <div className="h-56 rounded-lg bg-muted/30 animate-pulse" />
            ) : (
              <div className="flex items-center gap-4">
                <ResponsiveContainer width="50%" height={200}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="label"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                    >
                      {pieData.map((d) => (
                        <Cell key={d.tier} fill={TIER_META[d.tier]?.color ?? "#666"} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-1.5">
                  {pieData.map((d) => {
                    const total = pieData.reduce((s, x) => s + x.value, 0);
                    const pct = total > 0 ? ((d.value / total) * 100).toFixed(1) : "0";
                    return (
                      <div key={d.tier} className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: TIER_META[d.tier]?.color }} />
                          <span className="text-foreground">{d.label}</span>
                        </span>
                        <span className="text-muted-foreground tabular-nums">{d.value} ({pct}%)</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            <h3 className="text-sm font-semibold mb-3">Tier movement · 4 tuần qua</h3>
            {movementsQ.isLoading ? (
              <div className="h-44 rounded-lg bg-muted/30 animate-pulse" />
            ) : movementsQ.data?.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">Chưa có lịch sử tier để compare.</p>
            ) : (
              <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
                {movementsQ.data?.map((m, i) => {
                  const fromIdx = TIER_ORDER.indexOf(m.from_tier);
                  const toIdx = TIER_ORDER.indexOf(m.to_tier);
                  const isUpgrade = toIdx < fromIdx;
                  return (
                    <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-xs">
                      <Badge variant="outline" style={{ background: `${TIER_META[m.from_tier]?.color}20`, borderColor: TIER_META[m.from_tier]?.color, color: TIER_META[m.from_tier]?.color }}>
                        {TIER_META[m.from_tier]?.label ?? m.from_tier}
                      </Badge>
                      <span className={cn("text-xs", isUpgrade ? "text-emerald-500" : "text-amber-500")}>
                        {isUpgrade ? <ArrowUpRight className="h-3.5 w-3.5 inline" /> : <ArrowDownRight className="h-3.5 w-3.5 inline" />}
                      </span>
                      <Badge variant="outline" style={{ background: `${TIER_META[m.to_tier]?.color}20`, borderColor: TIER_META[m.to_tier]?.color, color: TIER_META[m.to_tier]?.color }}>
                        {TIER_META[m.to_tier]?.label ?? m.to_tier}
                      </Badge>
                      <span className="ml-auto font-semibold text-foreground tabular-nums">{m.user_count} user</span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-5">
          <h3 className="text-sm font-semibold mb-3">Tier trend · 12 tuần</h3>
          {historyQ.isLoading || stackedData.length === 0 ? (
            <div className="h-44 rounded-lg bg-muted/30 animate-pulse" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={stackedData}>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.08} />
                <XAxis dataKey="week_start" tickFormatter={(d) => format(parseISO(d as string), "d/M")} fontSize={10} />
                <YAxis fontSize={10} />
                <Tooltip
                  contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
                  labelFormatter={(d) => `Tuần ${format(parseISO(d as string), "d/M/yyyy")}`}
                />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                {TIER_ORDER.map((t) => (
                  <Bar key={t} dataKey={t} stackId="a" fill={TIER_META[t]?.color} name={TIER_META[t]?.label} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
