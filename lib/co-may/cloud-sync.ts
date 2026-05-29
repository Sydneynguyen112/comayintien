"use client";

// Cloud sync layer for Cỗ Máy data.
// Pattern: localStorage cache + dual-write (sync local + fire-and-forget Supabase).
// On app entry → `hydrateFromCloud(userId)` pulls latest snapshot vào localStorage,
// sau đó các fn read sync trong mock-data.ts hoạt động bình thường.
// Mutations gọi cloudPush.* để fire-and-forget upsert lên Supabase.

import { supabase } from "@/lib/supabase";
import type {
  CycleReport,
  Machine,
  MachineTransaction,
} from "./types";
import type { SetupConfig } from "./setup-store";

// ── DB row shapes (snake_case) ──
interface MachineRow {
  id: string;
  user_id: string;
  name: string;
  capital: number;
  current_anchor: number;
  cycle_started_at: string | null;
  status: string;
  currency_unit: string | null;
  method: string | null;
  signal_source: string | null;
  risk_per_trade_pct: number | null;
  max_drawdown_pct: number | null;
  target_withdraw_count: number | null;
  target_profit: number | null;
  anchor_milestones: number[] | null;
  created_at: string;
  updated_at: string;
}

interface TxRow {
  id: string;
  machine_id: string;
  user_id: string;
  type: string;
  amount: number;
  note: string | null;
  direction: string | null;
  symbol: string | null;
  volume: number | null;
  entry_reason: string | null;
  exit_reason: string | null;
  emotion: string | null;
  created_at: string;
}

interface ReportRow {
  id: string;
  machine_id: string;
  user_id: string;
  machine_name: string | null;
  machine_method: string | null;
  currency_unit: string | null;
  start_date: string;
  end_date: string;
  decision: string;
  pnl: number;
  withdrawn: number;
  starting_capital: number | null;
  ending_balance: number | null;
  peak_pnl: number | null;
  max_drawdown: number | null;
  trade_count: number | null;
  win_count: number | null;
  next_machine_id: string | null;
  scorecard: unknown;
  reflection: unknown;
  meta: unknown;
  created_at: string;
}

interface SetupRow {
  user_id: string;
  total_capital: number;
  strategy: string;
  injected_from_withdrawn: number;
  completed_at: string;
  updated_at: string;
}

// ── Mappers ──
function toMachine(r: MachineRow): Machine {
  return {
    id: r.id,
    user_id: r.user_id,
    name: r.name,
    capital: r.capital,
    current_anchor: r.current_anchor,
    cycle_started_at: r.cycle_started_at,
    status: r.status as Machine["status"],
    currency_unit: (r.currency_unit ?? undefined) as Machine["currency_unit"],
    method: r.method ?? undefined,
    signal_source: r.signal_source as Machine["signal_source"] | undefined,
    risk_per_trade_pct: r.risk_per_trade_pct ?? undefined,
    max_drawdown_pct: r.max_drawdown_pct ?? undefined,
    target_withdraw_count: r.target_withdraw_count ?? undefined,
    target_profit: r.target_profit ?? undefined,
    anchor_milestones: r.anchor_milestones ?? undefined,
    created_at: r.created_at,
    updated_at: r.updated_at,
  };
}

function toTx(r: TxRow): MachineTransaction {
  return {
    id: r.id,
    machine_id: r.machine_id,
    user_id: r.user_id,
    type: r.type as MachineTransaction["type"],
    amount: r.amount,
    note: r.note,
    direction: r.direction as MachineTransaction["direction"] | undefined,
    symbol: r.symbol ?? undefined,
    volume: r.volume ?? undefined,
    entry_reason: r.entry_reason ?? undefined,
    exit_reason: r.exit_reason ?? undefined,
    emotion: r.emotion ?? undefined,
    created_at: r.created_at,
  };
}

