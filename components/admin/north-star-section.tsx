"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Star, Users, Activity, Sparkles, UserPlus, Target, AlertTriangle, ListPlus,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { KPICard } from "./kpi-card";
import { fetchOverviewKpis, fetchOverviewSeries } from "@/lib/admin/overview-api";

export function NorthStarSection() {
  const router = useRouter();
  const { data: kpis, isLoading: kpisLoading } = useQuery({
    queryKey: ["admin", "overview", "kpis"],
    queryFn: fetchOverviewKpis,
  });
  const { data: series, isLoading: seriesLoading } = useQuery({
    queryKey: ["admin", "overview", "series"],
    queryFn: fetchOverviewSeries,
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-gold" />
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gold">Habit & Retention</h2>
        <span className="text-xs text-muted-foreground">North Star Metric: WAU Loggers (user nhập ≥3 lệnh trong 7 ngày)</span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <KPICard
          label="WAU Loggers ⭐"
          icon={Star}
          value={kpis?.wau_loggers.current ?? 0}
          current={kpis?.wau_loggers.current}
          previous={kpis?.wau_loggers.previous}
          hint="vs tuần trước"
          highlight
          trendData={series?.wauLoggers12w}
          loading={kpisLoading}
        />
        <KPICard
          label="DAU"
          icon={Users}
          value={kpis?.dau.current ?? 0}
          current={kpis?.dau.current}
          previous={kpis?.dau.previous}
          hint="vs hôm qua"
          loading={kpisLoading}
        />
        <KPICard
          label="Stickiness"
          icon={Activity}
          value={kpis?.stickiness.current ?? 0}
          format="percent"
          current={kpis?.stickiness.current}
          previous={kpis?.stickiness.previous}
          hint="DAU/MAU · benchmark >20%"
          loading={kpisLoading}
        />
        <KPICard
          label="New Signups"
          icon={UserPlus}
          value={kpis?.new_signups.current ?? 0}
          current={kpis?.new_signups.current}
          previous={kpis?.new_signups.previous}
          hint="7 ngày · vs tuần trước"
          loading={kpisLoading}
        />
        <KPICard
          label="Activation Rate"
          icon={Target}
          value={kpis?.activation_rate.current ?? 0}
          format="percent"
          hint="≥7 trade trong 14d đầu"
          loading={kpisLoading}
        />
        <KPICard
          label="At-Risk Users"
          icon={AlertTriangle}
          value={kpis?.at_risk_users.current ?? 0}
          hint="im lặng ≥7 ngày"
          onClick={() => router.push("/admin/khach-hang")}
          loading={kpisLoading}
        />
        <KPICard
          label="Trades Today"
          icon={ListPlus}
          value={kpis?.trades_today.current ?? 0}
          current={kpis?.trades_today.current}
          previous={kpis?.trades_today.previous}
          hint="vs hôm qua"
          loading={kpisLoading}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-5">
            <h3 className="text-sm font-semibold mb-3">WAU Loggers · 12 tuần</h3>
            {seriesLoading || !series ? (
              <div className="h-44 rounded-lg bg-muted/30 animate-pulse" />
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={series.wauLoggers12w}>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.08} />
                  <XAxis dataKey="date" tickFormatter={(d) => format(parseISO(d), "d/M")} fontSize={10} />
                  <YAxis fontSize={10} />
                  <Tooltip
                    contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
                    labelFormatter={(d) => `Tuần KT ${format(parseISO(d), "d/M/yyyy")}`}
                  />
                  <Line type="monotone" dataKey="value" stroke="#CD9C20" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            <h3 className="text-sm font-semibold mb-3">DAU / WAU / MAU · 90 ngày</h3>
            {seriesLoading || !series ? (
              <div className="h-44 rounded-lg bg-muted/30 animate-pulse" />
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={series.activeUsers90d}>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.08} />
                  <XAxis dataKey="date" tickFormatter={(d) => format(parseISO(d), "d/M")} fontSize={10} interval={Math.floor(series.activeUsers90d.length / 8)} />
                  <YAxis fontSize={10} />
                  <Tooltip
                    contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
                    labelFormatter={(d) => format(parseISO(d), "d/M/yyyy")}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
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
            <h3 className="text-sm font-semibold mb-3">New Signups · 30 ngày</h3>
            {seriesLoading || !series ? (
              <div className="h-44 rounded-lg bg-muted/30 animate-pulse" />
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={series.signups30d}>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.08} />
                  <XAxis dataKey="date" tickFormatter={(d) => format(parseISO(d), "d/M")} fontSize={10} interval={Math.floor(series.signups30d.length / 6)} />
                  <YAxis fontSize={10} />
                  <Tooltip
                    contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
                    labelFormatter={(d) => format(parseISO(d), "d/M/yyyy")}
                  />
                  <Bar dataKey="value" fill="#CD9C20" radius={[3, 3, 0, 0]} name="Signups" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
