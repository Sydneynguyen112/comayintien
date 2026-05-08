"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Users as UsersIcon,
  UserCheck,
  Coins,
  TrendingUp,
  TrendingDown,
  Activity,
  ChartLine,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { cn, formatDate } from "@/lib/utils";
import { PageTransition } from "@/components/shared/PageTransition";
import { Card, CardContent } from "@/components/ui/card";
import { CrmBarChart } from "@/components/admin/crm-bar-chart";
import { CrmMethodBreakdown } from "@/components/admin/crm-method-breakdown";

interface ProfileLite {
  id: string;
  full_name: string;
  email: string;
  role: string;
  created_at: string;
}

interface AccessLite {
  user_id: string;
  status: string;
  last_seen_at: string | null;
}

interface MachineLite {
  id: string;
  user_id: string;
  status: string;
  method: string | null;
}

interface TxLite {
  user_id: string;
  type: string;
  amount: number;
  created_at: string;
}

function formatVnd(n: number) {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toString();
}

function weekKey(iso: string): string {
  const d = new Date(iso);
  const monday = new Date(d);
  monday.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  monday.setHours(0, 0, 0, 0);
  return monday.toISOString().slice(0, 10);
}

function monthKey(iso: string): string {
  return iso.slice(0, 7);
}

function daysSince(iso: string | null): number {
  if (!iso) return 999;
  return Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24));
}

