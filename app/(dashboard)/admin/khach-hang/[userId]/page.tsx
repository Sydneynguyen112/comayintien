"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Calendar,
  Mail,
  Phone,
  Coins,
  TrendingDown,
  TrendingUp,
  Activity,
  ClockAlert,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useCurrentUser, type Profile } from "@/lib/auth";
import { cn, formatDate } from "@/lib/utils";
import { PageTransition } from "@/components/shared/PageTransition";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserRowActions, type UserStatus } from "@/components/admin/user-row-actions";
import { MentorAssignSelect } from "@/components/admin/mentor-assign-select";
import { ActivityTimeline } from "@/components/admin/activity-timeline";
import { RoleChangeSelect } from "@/components/admin/role-change-select";
import { CustomerMachineCard } from "@/components/admin/customer-machine-card";

interface AccessRow {
  user_id: string;
  status: UserStatus;
  granted_at: string;
  approved_at: string | null;
  last_seen_at: string | null;
}

interface MachineRow {
  id: string;
  name: string;
  capital: number;
  current_anchor: number;
  status: string;
  method: string | null;
  created_at: string;
  cycle_started_at: string | null;
}

interface TxRow {
  id: string;
  machine_id: string;
  type: string;
  amount: number;
  note: string | null;
  created_at: string;
}