function toReport(r: ReportRow): CycleReport {
  return {
    id: r.id,
    machine_id: r.machine_id,
    user_id: r.user_id,
    machine_name: r.machine_name ?? undefined,
    machine_method: r.machine_method ?? undefined,
    currency_unit: (r.currency_unit ?? undefined) as CycleReport["currency_unit"],
    start_date: r.start_date,
    end_date: r.end_date,
    decision: r.decision as CycleReport["decision"],
    pnl: r.pnl,
    withdrawn: r.withdrawn,
    starting_capital: r.starting_capital ?? undefined,
    ending_balance: r.ending_balance ?? undefined,
    peak_pnl: r.peak_pnl ?? undefined,
    max_drawdown: r.max_drawdown ?? undefined,
    trade_count: r.trade_count ?? undefined,
    win_count: r.win_count ?? undefined,
    next_machine_id: r.next_machine_id ?? undefined,
    scorecard: (r.scorecard as CycleReport["scorecard"]) ?? undefined,
    reflection: (r.reflection as CycleReport["reflection"]) ?? undefined,
    meta: (r.meta as CycleReport["meta"]) ?? null,
    created_at: r.created_at,
  };
}

function machineToRow(m: Machine, userId: string): Partial<MachineRow> {
  return {
    id: m.id,
    user_id: userId,
    name: m.name,
    capital: m.capital,
    current_anchor: m.current_anchor,
    cycle_started_at: m.cycle_started_at,
    status: m.status,
    // Cot currency_unit la NOT NULL DEFAULT 'USD' (xem supabase-comay-currency-unit.sql).
    // Gui null cho may USD (currency_unit undefined) -> vi pham NOT NULL -> upsert
    // that bai am tham -> may khong luu len cloud -> reload la mat. Mac dinh 'USD'.
    currency_unit: m.currency_unit ?? "USD",
    method: m.method ?? null,
    signal_source: m.signal_source ?? null,
    risk_per_trade_pct: m.risk_per_trade_pct ?? null,
    max_drawdown_pct: m.max_drawdown_pct ?? null,
    target_withdraw_count: m.target_withdraw_count ?? null,
    target_profit: m.target_profit ?? null,
    anchor_milestones: m.anchor_milestones ?? null,
    created_at: m.created_at,
    updated_at: m.updated_at,
  };
}

function txToRow(t: MachineTransaction, userId: string): Partial<TxRow> {
  return {
    id: t.id,
    machine_id: t.machine_id,
    user_id: userId,
    type: t.type,
    amount: t.amount,
    note: t.note,
    direction: t.direction ?? null,
    symbol: t.symbol ?? null,
    volume: t.volume ?? null,
    entry_reason: t.entry_reason ?? null,
    exit_reason: t.exit_reason ?? null,
    emotion: t.emotion ?? null,
    created_at: t.created_at,
  };
}

function reportToRow(r: CycleReport, userId: string): Partial<ReportRow> {
  return {
    id: r.id,
    machine_id: r.machine_id,
    user_id: userId,
    machine_name: r.machine_name ?? null,
    machine_method: r.machine_method ?? null,
    currency_unit: r.currency_unit ?? null,
    start_date: r.start_date,
    end_date: r.end_date,
    decision: r.decision,
    pnl: r.pnl,
    withdrawn: r.withdrawn,
    starting_capital: r.starting_capital ?? null,
    ending_balance: r.ending_balance ?? null,
    peak_pnl: r.peak_pnl ?? null,
    max_drawdown: r.max_drawdown ?? null,
    trade_count: r.trade_count ?? null,
    win_count: r.win_count ?? null,
    next_machine_id: r.next_machine_id ?? null,
    scorecard: r.scorecard ?? null,
    reflection: r.reflection ?? null,
    meta: r.meta ?? null,
    created_at: r.created_at,
  };
}