export default function AdminCrmPage() {
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<ProfileLite[]>([]);
  const [access, setAccess] = useState<AccessLite[]>([]);
  const [machines, setMachines] = useState<MachineLite[]>([]);
  const [transactions, setTransactions] = useState<TxLite[]>([]);

  useEffect(() => {
    (async () => {
      const [p, a, m, tx] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, full_name, email, role, created_at")
          .in("role", ["student", "mentor"]),
        supabase
          .from("apps_access")
          .select("user_id, status, last_seen_at")
          .eq("app", "comay"),
        supabase.from("machines").select("id, user_id, status, method"),
        supabase.from("machine_tx").select("user_id, type, amount, created_at"),
      ]);
      setProfiles((p.data ?? []) as ProfileLite[]);
      setAccess((a.data ?? []) as AccessLite[]);
      setMachines((m.data ?? []) as MachineLite[]);
      setTransactions((tx.data ?? []) as TxLite[]);
      setLoading(false);
    })();
  }, []);

  // ── Aggregates ─────────────────────────────────────
  const kpis = useMemo(() => {
    const approvedIds = new Set(access.filter((a) => a.status === "approved").map((a) => a.user_id));
    const customers = profiles.filter((p) => p.role === "student" && approvedIds.has(p.id));
    const mentors = profiles.filter((p) => p.role === "mentor" && approvedIds.has(p.id));
    const totalMachines = machines.length;
    const activeMachines = machines.filter((m) => m.status !== "closed").length;
    const lifetimeWithdrawn = transactions
      .filter((t) => t.type === "withdraw")
      .reduce((s, t) => s + (t.amount || 0), 0);
    const lifetimeDeposited = transactions
      .filter((t) => t.type === "deposit")
      .reduce((s, t) => s + (t.amount || 0), 0);
    const active7d = access.filter((a) => daysSince(a.last_seen_at) <= 7).length;
    const pending = access.filter((a) => a.status === "pending").length;
    return {
      customerCount: customers.length,
      mentorCount: mentors.length,
      totalMachines,
      activeMachines,
      lifetimeWithdrawn,
      lifetimeDeposited,
      active7d,
      pending,
    };
  }, [profiles, access, machines, transactions]);

  // 12 weeks customer growth
  const weeklyGrowth = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weeks: { key: string; label: string; count: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const monday = new Date(today);
      monday.setDate(today.getDate() - ((today.getDay() + 6) % 7) - i * 7);
      const key = monday.toISOString().slice(0, 10);
      weeks.push({ key, label: `${monday.getDate()}/${monday.getMonth() + 1}`, count: 0 });
    }
    const byWeek = new Map(weeks.map((w) => [w.key, w]));
    profiles.forEach((p) => {
      const w = byWeek.get(weekKey(p.created_at));
      if (w) w.count += 1;
    });
    return weeks;
  }, [profiles]);

  // 6 months money flow
  const monthlyMoney = useMemo(() => {
    const months: { key: string; label: string; deposit: number; withdraw: number }[] = [];
    const today = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const key = d.toISOString().slice(0, 7);
      months.push({ key, label: `T${d.getMonth() + 1}`, deposit: 0, withdraw: 0 });
    }
    const byMonth = new Map(months.map((m) => [m.key, m]));
    transactions.forEach((t) => {
      const m = byMonth.get(monthKey(t.created_at));
      if (!m) return;
      if (t.type === "withdraw") m.withdraw += t.amount || 0;
      if (t.type === "deposit") m.deposit += t.amount || 0;
    });
    return months;
  }, [transactions]);

  // Method distribution
  const methodEntries = useMemo(() => {
    const counts = new Map<string, number>();
    machines.forEach((m) => {
      const k = m.method || "Khác";
      counts.set(k, (counts.get(k) ?? 0) + 1);
    });
    return Array.from(counts.entries()).map(([method, count]) => ({ method, count }));
  }, [machines]);

  // Top 10 customers by lifetime withdrawn
  const topCustomers = useMemo(() => {
    const totals = new Map<string, number>();
    transactions.forEach((t) => {
      if (t.type !== "withdraw") return;
      totals.set(t.user_id, (totals.get(t.user_id) ?? 0) + (t.amount || 0));
    });
    const profileMap = new Map(profiles.map((p) => [p.id, p]));
    return Array.from(totals.entries())
      .map(([userId, amount]) => ({
        userId,
        amount,
        profile: profileMap.get(userId),
      }))
      .filter((x) => x.profile)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10);
  }, [transactions, profiles]);

  // Top 10 most active (last_seen)
  const recentActive = useMemo(() => {
    const profileMap = new Map(profiles.map((p) => [p.id, p]));
    return [...access]
      .filter((a) => a.last_seen_at && profileMap.has(a.user_id))
      .sort((a, b) => (b.last_seen_at ?? "").localeCompare(a.last_seen_at ?? ""))
      .slice(0, 10)
      .map((a) => ({ access: a, profile: profileMap.get(a.user_id)! }));
  }, [access, profiles]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-muted-foreground">
        Đang tải CRM data...
      </div>
    );
  }

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
            <ChartLine className="h-5 w-5 text-gold" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">
              <span className="gold-gradient-text">CRM Dashboard</span>
            </h1>
            <p className="mt-0.5 text-muted-foreground text-sm">
              Chỉ số tổng quan để đánh giá chất lượng khách hàng và phát hiện cơ hội mới
            </p>
          </div>
        </div>

        {/* KPI strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          <Kpi icon={UsersIcon} label="Khách hàng" value={kpis.customerCount.toString()} hint="đã duyệt" tone="text-blue-500" />
          <Kpi icon={UserCheck} label="Mentor" value={kpis.mentorCount.toString()} hint="đã duyệt" tone="text-amber-500" />
          <Kpi icon={Coins} label="Cỗ máy" value={`${kpis.activeMachines}/${kpis.totalMachines}`} hint="active / tổng" tone="text-gold" />
          <Kpi icon={TrendingUp} label="Đã rút" value={formatVnd(kpis.lifetimeWithdrawn)} hint="lifetime" tone="text-emerald-500" />
          <Kpi icon={TrendingDown} label="Đã nạp" value={formatVnd(kpis.lifetimeDeposited)} hint="lifetime" tone="text-orange-500" />
          <Kpi icon={Activity} label="Active 7d" value={kpis.active7d.toString()} hint="user/tuần" tone="text-foreground" />
          <Kpi icon={UsersIcon} label="Chờ duyệt" value={kpis.pending.toString()} hint="pending" tone="text-gold" />
        </div>

        {/* Charts row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardContent className="pt-5">
              <h3 className="text-sm font-semibold text-foreground mb-3">Tăng trưởng đăng ký 12 tuần</h3>
              <CrmBarChart
                labels={weeklyGrowth.map((w) => w.label)}
                series={[{ label: "User mới", color: "#CD9C20", values: weeklyGrowth.map((w) => w.count) }]}
                formatValue={(n) => `${n} user`}
              />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-5">
              <h3 className="text-sm font-semibold text-foreground mb-3">Dòng tiền 6 tháng</h3>
              <CrmBarChart
                labels={monthlyMoney.map((m) => m.label)}
                series={[
                  { label: "Đã rút", color: "#3B6C4F", values: monthlyMoney.map((m) => m.withdraw) },
                  { label: "Đã nạp", color: "#B8512E", values: monthlyMoney.map((m) => m.deposit) },
                ]}
                formatValue={(n) => formatVnd(n)}
              />
            </CardContent>
          </Card>
        </div>

        {/* Row 2: method + top customers */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardContent className="pt-5">
              <h3 className="text-sm font-semibold text-foreground mb-3">Phương pháp giao dịch</h3>
              <CrmMethodBreakdown entries={methodEntries} />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-5">
              <h3 className="text-sm font-semibold text-foreground mb-3">Top 10 khách hàng theo tiền rút</h3>
              {topCustomers.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  Chưa có khách hàng rút tiền.
                </p>
              ) : (
                <div className="space-y-2">
                  {topCustomers.map((tc, i) => (
                    <Link
                      key={tc.userId}
                      href={`/admin/khach-hang/${tc.userId}`}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <span className={cn(
                        "text-xs font-bold w-6 text-center",
                        i === 0 ? "text-gold" : i < 3 ? "text-foreground" : "text-muted-foreground",
                      )}>
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{tc.profile!.full_name}</div>
                        <div className="text-xs text-muted-foreground truncate">{tc.profile!.email}</div>
                      </div>
                      <div className="text-sm font-semibold text-emerald-500 tabular-nums">
                        {formatVnd(tc.amount)}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent activity */}
        <Card>
          <CardContent className="pt-5">
            <h3 className="text-sm font-semibold text-foreground mb-3">Hoạt động gần nhất</h3>
            {recentActive.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">
                Chưa có dữ liệu hoạt động.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {recentActive.map(({ access: a, profile: p }) => {
                  const days = daysSince(a.last_seen_at);
                  return (
                    <Link
                      key={p.id}
                      href={`/admin/khach-hang/${p.id}`}
                      className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg border border-border hover:border-gold/30 hover:bg-gold/5 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{p.full_name}</div>
                        <div className="text-xs text-muted-foreground truncate">{p.email}</div>
                      </div>
                      <div className="text-xs text-right shrink-0">
                        <div className="font-semibold text-foreground">
                          {days === 0 ? "Hôm nay" : days === 1 ? "Hôm qua" : `${days} ngày`}
                        </div>
                        <div className="text-muted-foreground">
                          {a.last_seen_at ? formatDate(a.last_seen_at) : "—"}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </PageTransition>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: typeof UsersIcon;
  label: string;
  value: string;
  hint: string;
  tone: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className={cn("mt-1 text-lg font-bold", tone)}>{value}</div>
      <div className="text-[10px] text-muted-foreground/70 uppercase tracking-wide">{hint}</div>
    </div>
  );
}