function formatUsd(n: number) {
  return `$${n.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
}

function timeSince(iso: string | null): string {
  if (!iso) return "Chưa từng";
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return "Hôm nay";
  if (days === 1) return "Hôm qua";
  if (days < 30) return `${days} ngày trước`;
  return formatDate(iso);
}

export default function AdminUserDetailPage() {
  const router = useRouter();
  const params = useParams();
  const userId = params.userId as string;
  const admin = useCurrentUser("admin");

  const [profile, setProfile] = useState<Profile | null>(null);
  const [access, setAccess] = useState<AccessRow | null>(null);
  const [machines, setMachines] = useState<MachineRow[]>([]);
  const [transactions, setTransactions] = useState<TxRow[]>([]);
  const [setupCapital, setSetupCapital] = useState(0);
  const [loading, setLoading] = useState(true);

  async function loadData() {
    setLoading(true);
    const [{ data: p }, { data: a }, { data: m }, { data: tx }, { data: setup }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).single(),
      supabase
        .from("apps_access")
        .select("user_id, status, granted_at, approved_at, last_seen_at")
        .eq("user_id", userId)
        .eq("app", "comay")
        .maybeSingle(),
      supabase
        .from("comay_machines")
        .select("id, name, capital, current_anchor, status, method, created_at, cycle_started_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
      supabase
        .from("comay_transactions")
        .select("id, machine_id, type, amount, note, created_at")
        .eq("user_id", userId),
      supabase
        .from("comay_setup")
        .select("total_capital")
        .eq("user_id", userId)
        .maybeSingle(),
    ]);
    setProfile(p as Profile);
    setAccess((a ?? null) as AccessRow | null);
    setMachines((m ?? []) as MachineRow[]);
    setTransactions((tx ?? []) as TxRow[]);
    setSetupCapital((setup?.total_capital as number | undefined) ?? 0);
    setLoading(false);
  }

  useEffect(() => {
    if (!userId) return;
    loadData();
  }, [userId]);

  const kpis = useMemo(() => {
    const activeMachines = machines.filter((m) => m.status !== "closed");
    const totalCapital = activeMachines.reduce((s, m) => s + (m.capital || 0), 0);
    const withdrawn = transactions
      .filter((t) => t.type === "withdraw")
      .reduce((s, t) => s + Math.abs(t.amount || 0), 0);
    return {
      machineCount: machines.length,
      activeMachineCount: activeMachines.length,
      totalCapital,
      withdrawn,
      deposited: setupCapital,
      txCount: transactions.length,
    };
  }, [machines, transactions, setupCapital]);

  if (loading || !admin) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-muted-foreground">
        Đang tải...
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-muted-foreground">Không tìm thấy user.</p>
        <Link href="/admin/khach-hang" className="text-sm text-gold hover:underline">
          ← Quay lại danh sách
        </Link>
      </div>
    );
  }

  const status: UserStatus = (access?.status as UserStatus) ?? "none";
  const initials = profile.full_name.split(" ").map((n) => n[0]).join("").slice(-2);
  const isCustomer = profile.role === "student";

  return (
    <PageTransition>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="space-y-6"
      >
        {/* Back link */}
        <Link
          href="/admin/khach-hang"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-gold transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Danh sách Khách hàng & Mentor
        </Link>

        {/* Header */}
        <div className="flex items-start gap-4">
          <Avatar className="h-16 w-16 border-2 border-gold/30 shrink-0">
            {profile.avatar_url && <AvatarImage src={profile.avatar_url} />}
            <AvatarFallback className="bg-gold/15 text-gold text-lg font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl md:text-3xl font-bold truncate">
              {profile.full_name}
            </h1>
            <div className="flex flex-wrap items-center gap-2 mt-1.5">
              <Badge variant="outline" className={isCustomer
                ? "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30"
                : "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30"}>
                {isCustomer ? "Khách hàng" : "Mentor"}
              </Badge>
              <Badge variant="outline" className={
                status === "approved"
                  ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                  : status === "pending"
                    ? "bg-gold/15 text-gold border-gold/30"
                    : status === "locked"
                      ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30"
                      : "bg-muted text-muted-foreground border-border"
              }>
                {status === "approved" ? "Đã duyệt" : status === "pending" ? "Chờ duyệt" : status === "locked" ? "Đã khoá" : "Chưa đăng ký"}
              </Badge>
            </div>
          </div>
        </div>

        {/* KPI strip */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <KpiCard icon={Coins} label="Cỗ máy" value={`${kpis.activeMachineCount}/${kpis.machineCount}`} hint="Active / Tổng" tone="text-gold" />
          <KpiCard icon={Coins} label="Tổng vốn active" value={formatUsd(kpis.totalCapital)} hint="USD" tone="text-foreground" />
          <KpiCard icon={TrendingUp} label="Đã rút (lifetime)" value={formatUsd(kpis.withdrawn)} hint="USD" tone="text-emerald-500" />
          <KpiCard icon={TrendingDown} label="Đã nạp (lifetime)" value={formatUsd(kpis.deposited)} hint="USD" tone="text-amber-500" />
          <KpiCard icon={Activity} label="Hoạt động cuối" value={timeSince(access?.last_seen_at ?? null)} hint="Cỗ Máy" tone="text-foreground" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Profile + actions */}
          <Card className="lg:col-span-1">
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-2.5 text-sm">
                <InfoRow icon={Mail} label="Email" value={profile.email} />
                <InfoRow icon={Phone} label="Phone" value={profile.phone || "—"} />
                <InfoRow icon={Calendar} label="Đăng ký" value={formatDate(profile.created_at)} />
                <InfoRow icon={ClockAlert} label="Truy cập gần nhất" value={timeSince(access?.last_seen_at ?? null)} />
              </div>

              <div className="border-t border-border pt-4 space-y-2">
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Quyền truy cập Cỗ Máy
                </div>
                <UserRowActions
                  userId={profile.id}
                  currentStatus={status}
                  adminId={admin.id}
                  onChanged={loadData}
                />
              </div>

              <div className="border-t border-border pt-4">
                <RoleChangeSelect
                  userId={profile.id}
                  currentRole={profile.role}
                  adminId={admin.id}
                  adminRole={admin.role}
                  onChanged={loadData}
                />
              </div>

              {isCustomer && (
                <div className="border-t border-border pt-4">
                  <MentorAssignSelect
                    studentId={profile.id}
                    currentMentorId={profile.mentor_id ?? null}
                    adminId={admin.id}
                    onChanged={loadData}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Machines + Activity */}
          <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-foreground">Cỗ máy của user</h3>
                <span className="text-xs text-muted-foreground">{machines.length} máy</span>
              </div>
              {machines.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  User chưa tạo cỗ máy nào.
                </p>
              ) : (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                  {machines.map((m) => (
                    <CustomerMachineCard
                      key={m.id}
                      machine={m}
                      transactions={transactions}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <h3 className="text-sm font-semibold text-foreground mb-2">Lịch sử hoạt động</h3>
              <ActivityTimeline userId={profile.id} limit={30} />
            </CardContent>
          </Card>
          </div>
        </div>
      </motion.div>
    </PageTransition>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: typeof Coins;
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

function InfoRow({ icon: Icon, label, value }: { icon: typeof Mail; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">{label}</div>
        <div className="text-sm text-foreground break-all">{value}</div>
      </div>
    </div>
  );
}
