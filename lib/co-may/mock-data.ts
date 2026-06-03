import type {
  Machine,
  MachineTransaction,
  CycleReport,
  CycleDecision,
  KpiSnapshot,
  TransactionType,
} from "./types";
import { cloudPush } from "./cloud-sync";
import { trackEvent, Events } from "@/lib/analytics";

// NOW/DAY: mốc thời gian tham chiếu cho computeKpi (days_active…).
const NOW = new Date("2026-05-04T08:00:00Z").getTime();
const DAY = 86400_000;

// ── Cache + localStorage persistence ──
// Mỗi user data persist localStorage để giữ qua reload / Vercel rebuild.
// Storage key chứa full Map. Khi wire Supabase, fns này sẽ thay bằng server actions.

interface UserData {
  machines: Machine[];
  tx: MachineTransaction[];
  reports: CycleReport[];
}

const STORAGE_KEY = "rova_comay_data_v1";
const cache = new Map<string, UserData>();

/** Clear in-memory cache cho 1 user — gọi sau khi hydrateFromCloud() ghi localStorage mới. */
export function invalidateLocalCache(userId: string): void {
  cache.delete(userId);
}

function isBrowser() {
  return typeof window !== "undefined";
}

function loadAllPersisted(): Record<string, UserData> {
  if (!isBrowser()) return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, UserData>) : {};
  } catch {
    return {};
  }
}

