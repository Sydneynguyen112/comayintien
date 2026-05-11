"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  ChartLine, Star, Users, Activity, UserPlus, Target, Crown, Flame, Repeat, Filter,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { PageTransition } from "@/components/shared/PageTransition";
import { Card, CardContent } from "@/components/ui/card";
import { KPICard } from "@/components/admin/kpi-card";
import { ActionRequiredStrip } from "@/components/admin/action-required-strip";
import { PriorityCustomerLists } from "@/components/admin/priority-customer-lists";
import { CohortHeatmap } from "@/components/admin/cohort-heatmap";
import { fetchOverviewKpis, fetchOverviewSeries } from "@/lib/admin/overview-api";
import {
  fetchCohortRetention, fetchActiveChurnedSeries, fetchChurnSnapshot,
} from "@/lib/admin/retention-api";
import {
  fetchHabitSummary, fetchTierDistribution, TIER_META,
} from "@/lib/admin/engagement-api";
import { fetchSegmentMetrics, STYLE_META } from "@/lib/admin/segments-api";
import { fetchNpsSummary } from "@/lib/admin/voc-api";

const TIER_ORDER = ["power", "core", "casual", "at_risk", "dormant", "churned"];

export default function AdminUnifiedDashboard() {
  const overviewQ = useQuery({ queryKey: ["admin", "overview", "kpis"], queryFn: fetchOverviewKpis });
  const seriesQ = useQuery({ queryKey: ["admin", "overview", "series"], queryFn: fetchOverviewSeries });
  const snapshotQ = useQuery({ queryKey: ["admin", "retention", "snapshot"], queryFn: fetchChurnSnapshot });
  const cohortQ = useQuery({ queryKey: ["admin", "retention", "cohort-8"], queryFn: () => fetchCohortRetention(8) });
  const acSeriesQ = useQuery({ queryKey: ["admin", "retention", "ac-90"], queryFn: () => fetchActiveChurnedSeries(60) });
  const habitQ = useQuery({ queryKey: ["admin", "engagement", "habit-summary"], queryFn: fetchHabitSummary });
  const tierQ = useQuery({ queryKey: ["admin", "engagement", "tier-distribution"], queryFn: fetchTierDistribution });
  const styleQ = useQuery({ queryKey: ["admin", "segments", "metrics", "trading_style"], queryFn: () => fetchSegmentMetrics("trading_style") });
  const npsQ = useQuery({ queryKey: ["admin", "voc", "nps-summary"], queryFn: () => fetchNpsSummary(90) });

  const tierPie = TIER_ORDER
    .map((t) => {
      const row = tierQ.data?.find((d) => d.tier === t);
      return { tier: t, value: row?.user_count ?? 0, label: TIER_META[t]?.label ?? t };
    })
    .filter((d) => d.value > 0);

  return (
    <PageTransition>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="space-y-5"
      >
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gold/15 flex items-center justify-center">
            <ChartLine className="h-5 w-5 text-gold" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">
              <span className="gold-gradient-text">Dashboard</span>
            </h1>
            <p className="mt-0.5 text-muted-foreground text-sm">
              Hằng ngày kiểm tra chỉ số quan trọng + khách hàng cần action
            </p>
          </div>
        </div>

        {/* Action required — daily */}
        <ActionRequiredStrip />

        {/* Priority customer lists */}
        <PriorityCustomerLists />

        {/* Daily health KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          <KPICard
            label="WAU Loggers ⭐"
            icon={Star}
            value={overviewQ.data?.wau_loggers.current ?? 0}
            current={overviewQ.data?.wau_loggers.current}
            previous={overviewQ.data?.wau_loggers.previous}
            hint="≥3 trade trong 7d"
            trendData={seriesQ.data?.wauLoggers12w}
            loading={overviewQ.isLoading}
            highlight
          />
          <KPICard
            label="DAU"
            icon={Users}
            value={overviewQ.data?.dau.current ?? 0}
            current={overviewQ.data?.dau.current}
            previous={overviewQ.data?.dau.previous}
            hint="vs hôm qua"
            loading={overviewQ.isLoading}
          />
          <KPICard
            label="Stickiness"
            icon={Activity}
            value={overviewQ.data?.stickiness.current ?? 0}
            format="percent"
            current={overviewQ.data?.stickiness.current}
            previous={overviewQ.data?.stickiness.previous}
            hint="DAU/MAU · >20% tốt"
            loading={overviewQ.isLoading}
          />
          <KPICard
            label="Avg Habit"
            icon={Flame}
            value={habitQ.data?.avg_score ?? 0}
            hint={`${habitQ.data?.power_users ?? 0} power user`}
            loading={habitQ.isLoading}
          />
          <KPICard
            label="Active 7d"
            icon={Activity}
            value={snapshotQ.data?.active_count ?? 0}
            hint={`${snapshotQ.data?.churned_count ?? 0} churned`}
            loading={snapshotQ.isLoading}
          />
          <KPICard
            label="New Signups"
            icon={UserPlus}
            value={overviewQ.data?.new_signups.current ?? 0}
            current={overviewQ.data?.new_signups.current}
            previous={overviewQ.data?.new_signups.previous}
            hint="7d · vs tuần trước"
            loading={overviewQ.isLoading}
          />
          <KPICard
            label="NPS"
            icon={Target}
            value={npsQ.data?.nps_score ?? 0}
            hint={`${npsQ.data?.total_responses ?? 0} response · 90d`}
            loading={npsQ.isLoading}
          />
        </div>

        {/* Charts row 1: growth + retention */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-5">
              <h3 className="text-sm font-semibold mb-3">WAU Loggers · 12 tuần</h3>
              {seriesQ.isLoading || !seriesQ.data ? (
                <div className="h-40 rounded-lg bg-muted/30 animate-pulse" />
              ) : (
                <ResponsiveContainer width="100%" height={160}>
                  <LineChart data={seriesQ.data.wauLoggers12w}>
                    <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.08} />
                    <XAxis dataKey="date" tickFormatter={(d) => format(parseISO(d), "d/M")} fontSize={10} />
                    <YAxis fontSize={10} />
                    <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
                    <Line type="monotone" dataKey="value" stroke="#CD9C20" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-5">
              <h3 className="text-sm font-semibold mb-3">DAU / WAU / MAU · 90 ngày</h3>
              {seriesQ.isLoading || !seriesQ.data ? (
                <div className="h-40 rounded-lg bg-muted/30 animate-pulse" />
              ) : (
                <ResponsiveContainer width="100%" height={160}>
                  <LineChart data={seriesQ.data.activeUsers90d}>
                    <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.08} />
                    <XAxis dataKey="date" tickFormatter={(d) => format(parseISO(d), "d/M")} fontSize={10} interval={Math.floor(seriesQ.data.activeUsers90d.length / 6)} />
                    <YAxis fontSize={10} />
                    <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 10 }} />
                    <Line type="monotone" dataKey="dau" stroke="#3B6C4F" strokeWidth={1.5} dot={false} name="DAU" />
                    <Line type="monotone" dataKey="wau" stroke="#CD9C20" strokeWidth={1.5} dot={false} name="WAU" />
                    <Line type="monotone" dataKey="mau" stroke="#7E5BC9" strokeWidth={1.5} dot={false} name="MAU" />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-5">
              <h3 className="text-sm font-semibold mb-3">Active vs Churned · 60 ngày</h3>
              {acSeriesQ.isLoading || !acSeriesQ.data ? (
                <div className="h-40 rounded-lg bg-muted/30 animate-pulse" />
              ) : (
                <ResponsiveContainer width="100%" height={160}>
                  <AreaChart data={acSeriesQ.data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.08} />
                    <XAxis dataKey="day" tickFormatter={(d) => format(parseISO(d), "d/M")} fontSize={10} interval={Math.floor(acSeriesQ.data.length / 5)} />
                    <YAxis fontSize={10} />
                    <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 10 }} />
                    <Area type="monotone" dataKey="active_count" stackId="1" stroke="#3B6C4F" fill="#3B6C4F" fillOpacity={0.6} name="Active" />
                    <Area type="monotone" dataKey="churned_count" stackId="1" stroke="#B8512E" fill="#B8512E" fillOpacity={0.5} name="Churned" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Cohort + Tier + Style */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-1">
            <CardContent className="pt-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold">Tier hiện tại</h3>
                <Crown className="h-4 w-4 text-gold" />
              </div>
              {tierQ.isLoading || tierPie.length === 0 ? (
                <div className="h-40 rounded-lg bg-muted/30 animate-pulse" />
              ) : (
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={tierPie} dataKey="value" nameKey="label" innerRadius={36} outerRadius={66}>
                      {tierPie.map((d) => <Cell key={d.tier} fill={TIER_META[d.tier]?.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 9 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card className="lg:col-span-1">
            <CardContent className="pt-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold">Trading style</h3>
                <Filter className="h-4 w-4 text-gold" />
              </div>
              {styleQ.isLoading ? (
                <div className="h-40 rounded-lg bg-muted/30 animate-pulse" />
              ) : (
                <div className="space-y-2">
                  {(styleQ.data ?? []).slice(0, 5).map((s) => {
                    const meta = STYLE_META[s.segment_value];
                    return (
                      <div key={s.segment_value}>
                        <div className="flex items-center justify-between text-xs mb-0.5">
                          <span className="flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-sm" style={{ background: meta?.color ?? "#666" }} />
                            <span className="text-foreground font-medium">{meta?.label ?? s.segment_value}</span>
                          </span>
                          <span className="text-muted-foreground tabular-nums">
                            {s.user_count} · {s.retention_28d_pct}% retain
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${s.pct_of_total}%`, background: meta?.color ?? "#666" }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="lg:col-span-1">
            <CardContent className="pt-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold">New signups · 30 ngày</h3>
                <UserPlus className="h-4 w-4 text-gold" />
              </div>
              {seriesQ.isLoading || !seriesQ.data ? (
                <div className="h-40 rounded-lg bg-muted/30 animate-pulse" />
              ) : (
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={seriesQ.data.signups30d}>
                    <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.08} />
                    <XAxis dataKey="date" tickFormatter={(d) => format(parseISO(d), "d/M")} fontSize={10} interval={Math.floor(seriesQ.data.signups30d.length / 4)} />
                    <YAxis fontSize={10} />
                    <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
                    <Bar dataKey="value" fill="#CD9C20" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Cohort heatmap */}
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Repeat className="h-4 w-4 text-gold" /> Cohort Retention · 8 tuần
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Nếu sau ~2 tháng, retention vẫn giữ ≥30% và không giảm nữa → sản phẩm đã có nhóm user trung thành
                </p>
              </div>
            </div>
            {cohortQ.isLoading || !cohortQ.data ? (
              <div className="h-40 rounded-lg bg-muted/30 animate-pulse" />
            ) : (
              <CohortHeatmap data={cohortQ.data} />
            )}
          </CardContent>
        </Card>

      </motion.div>
    </PageTransition>
  );
}