// ── PULL: hydrate localStorage from Supabase ──
export async function hydrateFromCloud(userId: string): Promise<void> {
  if (!userId || typeof window === "undefined") return;

  try {
    const [machinesRes, txRes, reportsRes, setupRes, dismissRes, featuresRes] =
      await Promise.all([
        supabase.from("comay_machines").select("*").eq("user_id", userId),
        supabase.from("comay_transactions").select("*").eq("user_id", userId),
        supabase.from("comay_reports").select("*").eq("user_id", userId),
        supabase.from("comay_setup").select("*").eq("user_id", userId).maybeSingle(),
        supabase.from("comay_dismiss_state").select("*").eq("user_id", userId),
        supabase.from("user_features").select("*").eq("user_id", userId),
      ]);

    // comay_data_v1
    const machines = (machinesRes.data ?? []).map(toMachine);
    const tx = (txRes.data ?? []).map(toTx);
    const reports = (reportsRes.data ?? []).map(toReport);
    const dataAll = JSON.parse(window.localStorage.getItem("rova_comay_data_v1") || "{}");
    dataAll[userId] = { machines, tx, reports };
    window.localStorage.setItem("rova_comay_data_v1", JSON.stringify(dataAll));

    // comay_setup_v1
    if (setupRes.data) {
      const s = setupRes.data as SetupRow;
      const setupAll = JSON.parse(window.localStorage.getItem("rova_comay_setup_v1") || "{}");
      // Allocations không lưu trên DB (đã thành machines) → giữ allocations rỗng khi hydrate.
      const config: SetupConfig = {
        totalCapital: s.total_capital,
        strategy: s.strategy as SetupConfig["strategy"],
        allocations: [],
        injectedFromWithdrawn: s.injected_from_withdrawn,
        completedAt: s.completed_at,
      };
      setupAll[userId] = config;
      window.localStorage.setItem("rova_comay_setup_v1", JSON.stringify(setupAll));
    }

    // dismiss state per machine
    for (const d of dismissRes.data ?? []) {
      const row = d as { machine_id: string; trade_count: number };
      window.localStorage.setItem(
        `co-may-anchor-dismiss-${row.machine_id}`,
        String(row.trade_count),
      );
    }

    // user_features
    const features = (featuresRes.data ?? []).map((f) => (f as { feature: string }).feature);
    if (features.length > 0) {
      const featAll = JSON.parse(
        window.localStorage.getItem("rova_user_features_v1") || "{}",
      );
      featAll[userId] = features;
      window.localStorage.setItem("rova_user_features_v1", JSON.stringify(featAll));
    }
  } catch (err) {
    console.error("[cloud-sync] hydrateFromCloud failed:", err);
  }
}

// ── PUSH: fire-and-forget mutations to Supabase ──
function fire<T>(p: PromiseLike<T>): void {
  Promise.resolve(p).then(
    (r: unknown) => {
      const res = r as { error?: { message?: string } };
      if (res?.error) console.error("[cloud-sync] push error:", res.error);
    },
    (err: unknown) => console.error("[cloud-sync] push rejected:", err),
  );
}

export const cloudPush = {
  setup(userId: string, s: SetupConfig) {
    if (!userId) return;
    fire(
      supabase.from("comay_setup").upsert(
        {
          user_id: userId,
          total_capital: s.totalCapital,
          strategy: s.strategy,
          injected_from_withdrawn: s.injectedFromWithdrawn ?? 0,
          completed_at: s.completedAt,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      ),
    );
  },
  machine(userId: string, m: Machine) {
    if (!userId) return;
    fire(
      supabase.from("comay_machines").upsert(machineToRow(m, userId), {
        onConflict: "id",
      }),
    );
  },
  deleteMachine(userId: string, machineId: string) {
    if (!userId) return;
    // Xoá toàn bộ lãi/lỗ của máy: transactions (có cascade nhưng xoá tường minh cho
    // chắc) + reports (comay_reports.machine_id KHÔNG có FK cascade → phải xoá tay,
    // nếu không sẽ mồ côi trên cloud và quay lại sau hydrate).
    fire(supabase.from("comay_transactions").delete().eq("machine_id", machineId));
    fire(supabase.from("comay_reports").delete().eq("machine_id", machineId));
    fire(supabase.from("comay_machines").delete().eq("id", machineId));
  },
  tx(userId: string, t: MachineTransaction) {
    if (!userId) return;
    fire(
      supabase.from("comay_transactions").upsert(txToRow(t, userId), {
        onConflict: "id",
      }),
    );
  },
  report(userId: string, r: CycleReport) {
    if (!userId) return;
    fire(
      supabase.from("comay_reports").upsert(reportToRow(r, userId), {
        onConflict: "id",
      }),
    );
  },
  dismissState(userId: string, machineId: string, tradeCount: number) {
    if (!userId) return;
    fire(
      supabase.from("comay_dismiss_state").upsert(
        {
          user_id: userId,
          machine_id: machineId,
          trade_count: tradeCount,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,machine_id" },
      ),
    );
  },
  feature(userId: string, feature: string, enabled: boolean) {
    if (!userId) return;
    if (enabled) {
      fire(
        supabase
          .from("user_features")
          .upsert({ user_id: userId, feature }, { onConflict: "user_id,feature" }),
      );
    } else {
      fire(
        supabase
          .from("user_features")
          .delete()
          .eq("user_id", userId)
          .eq("feature", feature),
      );
    }
  },
};
