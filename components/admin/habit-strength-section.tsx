"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Sparkles, Crown, TrendingUp, Download } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { formatDistanceToNow, parseISO } from "date-fns";
import { vi } from "date-fns/locale";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table, TableHeader, TableRow, TableHead, TableBody, TableCell,
} from "@/components/ui/table";
import { KPICard } from "./kpi-card";
import { fetchHabitSummary, fetchHabitDistribution, fetchTopHabitUsers } from "@/lib/admin/engagement-api";

export function HabitStrengthSection() {
  const summaryQ = useQuery({
    queryKey: ["admin", "engagement", "habit-summary"],
    queryFn: fetchHabitSummary,
  });
  const distQ = useQuery({
    queryKey: ["admin", "engagement", "habit-distribution"],
    queryFn: fetchHabitDistribution,
  });
  const topQ = useQuery({
    queryKey: ["admin", "engagement", "top-habit-users"],
    queryFn: () => fetchTopHabitUsers(20),
  });

  const distData = useMemo(
    () => (distQ.data ?? []).map((d) => ({ bucket: `${d.bucket_start}-${d.bucket_start + 10}`, count: d.count })),
    [distQ.data],
  );

  function exportCsv() {
    if (!topQ.data) return;
    const header = ["Tên", "Email", "Total", "Frequency", "Consistency", "Recency", "Δ 7d", "Last active"];
    const rows = topQ.data.map((u) => [
      u.full_name, u.email, u.total_score, u.frequency_score, u.consistency_score, u.recency_score,
      u.delta_7d, u.last_active ?? "",
    ]);
    const csv = [header, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "top-habit-users.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-gold" />
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gold">2.1 Habit Strength</h2>
        <span className="text-xs text-muted-foreground">Score 0-100 (28 ngày): 40% Frequency + 30% Consistency + 30% Recency</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <KPICard
          label="Avg Habit Score"
          icon={Sparkles}
          value={summaryQ.data?.avg_score ?? 0}
          format="number"
          hint={`${summaryQ.data?.total_scored_users ?? 0} user scored`}
          loading={summaryQ.isLoading}
          highlight
        />
        <KPICard
          label="Power Users"
          icon={Crown}
          value={summaryQ.data?.power_users ?? 0}
          hint="score ≥ 70"
          loading={summaryQ.isLoading}
        />
        <KPICard
          label="Score Trend 7d"
          icon={TrendingUp}
          value={`${summaryQ.data && summaryQ.data.delta_7d >= 0 ? "+" : ""}${summaryQ.data?.delta_7d ?? 0}`}
          hint="avg vs tuần trước"
          loading={summaryQ.isLoading}
        />
      </div>

      <Card>
        <CardContent className="pt-5">
          <h3 className="text-sm font-semibold mb-3">Phân bố Habit Score</h3>
          {distQ.isLoading || distData.length === 0 ? (
            <div className="h-44 rounded-lg bg-muted/30 animate-pulse" />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={distData}>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.08} />
                <XAxis dataKey="bucket" fontSize={10} />
                <YAxis fontSize={10} />
                <Tooltip
                  contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
                />
                <Bar dataKey="count" fill="#CD9C20" radius={[3, 3, 0, 0]} name="User" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Top 20 user theo Habit Score</h3>
            <Button variant="outline" size="sm" onClick={exportCsv} disabled={!topQ.data?.length}>
              <Download className="h-3.5 w-3.5 mr-1.5" /> CSV
            </Button>
          </div>
          <div className="overflow-x-auto rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Freq</TableHead>
                  <TableHead>Cons</TableHead>
                  <TableHead>Rec</TableHead>
                  <TableHead>Δ 7d</TableHead>
                  <TableHead>Last active</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topQ.isLoading ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-6 text-muted-foreground">Đang tải...</TableCell></TableRow>
                ) : topQ.data?.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-6 text-muted-foreground">Chưa có habit score nào.</TableCell></TableRow>
                ) : (
                  topQ.data?.map((u) => (
                    <TableRow key={u.user_id}>
                      <TableCell>
                        <Link href={`/admin/khach-hang/${u.user_id}`} className="hover:opacity-80">
                          <div className="font-medium text-foreground hover:text-gold transition-colors">{u.full_name}</div>
                          <div className="text-[11px] text-muted-foreground">{u.email}</div>
                        </Link>
                      </TableCell>
                      <TableCell className="text-sm font-bold text-gold tabular-nums">{Number(u.total_score).toFixed(0)}</TableCell>
                      <TableCell className="text-xs tabular-nums">{Number(u.frequency_score).toFixed(0)}</TableCell>
                      <TableCell className="text-xs tabular-nums">{Number(u.consistency_score).toFixed(0)}</TableCell>
                      <TableCell className="text-xs tabular-nums">{Number(u.recency_score).toFixed(0)}</TableCell>
                      <TableCell className={`text-xs tabular-nums ${Number(u.delta_7d) >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                        {Number(u.delta_7d) >= 0 ? "+" : ""}{Number(u.delta_7d).toFixed(1)}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {u.last_active ? formatDistanceToNow(parseISO(u.last_active), { addSuffix: true, locale: vi }) : "—"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