function persistDataFor(userId: string) {
  if (!isBrowser()) return;
  const data = cache.get(userId);
  if (!data) return;
  try {
    const all = loadAllPersisted();
    all[userId] = data;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {
    // quota / private mode — non-fatal
  }
}

function getDataFor(userId: string): UserData {
  const cached = cache.get(userId);
  if (cached) return cached;

  // Đọc từ localStorage (đã hydrate từ cloud). KHÔNG còn seed mock data —
  // mọi user (kể cả demo cũ) bắt đầu rỗng; dữ liệu thật đến từ cloud qua
  // hydrateFromCloud / hydrateManyFromCloud.
  const persisted = loadAllPersisted();
  if (persisted[userId]) {
    cache.set(userId, persisted[userId]);
    return persisted[userId];
  }

  const data: UserData = { machines: [], tx: [], reports: [] };
  cache.set(userId, data);
  return data;
}

// ── Mutation API (persisted localStorage) ──
// Khi wire Supabase, các fn này sẽ thay bằng server actions.

let mutationSeq = 0;
function nextId(prefix: string) {
  mutationSeq += 1;
  return `${prefix}-${Date.now().toString(36)}-${mutationSeq}`;
}

export function addMachine(
  userId: string,
  input: {
    name: string;
    capital: number;
    current_anchor: number;
    currency_unit?: Machine["currency_unit"];
    method?: string;
    signal_source?: Machine["signal_source"];
    risk_per_trade_pct?: number;
    max_drawdown_pct?: number;
    target_withdraw_count?: number;
    target_profit?: number;
    anchor_milestones?: number[];
  },
): Machine {
  const data = getDataFor(userId);
  const now = new Date().toISOString();
  const m: Machine = {
    id: nextId("mach-new"),
    user_id: userId,
    name: input.name,
    capital: input.capital,
    current_anchor: input.current_anchor,
    cycle_started_at: now,
    status: "active",
    created_at: now,
    updated_at: now,
    currency_unit: input.currency_unit,
    method: input.method,
    signal_source: input.signal_source,
    risk_per_trade_pct: input.risk_per_trade_pct,
    max_drawdown_pct: input.max_drawdown_pct,
    target_withdraw_count: input.target_withdraw_count,
    target_profit: input.target_profit,
    anchor_milestones: input.anchor_milestones,
  };
  data.machines.unshift(m);
  persistDataFor(userId);
  cloudPush.machine(userId, m);
  trackEvent(Events.TRADING_ACCOUNT_CREATED, { machine_id: m.id, name: m.name, capital: m.capital }, userId);
  return m;
}

// Same shape as Supabase RLS denial — caller handles uniformly.
class OwnershipError extends Error {
  constructor(machineId: string) {
    super(`Machine ${machineId} not owned by user`);
    this.name = "OwnershipError";
  }
}

function assertOwnership(userId: string, machineId: string): void {
  const data = getDataFor(userId);
  if (!data.machines.some((m) => m.id === machineId)) {
    throw new OwnershipError(machineId);
  }
}

export function updateMachine(
  userId: string,
  machineId: string,
  patch: Partial<
    Pick<Machine, "name" | "capital" | "current_anchor" | "status" | "anchor_milestones">
  >,
): Machine {
  assertOwnership(userId, machineId);
  const data = getDataFor(userId);
  const idx = data.machines.findIndex((m) => m.id === machineId);
  data.machines[idx] = {
    ...data.machines[idx],
    ...patch,
    updated_at: new Date().toISOString(),
  };
  persistDataFor(userId);
  cloudPush.machine(userId, data.machines[idx]);
  return data.machines[idx];
}

export function deleteMachine(userId: string, machineId: string): void {
  assertOwnership(userId, machineId);
  const data = getDataFor(userId);
  data.machines = data.machines.filter((m) => m.id !== machineId);
  data.tx = data.tx.filter((t) => t.machine_id !== machineId);
  data.reports = data.reports.filter((r) => r.machine_id !== machineId);
  persistDataFor(userId);
  cloudPush.deleteMachine(userId, machineId);
}

export function updateTransaction(
  userId: string,
  txId: string,
  patch: Partial<
    Pick<
      MachineTransaction,
      | "type"
      | "amount"
      | "note"
      | "direction"
      | "symbol"
      | "volume"
      | "entry_reason"
      | "exit_reason"
      | "emotion"
    >
  >,
): MachineTransaction {
  const data = getDataFor(userId);
  const idx = data.tx.findIndex((t) => t.id === txId);
  if (idx === -1) throw new Error(`Tx ${txId} not found`);
  data.tx[idx] = { ...data.tx[idx], ...patch };
  persistDataFor(userId);
  cloudPush.tx(userId, data.tx[idx]);
  return data.tx[idx];
}

export function recordTransaction(
  userId: string,
  machineId: string,
  input: {
    type: TransactionType;
    amount: number;
    note?: string | null;
    direction?: MachineTransaction["direction"];
    symbol?: string;
    volume?: number;
    entry_reason?: string;
    exit_reason?: string;
    emotion?: string;
  },
): MachineTransaction {
  assertOwnership(userId, machineId);
  const data = getDataFor(userId);
  const tx: MachineTransaction = {
    id: nextId("tx-new"),
    machine_id: machineId,
    user_id: userId,
    type: input.type,
    amount: input.amount,
    note: input.note ?? null,
    created_at: new Date().toISOString(),
    direction: input.direction,
    symbol: input.symbol,
    volume: input.volume,
    entry_reason: input.entry_reason,
    exit_reason: input.exit_reason,
    emotion: input.emotion,
  };
  data.tx.unshift(tx);
  persistDataFor(userId);
  cloudPush.tx(userId, tx);
  // Track cardinal event cho admin dashboard
  if (tx.type === "trade_win" || tx.type === "trade_loss") {
    trackEvent(Events.TRADE_LOGGED, { machine_id: machineId, trade_type: tx.type, pnl: tx.amount, symbol: tx.symbol }, userId);
  } else if (tx.type === "withdraw") {
    trackEvent(Events.WITHDRAWAL_LOGGED, { machine_id: machineId, amount: tx.amount }, userId);
  }
  return tx;
}

/**
 * Đóng cỗ máy hoàn toàn — khác close cycle.
 * Tính balance cuối (capital + pnl + withdraws âm), trả lại vào tổng vốn doanh chủ
 * dạng delta = balance - capital ban đầu (gain/loss). Mark machine.status = "closed".
 * Caller chịu trách nhiệm gọi adjustTotalCapital ở setup-store.
 *
 * Returns: { balance, capital, delta }
 */
export function closeMachine(
  userId: string,
  machineId: string,
): { balance: number; capital: number; delta: number } {
  assertOwnership(userId, machineId);
  const data = getDataFor(userId);
  const idx = data.machines.findIndex((m) => m.id === machineId);
  const m = data.machines[idx];
  const machineTx = data.tx.filter((t) => t.machine_id === machineId);
  const trades = machineTx.filter((t) => t.type === "trade_win" || t.type === "trade_loss");
  const pnl = trades.reduce((s, t) => s + t.amount, 0);
  const withdraws = machineTx.filter((t) => t.type === "withdraw").reduce((s, t) => s + t.amount, 0);
  const balance = m.capital + pnl + withdraws; // withdraws is negative
  data.machines[idx] = {
    ...m,
    status: "closed",
    updated_at: new Date().toISOString(),
  };
  persistDataFor(userId);
  cloudPush.machine(userId, data.machines[idx]);
  return { balance, capital: m.capital, delta: balance - m.capital };
}

export function finalizeCycle(
  userId: string,
  machineId: string,
  input: {
    decision: CycleDecision;
    /** Cho scale: vốn của cỗ máy mới (= capital + scaleAmount). */
    nextCapital?: number;
    /** Cho scale/reset: milestones tự cấu hình. Nếu không truyền → auto-sinh 100/80/64/51.2/41%. */
    nextMilestones?: number[];
    scorecard?: import("./types").CycleScorecard;
    reflection?: import("./types").CycleReflection;
  },
): { report: CycleReport; nextMachineId: string | null } {
  assertOwnership(userId, machineId);
  const data = getDataFor(userId);
  const machineIdx = data.machines.findIndex((m) => m.id === machineId);
  if (machineIdx === -1) throw new Error(`Machine ${machineId} not found`);
  const machine = data.machines[machineIdx];

  const cycleStart = machine.cycle_started_at ?? machine.created_at;
  const machineTx = data.tx
    .filter(
      (t) =>
        t.machine_id === machineId &&
        new Date(t.created_at) >= new Date(cycleStart),
    )
    .sort((a, b) => a.created_at.localeCompare(b.created_at));

  const trades = machineTx.filter((t) => t.type === "trade_win" || t.type === "trade_loss");
  const pnl = trades.reduce((s, t) => s + t.amount, 0);
  const withdrawnNeg = machineTx
    .filter((t) => t.type === "withdraw")
    .reduce((s, t) => s + t.amount, 0);
  const withdrawn = -withdrawnNeg;
  const winCount = trades.filter((t) => t.amount > 0).length;
  const tradeCount = trades.length;

  // Peak PnL + Max drawdown từ trades chronological
  let runPnl = 0;
  let peakPnl = 0;
  let maxDD = 0;
  for (const t of trades) {
    runPnl += t.amount;
    if (runPnl > peakPnl) peakPnl = runPnl;
    const dd = runPnl - peakPnl;
    if (dd < maxDD) maxDD = dd;
  }

  const endingBalance = machine.capital + pnl - withdrawn;
  const now = new Date().toISOString();

  // Đóng cỗ máy hiện tại TRƯỚC, sau đó mới unshift cỗ máy mới (tránh shift index).
  data.machines[machineIdx] = {
    ...machine,
    status: "closed",
    updated_at: now,
  };

  // Tạo cỗ máy mới (cho scale + reset). Đóng → không tạo.
  let nextMachine: Machine | null = null;
  if (input.decision === "scale" || input.decision === "reset") {
    const newCapital =
      input.decision === "scale" && input.nextCapital !== undefined && input.nextCapital > 0
        ? input.nextCapital
        : machine.capital;
    const newAnchor = newCapital;
    // Milestones: ưu tiên user-input (nếu có), fallback auto-sinh từ formula 100/80/64/51.2/41.
    let newMilestones: number[] | undefined = undefined;
    if (input.nextMilestones && input.nextMilestones.length > 0) {
      newMilestones = input.nextMilestones
        .filter((m) => Number.isFinite(m) && m > 0)
        .sort((a, b) => b - a);
    } else if (machine.anchor_milestones && machine.anchor_milestones.length > 0) {
      newMilestones = [];
      let v = newCapital;
      for (let i = 0; i < machine.anchor_milestones.length; i++) {
        newMilestones.push(Math.round(v));
        v *= 0.8;
      }
    }
    nextMachine = {
      id: nextId("mach-new"),
      user_id: userId,
      name: machine.name,
      capital: newCapital,
      current_anchor: newAnchor,
      cycle_started_at: now,
      status: "active",
      created_at: now,
      updated_at: now,
      currency_unit: machine.currency_unit,
      method: machine.method,
      signal_source: machine.signal_source,
      risk_per_trade_pct: machine.risk_per_trade_pct,
      max_drawdown_pct: machine.max_drawdown_pct,
      target_withdraw_count: machine.target_withdraw_count,
      target_profit: machine.target_profit,
      anchor_milestones: newMilestones,
    };
    data.machines.unshift(nextMachine);
  }

  const report: CycleReport = {
    id: nextId("rep-new"),
    machine_id: machineId,
    user_id: userId,
    machine_name: machine.name,
    machine_method: machine.method,
    currency_unit: machine.currency_unit,
    start_date: cycleStart,
    end_date: now,
    decision: input.decision,
    pnl,
    withdrawn,
    starting_capital: machine.capital,
    ending_balance: endingBalance,
    peak_pnl: peakPnl,
    max_drawdown: maxDD,
    trade_count: tradeCount,
    win_count: winCount,
    next_machine_id: nextMachine?.id,
    scorecard: input.scorecard,
    reflection: input.reflection,
    meta: { cycle_started_at: now },
    created_at: now,
  };
  data.reports.unshift(report);
  persistDataFor(userId);
  // Cloud push: closed machine + new machine + report
  cloudPush.machine(userId, data.machines[machineIdx]);
  if (nextMachine) cloudPush.machine(userId, nextMachine);
  cloudPush.report(userId, report);
  return { report, nextMachineId: nextMachine?.id ?? null };
}

export function getReportById(userId: string, reportId: string): CycleReport | null {
  return getDataFor(userId).reports.find((r) => r.id === reportId) ?? null;
}

export function closeCycleMock(
  userId: string,
  machineId: string,
  decision: CycleDecision,
): CycleReport {
  assertOwnership(userId, machineId);
  const data = getDataFor(userId);
  const machine = data.machines.find((m) => m.id === machineId)!;

  const cycleStart = machine.cycle_started_at ?? machine.created_at;
  const machineTx = data.tx.filter(
    (t) =>
      t.machine_id === machineId &&
      new Date(t.created_at) >= new Date(cycleStart),
  );
  const trades = machineTx.filter((t) => t.type === "trade_win" || t.type === "trade_loss");
  const pnl = trades.reduce((s, t) => s + t.amount, 0);
  const withdrawn = -machineTx
    .filter((t) => t.type === "withdraw")
    .reduce((s, t) => s + t.amount, 0); // amount is negative for withdraw

  const newCycleStart = new Date().toISOString();
  const report: CycleReport = {
    id: nextId("rep-new"),
    machine_id: machineId,
    user_id: userId,
    currency_unit: machine.currency_unit,
    start_date: cycleStart,
    end_date: newCycleStart,
    decision,
    pnl,
    withdrawn,
    meta: { cycle_started_at: newCycleStart },
    created_at: newCycleStart,
  };
  data.reports.unshift(report);

  // Update machine: reset cycle. Scale = bump capital + anchor by pnl.
  const idx = data.machines.findIndex((m) => m.id === machineId);
  if (idx !== -1) {
    data.machines[idx] = {
      ...data.machines[idx],
      cycle_started_at: newCycleStart,
      capital:
        decision === "scale"
          ? Math.max(0, data.machines[idx].capital + pnl)
          : data.machines[idx].capital,
      current_anchor:
        decision === "scale"
          ? data.machines[idx].current_anchor + Math.max(0, pnl)
          : data.machines[idx].current_anchor,
      updated_at: newCycleStart,
    };
  }
  persistDataFor(userId);
  return report;
}

// ── Public API ──

export function getMachinesByUser(userId: string): Machine[] {
  return getDataFor(userId).machines;
}

export function getMachineById(userId: string, machineId: string): Machine | null {
  return getDataFor(userId).machines.find((m) => m.id === machineId) ?? null;
}

export function getTxByMachine(userId: string, machineId: string): MachineTransaction[] {
  return getDataFor(userId).tx.filter((t) => t.machine_id === machineId);
}

export function getTxByUser(userId: string): MachineTransaction[] {
  return getDataFor(userId).tx;
}

export function getReportsByMachine(userId: string, machineId: string): CycleReport[] {
  return getDataFor(userId).reports.filter((r) => r.machine_id === machineId);
}

export function getReportsByUser(userId: string): CycleReport[] {
  return getDataFor(userId).reports;
}

export function computeKpi(userId: string, machineId?: string): KpiSnapshot {
  const data = getDataFor(userId);
  const machines = machineId
    ? data.machines.filter((m) => m.id === machineId)
    : data.machines;
  const tx = machineId
    ? data.tx.filter((t) => t.machine_id === machineId)
    : data.tx;

  const total_capital = machines.reduce((s, m) => s + m.capital, 0);
  const trades = tx.filter((t) => t.type === "trade_win" || t.type === "trade_loss");
  const wins = trades.filter((t) => t.type === "trade_win").length;
  const trade_count = trades.length;
  const win_rate = trade_count > 0 ? wins / trade_count : 0;
  const pnl = trades.reduce((s, t) => s + t.amount, 0);

  // Drawdown: lowest equity point relative to running peak
  let equity = 0;
  let peak = 0;
  let drawdown = 0;
  const ordered = [...trades].sort((a, b) => a.created_at.localeCompare(b.created_at));
  for (const t of ordered) {
    equity += t.amount;
    if (equity > peak) peak = equity;
    const dd = equity - peak;
    if (dd < drawdown) drawdown = dd;
  }

  const oldest = machines.reduce<Machine | null>((acc, m) => {
    const start = m.cycle_started_at ?? m.created_at;
    if (!acc) return m;
    const accStart = acc.cycle_started_at ?? acc.created_at;
    return start < accStart ? m : acc;
  }, null);
  const days_active = oldest
    ? Math.max(
        0,
        Math.floor(
          (NOW - new Date(oldest.cycle_started_at ?? oldest.created_at).getTime()) / DAY,
        ),
      )
    : 0;

  return { total_capital, pnl, win_rate, drawdown, days_active, trade_count };
}

// ── Access flag ──
// Đọc từ feature-flags store (admin toggle qua UI). Admin role/id có override TRUE.
import { hasFeature } from "@/lib/feature-flags/store";

export function hasMoneyMachineAccess(userId: string, role?: string | null): boolean {
  return hasFeature(userId, "money_machine", role);
}

// ── Scope cho mentor/admin view ──
// Scope thật (mentee của mentor / mọi khách của admin) được layout resolve từ
// cloud (resolveScopeUserIds) rồi lưu localStorage qua setResolvedScope().
// getUserScope đọc lại sync khi render. Không còn user demo hard-code.
const SCOPE_STORAGE_KEY = "rova_comay_scope_v1";

export function setResolvedScope(viewerId: string, ids: string[]): void {
  if (!isBrowser()) return;
  try {
    const all = JSON.parse(window.localStorage.getItem(SCOPE_STORAGE_KEY) || "{}");
    all[viewerId] = ids;
    window.localStorage.setItem(SCOPE_STORAGE_KEY, JSON.stringify(all));
  } catch {
    // quota / private mode — non-fatal
  }
}

function getResolvedScope(viewerId: string): string[] | null {
  if (!isBrowser()) return null;
  try {
    const all = JSON.parse(window.localStorage.getItem(SCOPE_STORAGE_KEY) || "{}");
    const ids = (all as Record<string, unknown>)[viewerId];
    return Array.isArray(ids) ? (ids as string[]) : null;
  } catch {
    return null;
  }
}

export function getUserScope(role: string | undefined | null, userId: string): string[] {
  // Trang khách (client) chỉ xem cỗ máy của chính mình.
  if (role === "client" || !role) return [userId];
  // Trang mentor/admin: dùng scope thật do layout resolve từ cloud (mentee/mọi
  // khách). Chưa resolve xong → fallback chính mình để không hiển thị dữ liệu sai.
  return getResolvedScope(userId) ?? [userId];
}

export function getMachinesForScope(userIds: string[]): Machine[] {
  return userIds.flatMap((id) => getMachinesByUser(id));
}

export function getTxForScope(userIds: string[]): MachineTransaction[] {
  return userIds.flatMap((id) => getTxByUser(id));
}

export function getReportsForScope(userIds: string[]): CycleReport[] {
  return userIds.flatMap((id) => getReportsByUser(id));
}

export function computeKpiForScope(userIds: string[]): KpiSnapshot {
  const machines = getMachinesForScope(userIds);
  const tx = getTxForScope(userIds);

  const total_capital = machines.reduce((s, m) => s + m.capital, 0);
  const trades = tx.filter((t) => t.type === "trade_win" || t.type === "trade_loss");
  const wins = trades.filter((t) => t.type === "trade_win").length;
  const trade_count = trades.length;
  const win_rate = trade_count > 0 ? wins / trade_count : 0;
  const pnl = trades.reduce((s, t) => s + t.amount, 0);

  let equity = 0;
  let peak = 0;
  let drawdown = 0;
  const ordered = [...trades].sort((a, b) => a.created_at.localeCompare(b.created_at));
  for (const t of ordered) {
    equity += t.amount;
    if (equity > peak) peak = equity;
    const dd = equity - peak;
    if (dd < drawdown) drawdown = dd;
  }

  const oldest = machines.reduce<Machine | null>((acc, m) => {
    const start = m.cycle_started_at ?? m.created_at;
    if (!acc) return m;
    const accStart = acc.cycle_started_at ?? acc.created_at;
    return start < accStart ? m : acc;
  }, null);
  const days_active = oldest
    ? Math.max(
        0,
        Math.floor(
          (NOW - new Date(oldest.cycle_started_at ?? oldest.created_at).getTime()) / DAY,
        ),
      )
    : 0;

  return { total_capital, pnl, win_rate, drawdown, days_active, trade_count };
}
