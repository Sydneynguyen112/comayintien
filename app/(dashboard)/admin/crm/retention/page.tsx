"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Repeat, UserCheck, UserMinus, RotateCcw, AlertTriangle, Activity,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import {
  LineChart, Line, AreaChart, Area, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { useCurrentUser } from "@/lib/auth";
import { PageTransition } from "@/components/shared/PageTransition";
import { Card, CardContent } from "@/components/ui/card";
import { KPICard } from "@/components/admin/kpi-card";
import { CohortHeatmap } from "@/components/admin/cohort-heatmap";
import { AtRiskTable } from "@/components/admin/at-risk-table";
import {
  fetchCohortRetention,
  fetchChurnSnapshot,
  fetchWeeklyChurnRate,
  fetchActiveChurnedSeries,
  fetchResurrectionRate,
  fetchAtRiskUsers,
} from "@/lib/admin/retention-api";

export default function AdminRetentionPage() {
  const admin = useCurrentUser("admin");

  const cohortQ = useQuery({
    queryKey: ["admin", "retention", "cohort"],
    queryFn: () => fetchCohortRetention(12),
  });
  const snapshotQ = useQuery({
    queryKey: ["admin", "retention", "snapshot"],
    queryFn: fetchChurnSnapshot,
  });
  const churnQ = useQuery({
    queryKey: ["admin", "retention", "weekly-churn"],
    queryFn: () => fetchWeeklyChurnRate(12),
  });
  const seriesQ = useQuery({
    queryKey: ["admin", "retention", "active-churned-series"],
    queryFn: () => fetchActiveChurnedSeries(90),
  });
  const resurrectionQ = useQuery({
    queryKey: ["admin", "retention", "resurrection"],
    queryFn: fetchResurrectionRate,
  });
  const atRiskQ = useQuery({
    queryKey: ["admin", "retention", "at-risk"],
    queryFn: fetchAtRiskUsers,
  });

  if (!admin) {
    return <div className="flex items-center justify-center min-h-[60vh] text-muted-foreground">Đang tải...</div>;
  }

  const snapshot = snapshotQ.data;
  const reEngagedCount = atRiskQ.data?.filter((u) => u.last_action_at).length ?? 0;
  const successRate = (snapshot?.resurrected_30d ?? 0) > 0 && reEngagedCount > 0
    ? Math.round(((snapshot?.resurrected_30d ?? 0) / reEngagedCount) * 100)
    : 0;

  return (
    <PageTransition>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="space-y-6"
      >
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gold/15 flex items-center justify-center">
            <Repeat className="h-5 w-5 text-gold" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">
              <span className="gold-gradient-text">Retention & Churn</span>
            </h1>
            <p className="mt-0.5 text-muted-foreground text-sm">
              Cohort retention, churn analysis, at-risk users với action log
            </p>
          </div>
        </div>

        {/* Section 3.2 KPI Snapshot */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KPICard
            label="Active Users"
            icon={UserCheck}
            value={snapshot?.active_count ?? 0}
            hint="có trade 7 ngày qua"
            loading={snapshotQ.isLoading}
          />
          <KPICard
            label="Churned Users"
            icon={UserMinus}
            value={snapshot?.churned_count ?? 0}
            hint="im lặng >21 ngày"
            loading={snapshotQ.isLoading}
          />
          <KPICard
            label="Re-engaged 30d"
            icon={RotateCcw}
            value={snapshot?.resurrected_30d ?? 0}
            hint="quay lại sau khi churn"
            loading={snapshotQ.isLoading}
          />
          <KPICard
            label="Resurrection Rate"
            icon={Activity}
            value={resurrectionQ.data ?? 0}
            format="percent"
            hint="trên tổng từng churn"
            loading={resurrectionQ.isLoading}
          />
        </div>

        {/* Section 3.1 Cohort heatmap */}
        <Card>
          <CardContent className="pt-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold">Cohort Retention · 12 tuần</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  % user mỗi cohort còn log trade ở các tuần kế tiếp. Flatten ≥30% sau M2 = PMF signal.
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

        {/* Charts row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardContent className="pt-5">
              <h3 className="text-sm font-semibold mb-3">Weekly Churn Rate · 12 tuần</h3>
              {churnQ.isLoading || !churnQ.data ? (
                <div className="h-44 rounded-lg bg-muted/30 animate-pulse" />
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={churnQ.data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.08} />
                    <XAxis dataKey="week_start" tickFormatter={(d) => format(parseISO(d), "d/M")} fontSize={10} />
                    <YAxis fontSize={10} unit="%" />
                    <Tooltip
                      contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
                      labelFormatter={(d) => `Tuần ${format(parseISO(d), "d/M/yyyy")}`}
                      formatter={(v) => `${v}%`}
                    />
                    <Line type="monotone" dataKey="churn_rate" stroke="#B8512E" strokeWidth={2} dot={{ r: 2 }} name="Churn rate" />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-5">
              <h3 className="text-sm font-semibold mb-3">Active vs Churned · 90 ngày</h3>
              {seriesQ.isLoading || !seriesQ.data ? (
                <div className="h-44 rounded-lg bg-muted/30 animate-pulse" />
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={seriesQ.data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.08} />
                    <XAxis dataKey="day" tickFormatter={(d) => format(parseISO(d), "d/M")} fontSize={10} interval={Math.floor(seriesQ.data.length / 8)} />
                    <YAxis fontSize={10} />
                    <Tooltip
                      contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
                      labelFormatter={(d) => format(parseISO(d), "d/M/yyyy")}
                    />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Area type="monotone" dataKey="active_count" stackId="1" stroke="#3B6C4F" fill="#3B6C4F" fillOpacity={0.6} name="Active" />
                    <Area type="monotone" dataKey="churned_count" stackId="1" stroke="#B8512E" fill="#B8512E" fillOpacity={0.5} name="Churned" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Section 3.3 At-Risk Users */}
        <Card>
          <CardContent className="pt-5 space-y-4">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5" />
                <div>
                  <h3 className="text-sm font-semibold text-foreground">At-Risk Users · {atRiskQ.data?.length ?? 0}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Frequency drop · silent · low activation. Click "Log re-engagement" để ghi action.
                  </p>
                </div>
              </div>
              <div className="text-right text-xs text-muted-foreground">
                <div>Re-engaged action: <span className="text-foreground font-medium">{reEngagedCount}</span></div>
                <div>Success rate ước tính: <span className="text-emerald-500 font-medium">{successRate}%</span></div>
              </div>
            </div>
            {atRiskQ.isLoading || !atRiskQ.data ? (
              <div className="h-40 rounded-lg bg-muted/30 animate-pulse" />
            ) : (
              <AtRiskTable users={atRiskQ.data} adminId={admin.id} />
            )}
          </CardContent>
        </Card>
      </motion.div>
    </PageTransition>
  );
}
