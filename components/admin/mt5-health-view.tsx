"use client";

// Admin → Sức khỏe khách hàng: nhìn TK MT5 của khách nào đang có vấn đề & vấn đề gì.
// Join mt5_accounts + machine_links + comay_machines + profiles + account_states +
// last trade, chấm điểm bằng computeAccountHealth, xếp nặng-nhất-lên-đầu. Poll 60s.

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, RefreshCcw, ShieldAlert } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import {
  compareHealth,
  computeAccountHealth,
  type AccountHealth,
  type HealthSeverity,
} from "@/lib/co-may/mt5-health";

interface HealthRow {
  accountId: string;
  login: string;
  server: string;
  nickname: string | null;
  userId: string | null;
  customerName: string;
  customerEmail: string;
  machineName: string;
  capitalUsd: number | null;
  positionsCount: number | null;
  health: AccountHealth;
}

function fmtUsd(n: number | null, signed = false): string {
  if (n == null) return "—";
  const sign = signed && n > 0 ? "+" : "";
  return `${sign}$${n.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
}

type Filter = "all" | HealthSeverity;

export function Mt5HealthView() {
  const [rows, setRows] = useState<HealthRow[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");

  const load = useCallback(async () => {
    setRefreshing(true);

    // 1. Links khách ↔ MT5 account (chỉ xét TK có gắn cỗ máy = có khách).
    const { data: linkData } = await supabase
      .from("mt5_machine_links")
      .select("machine_id, mt5_account_id, is_primary");
    const links = (linkData ?? []) as {
      machine_id: string;
      mt5_account_id: string;
      is_primary: boolean | null;
    }[];
    if (links.length === 0) {
      setRows([]);
      setRefreshing(false);
      return;
    }
    const accountIds = Array.from(new Set(links.map((l) => l.mt5_account_id)));
    const machineIds = Array.from(new Set(links.map((l) => l.machine_id)));

    // 2. Account + state + machine song song.
    const [accRes, stateRes, machineRes] = await Promise.all([
      supabase
        .from("mt5_accounts")
        .select("id, login, server, nickname, status, last_synced_at")
        .in("id", accountIds),
      supabase
        .from("mt5_account_states")
        .select("mt5_account_id, balance, equity, margin_level, profit, positions_count, currency")
        .in("mt5_account_id", accountIds),
      supabase
        .from("comay_machines")
        .select("id, name, capital, currency_unit, user_id")
        .in("id", machineIds),
    ]);

    const accById = new Map(
      ((accRes.data ?? []) as Record<string, unknown>[]).map((a) => [a.id as string, a]),
    );
    const stateByAcc = new Map(
      ((stateRes.data ?? []) as Record<string, unknown>[]).map((s) => [
        s.mt5_account_id as string,
        s,
      ]),
    );
    const machineById = new Map(
      ((machineRes.data ?? []) as Record<string, unknown>[]).map((m) => [m.id as string, m]),
    );

    // 3. Profiles của các khách.
    const userIds = Array.from(
      new Set(
        ((machineRes.data ?? []) as { user_id: string | null }[])
          .map((m) => m.user_id)
          .filter((u): u is string => !!u),
      ),
    );
    const profRes = userIds.length
      ? await supabase.from("profiles").select("id, full_name, email").in("id", userIds)
      : { data: [] as Record<string, unknown>[] };
    const profById = new Map(
      ((profRes.data ?? []) as Record<string, unknown>[]).map((p) => [p.id as string, p]),
    );

    // 4. Lệnh đóng gần nhất / account (mỗi TK 1 query nhỏ — chính xác cho "ngừng trade").
    const lastTradeEntries = await Promise.all(
      accountIds.map(async (id) => {
        const { data } = await supabase
          .from("mt5_trades")
          .select("time_close")
          .eq("mt5_account_id", id)
          .eq("is_closed", true)
          .order("time_close", { ascending: false, nullsFirst: false })
          .limit(1);
        const row = (data ?? [])[0] as { time_close: string | null } | undefined;
        return [id, row?.time_close ?? null] as const;
      }),
    );
    const lastTradeByAcc = new Map(lastTradeEntries);

    // 5. Dựng từng dòng + chấm điểm.
    const now = Date.now();
    const built: HealthRow[] = [];
    for (const link of links) {
      const acc = accById.get(link.mt5_account_id);
      const machine = machineById.get(link.machine_id);
      if (!acc) continue;
      const st = stateByAcc.get(link.mt5_account_id) as Record<string, number | string | null> | undefined;
      const prof = machine?.user_id ? profById.get(machine.user_id as string) : null;

      const health = computeAccountHealth({
        status: (acc.status as string) ?? "pending",
        lastSyncedAt: (acc.last_synced_at as string | null) ?? null,
        currency: (st?.currency as string | null) ?? null,
        balance: (st?.balance as number | null) ?? null,
        equity: (st?.equity as number | null) ?? null,
        marginLevel: (st?.margin_level as number | null) ?? null,
        profit: (st?.profit as number | null) ?? null,
        positionsCount: (st?.positions_count as number | null) ?? null,
        capitalUsd: (machine?.capital as number | null) ?? null,
        machineCurrencyUnit: (machine?.currency_unit as string | null) ?? null,
        lastTradeAt: lastTradeByAcc.get(link.mt5_account_id) ?? null,
        nowMs: now,
      });

      built.push({
        accountId: link.mt5_account_id,
        login: (acc.login as string) ?? "",
        server: (acc.server as string) ?? "",
        nickname: (acc.nickname as string | null) ?? null,
        userId: (machine?.user_id as string | null) ?? null,
        customerName: (prof?.full_name as string | null) ?? "—",
        customerEmail: (prof?.email as string | null) ?? "—",
        machineName: (machine?.name as string | null) ?? "—",
        capitalUsd: (machine?.capital as number | null) ?? null,
        positionsCount: (st?.positions_count as number | null) ?? null,
        health,
      });
    }

    built.sort((a, b) => compareHealth(a.health, b.health));
    setRows(built);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 60_000);
    return () => clearInterval(t);
  }, [load]);

  const counts = useMemo(() => {
    const c = { critical: 0, warning: 0, ok: 0 };
    for (const r of rows ?? []) c[r.health.severity]++;
    return c;
  }, [rows]);

  const visible = useMemo(
    () => (rows ?? []).filter((r) => filter === "all" || r.health.severity === filter),
    [rows, filter],
  );

  if (!rows) {
    return <div className="text-sm text-muted-foreground py-10 text-center">Đang tải…</div>;
  }

  return (
    <div className="space-y-4">
      {/* Tổng quan */}
      <div className="flex items-center gap-2 flex-wrap">
        <SummaryChip
          active={filter === "all"}
          onClick={() => setFilter("all")}
          tone="muted"
          label={`Tất cả ${rows.length}`}
        />
        <SummaryChip
          active={filter === "critical"}
          onClick={() => setFilter("critical")}
          tone="crit"
          label={`🔴 Nguy cấp ${counts.critical}`}
        />
        <SummaryChip
          active={filter === "warning"}
          onClick={() => setFilter("warning")}
          tone="warn"
          label={`🟠 Cảnh báo ${counts.warning}`}
        />
        <SummaryChip
          active={filter === "ok"}
          onClick={() => setFilter("ok")}
          tone="ok"
          label={`🟢 Ổn ${counts.ok}`}
        />
        <button
          type="button"
          onClick={load}
          disabled={refreshing}
          className="ml-auto text-xs inline-flex items-center gap-1 text-muted-foreground hover:text-foreground disabled:opacity-40"
        >
          <RefreshCcw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} /> Làm mới
        </button>
      </div>

      {visible.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          {rows.length === 0
            ? "Chưa có tài khoản MT5 nào gắn với khách hàng."
            : "Không có tài khoản nào ở mức này."}
        </div>
      ) : (
        <div className="space-y-2.5">
          {visible.map((r) => (
            <HealthCard key={r.accountId} row={r} />
          ))}
        </div>
      )}
    </div>
  );
}

const SEV_META: Record<HealthSeverity, { tone: string; icon: typeof AlertTriangle; label: string }> = {
  critical: { tone: "border-red-500/50 bg-red-500/5", icon: ShieldAlert, label: "Nguy cấp" },
  warning: { tone: "border-amber-500/40 bg-amber-500/5", icon: AlertTriangle, label: "Cảnh báo" },
  ok: { tone: "border-emerald-500/30 bg-emerald-500/5", icon: CheckCircle2, label: "Ổn" },
};

function HealthCard({ row }: { row: HealthRow }) {
  const { health: h } = row;
  const meta = SEV_META[h.severity];
  const Icon = meta.icon;
  const ddTone =
    h.drawdownPct == null
      ? "text-muted-foreground"
      : h.drawdownPct <= -40
        ? "text-red-600 dark:text-red-400"
        : h.drawdownPct < 0
          ? "text-amber-600 dark:text-amber-400"
          : "text-emerald-600 dark:text-emerald-400";

  return (
    <div className={cn("rounded-xl border p-3.5 space-y-2.5", meta.tone)}>
      <div className="flex items-start gap-3 flex-wrap">
        <Icon
          className={cn(
            "h-5 w-5 shrink-0 mt-0.5",
            h.severity === "critical"
              ? "text-red-600 dark:text-red-400 animate-pulse"
              : h.severity === "warning"
                ? "text-amber-600 dark:text-amber-400"
                : "text-emerald-600 dark:text-emerald-400",
          )}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm truncate">{row.customerName}</span>
            <span className="text-[11px] text-muted-foreground truncate">{row.customerEmail}</span>
          </div>
          <div className="text-[11px] text-muted-foreground tabular-nums truncate">
            {row.machineName} · {row.login}@{row.server}
          </div>
          {/* Chip vấn đề */}
          {h.flags.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
              {h.flags.map((f) => (
                <span
                  key={f.key}
                  className={cn(
                    "text-[10px] font-medium px-1.5 py-0.5 rounded-full border",
                    f.severity === "critical"
                      ? "text-red-700 dark:text-red-300 border-red-500/40 bg-red-500/10"
                      : "text-amber-700 dark:text-amber-300 border-amber-500/40 bg-amber-500/10",
                  )}
                >
                  {f.label}
                </span>
              ))}
            </div>
          )}
        </div>
        {row.userId && (
          <Link
            href={`/admin/khach-hang/${row.userId}`}
            className="text-[11px] text-muted-foreground hover:text-foreground shrink-0 underline-offset-2 hover:underline"
          >
            Xem chi tiết →
          </Link>
        )}
      </div>

      {/* Số liệu */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-x-3 gap-y-2 text-xs">
        <Metric label="Vốn gốc" value={fmtUsd(row.capitalUsd)} />
        <Metric label="Equity" value={fmtUsd(h.equityUsd)} />
        <Metric
          label="Drawdown"
          value={h.drawdownPct == null ? "—" : `${h.drawdownPct >= 0 ? "+" : ""}${h.drawdownPct.toFixed(1)}%`}
          tone={ddTone}
        />
        <Metric
          label="Floating"
          value={fmtUsd(h.floatingUsd, true)}
          tone={
            h.floatingUsd == null
              ? undefined
              : h.floatingUsd < 0
                ? "text-red-600 dark:text-red-400"
                : "text-emerald-600 dark:text-emerald-400"
          }
        />
        <Metric
          label="Margin level"
          value={
            row.positionsCount && row.positionsCount > 0 && h.marginLevel != null
              ? `${h.marginLevel.toLocaleString("en-US", { maximumFractionDigits: 0 })}%`
              : "—"
          }
        />
        <Metric
          label="Lệnh gần nhất"
          value={
            h.lastTradeDays == null
              ? "chưa có"
              : h.lastTradeDays <= 0
                ? "hôm nay"
                : `${h.lastTradeDays} ngày trước`
          }
        />
      </div>
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={cn("font-semibold tabular-nums mt-0.5", tone ?? "text-foreground")}>{value}</div>
    </div>
  );
}

const CHIP_TONE: Record<string, string> = {
  muted: "border-border bg-muted/40 text-foreground",
  crit: "border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-300",
  warn: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  ok: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
};

function SummaryChip({
  label,
  tone,
  active,
  onClick,
}: {
  label: string;
  tone: keyof typeof CHIP_TONE;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "text-xs font-medium px-2.5 py-1 rounded-full border transition-colors",
        CHIP_TONE[tone],
        active ? "ring-2 ring-ring/40" : "opacity-80 hover:opacity-100",
      )}
    >
      {label}
    </button>
  );
}
