// Đọc dữ liệu Giải đấu phía client (query Supabase trực tiếp, RLS allow_all cho
// phép đọc chéo user — cần cho leaderboard). Không đi qua localStorage per-user.

import { supabase } from "@/lib/supabase";
import { USC_PER_USD } from "./currency";
import type {
  CurrencyUnit,
  LeaderboardEntry,
  RegistrationStatus,
  Tournament,
  TournamentRegistration,
} from "./types";

export interface MachineTournamentTag {
  tournamentId: string;
  tournamentTitle: string;
  status: RegistrationStatus; // chỉ pending | approved (rejected bị loại)
}

/** Map machineId → giải đang tham gia (để gắn tag/highlight ở card cỗ máy). */
export async function getMachineTournamentMap(
  machineIds: string[],
): Promise<Record<string, MachineTournamentTag>> {
  if (machineIds.length === 0) return {};
  const { data: regs } = await supabase
    .from("tournament_registrations")
    .select("machine_id, tournament_id, status")
    .in("machine_id", machineIds)
    .neq("status", "rejected");
  const list = (regs ?? []) as { machine_id: string; tournament_id: string; status: RegistrationStatus }[];
  if (list.length === 0) return {};
  const tids = Array.from(new Set(list.map((r) => r.tournament_id)));
  const { data: tours } = await supabase.from("tournaments").select("id, title").in("id", tids);
  const titleById = new Map(((tours ?? []) as { id: string; title: string }[]).map((t) => [t.id, t.title]));
  const out: Record<string, MachineTournamentTag> = {};
  for (const r of list) {
    const prev = out[r.machine_id];
    // approved ưu tiên hơn pending nếu 1 máy có nhiều đăng ký
    if (!prev || (prev.status !== "approved" && r.status === "approved")) {
      out[r.machine_id] = {
        tournamentId: r.tournament_id,
        tournamentTitle: titleById.get(r.tournament_id) ?? "Giải đấu",
        status: r.status,
      };
    }
  }
  return out;
}

export async function listTournaments(): Promise<Tournament[]> {
  const { data } = await supabase
    .from("tournaments")
    .select("*")
    .order("created_at", { ascending: false });
  return (data ?? []) as Tournament[];
}

export async function getTournament(id: string): Promise<Tournament | null> {
  const { data } = await supabase.from("tournaments").select("*").eq("id", id).maybeSingle();
  return (data as Tournament) ?? null;
}

export async function listRegistrations(
  tournamentId: string,
  status?: TournamentRegistration["status"],
): Promise<TournamentRegistration[]> {
  let q = supabase
    .from("tournament_registrations")
    .select("*")
    .eq("tournament_id", tournamentId)
    .order("created_at", { ascending: false });
  if (status) q = q.eq("status", status);
  const { data } = await q;
  return (data ?? []) as TournamentRegistration[];
}

export async function getUserRegistration(
  tournamentId: string,
  userId: string,
): Promise<TournamentRegistration | null> {
  const { data } = await supabase
    .from("tournament_registrations")
    .select("*")
    .eq("tournament_id", tournamentId)
    .eq("user_id", userId)
    .maybeSingle();
  return (data as TournamentRegistration) ?? null;
}

/** Số người đã được duyệt cho mỗi giải (cho thẻ list). */
export async function countApprovedByTournament(): Promise<Record<string, number>> {
  const { data } = await supabase
    .from("tournament_registrations")
    .select("tournament_id")
    .eq("status", "approved");
  const out: Record<string, number> = {};
  for (const r of (data ?? []) as { tournament_id: string }[]) {
    out[r.tournament_id] = (out[r.tournament_id] ?? 0) + 1;
  }
  return out;
}

interface Mt5TradeRow {
  mt5_account_id: string;
  profit: number | null;
  swap: number | null;
  commission: number | null;
  volume: number | null;
  time_close: string | null;
}

/**
 * Leaderboard tính động theo KẾT QUẢ MT5 THẬT (KHÔNG dùng log tay):
 *   registrations approved → cỗ máy → MT5 account (qua mt5_machine_links) →
 *   TẤT CẢ các lệnh ĐÃ ĐÓNG của account (KHÔNG lọc theo cửa sổ giải).
 * PnL = Σ(profit + swap + commission) toàn bộ lệnh đã đóng.
 * ROI (%tăng trưởng) = PnL / TỔNG TIỀN NẠP MT5 (mt5_transactions type=deposit),
 *   khớp ĐÚNG cách MT5/màn "MT5 thực tế" hiển thị "Lợi nhuận / Tiền nạp" toàn bộ.
 *   Thiếu dữ liệu nạp thì fallback vốn cỗ máy. PnL & tiền nạp cùng đơn vị tài khoản
 *   nên tỉ lệ tự triệt tiêu cent; vẫn quy cả hai về USD canonical để fallback capital
 *   khớp đơn vị.
 * Máy chưa kết nối MT5 → không có dữ liệu thật → score 0, mt5_linked=false,
 * và luôn xếp dưới các máy đã kết nối.
 */
export async function computeLeaderboard(tournament: Tournament): Promise<LeaderboardEntry[]> {
  const regs = await listRegistrations(tournament.id, "approved");
  if (regs.length === 0) return [];

  const machineIds = regs.map((r) => r.machine_id);
  const userIds = Array.from(new Set(regs.map((r) => r.user_id)));

  // machine_id → mt5_account_id (ưu tiên link is_primary nếu 1 máy có nhiều link)
  const { data: linkRows } = await supabase
    .from("mt5_machine_links")
    .select("machine_id, mt5_account_id, is_primary")
    .in("machine_id", machineIds);
  const accountByMachine = new Map<string, string>();
  for (const l of (linkRows ?? []) as {
    machine_id: string;
    mt5_account_id: string;
    is_primary: boolean | null;
  }[]) {
    if (!accountByMachine.has(l.machine_id) || l.is_primary) {
      accountByMachine.set(l.machine_id, l.mt5_account_id);
    }
  }
  const accountIds = Array.from(new Set([...accountByMachine.values()]));

  const [machinesRes, profilesRes] = await Promise.all([
    supabase.from("comay_machines").select("id, name, capital, currency_unit").in("id", machineIds),
    supabase.from("profiles").select("id, full_name").in("id", userIds),
  ]);

  // Lệnh MT5 đã đóng + currency thật của account (guard tránh .in([]) rỗng).
  // currency = "USC" → tài khoản cent: EA ghi profit thô theo CENT (xem
  // MT5SupabaseSync.mq5 ghi DEAL_PROFIT không quy đổi) → phải chia 100 về USD.
  let tradeRows: Mt5TradeRow[] = [];
  const centByAccount = new Map<string, boolean>();
  // Tổng tiền nạp THẬT theo account (mt5_transactions type=deposit, đơn vị tài khoản).
  const depositRawByAccount = new Map<string, number>();
  if (accountIds.length > 0) {
    const [tradesR, statesR, depositsR] = await Promise.all([
      supabase
        .from("mt5_trades")
        .select("mt5_account_id, profit, swap, commission, volume, time_close")
        .in("mt5_account_id", accountIds)
        .eq("is_closed", true),
      supabase
        .from("mt5_account_states")
        .select("mt5_account_id, currency")
        .in("mt5_account_id", accountIds),
      supabase
        .from("mt5_transactions")
        .select("mt5_account_id, amount")
        .in("mt5_account_id", accountIds)
        .eq("type", "deposit"),
    ]);
    tradeRows = (tradesR.data ?? []) as Mt5TradeRow[];
    for (const s of (statesR.data ?? []) as { mt5_account_id: string; currency: string | null }[]) {
      centByAccount.set(s.mt5_account_id, String(s.currency ?? "").toUpperCase() === "USC");
    }
    for (const d of (depositsR.data ?? []) as { mt5_account_id: string; amount: number | null }[]) {
      depositRawByAccount.set(
        d.mt5_account_id,
        (depositRawByAccount.get(d.mt5_account_id) ?? 0) + (Number(d.amount) || 0),
      );
    }
  }

  const machineById = new Map(
    ((machinesRes.data ?? []) as { id: string; name: string; capital: number; currency_unit: string | null }[]).map(
      (m) => [m.id, m],
    ),
  );
  const nameByUser = new Map(
    ((profilesRes.data ?? []) as { id: string; full_name: string | null }[]).map((p) => [p.id, p.full_name ?? "—"]),
  );
  const tradesByAccount = new Map<string, Mt5TradeRow[]>();
  for (const t of tradeRows) {
    const arr = tradesByAccount.get(t.mt5_account_id) ?? [];
    arr.push(t);
    tradesByAccount.set(t.mt5_account_id, arr);
  }

  const pnlOf = (t: Mt5TradeRow) =>
    (Number(t.profit) || 0) + (Number(t.swap) || 0) + (Number(t.commission) || 0);

  const entries: LeaderboardEntry[] = regs.map((r) => {
    const m = machineById.get(r.machine_id);
    const accountId = accountByMachine.get(r.machine_id) ?? null;

    // Tài khoản cent (USC) → MT5 báo tiền theo CENT; quy về USD canonical (chia 100).
    // Ưu tiên currency thật từ broker, fallback currency_unit của máy.
    const machineIsCent = String(m?.currency_unit ?? "").toUpperCase() === "USC";
    const isCent = accountId ? centByAccount.get(accountId) ?? machineIsCent : machineIsCent;
    const moneyFactor = isCent ? 1 / USC_PER_USD : 1;

    // Mẫu số ROI = TỔNG TIỀN NẠP MT5 (quy USD canonical). Tiền nạp & PnL cùng đơn vị
    // tài khoản nên ×moneyFactor triệt tiêu trong tỉ lệ; vẫn quy USD để fallback capital
    // khớp đơn vị khi tài khoản chưa sync tiền nạp.
    const depositUsd = (accountId ? depositRawByAccount.get(accountId) ?? 0 : 0) * moneyFactor;
    const denom = depositUsd > 0 ? depositUsd : Number(m?.capital) || Number(r.baseline_balance ?? 0) || 0;

    // ROI khớp MT5: tính TẤT CẢ lệnh đã đóng của account (không lọc cửa sổ giải).
    const trades = accountId ? tradesByAccount.get(accountId) ?? [] : [];
    const pnl = trades.reduce((s, t) => s + pnlOf(t) * moneyFactor, 0);
    const tradeCount = trades.length;
    const wins = trades.filter((t) => pnlOf(t) > 0).length;
    const winRate = tradeCount > 0 ? wins / tradeCount : 0;
    const volume = trades.reduce((s, t) => s + (Number(t.volume) || 0), 0);
    const pnlPct = denom > 0 ? (pnl / denom) * 100 : 0;
    const score =
      tournament.leaderboard_metric === "win_rate"
        ? winRate * 100
        : tournament.leaderboard_metric === "volume"
          ? volume
          : pnlPct;
    return {
      rank: 0,
      registration_id: r.id,
      machine_id: r.machine_id,
      machine_name: m?.name ?? "—",
      user_id: r.user_id,
      display_name: nameByUser.get(r.user_id) ?? "—",
      currency_unit: ((m?.currency_unit as CurrencyUnit) ?? "USD") || "USD",
      pnl_pct: pnlPct,
      win_rate: winRate,
      volume,
      trade_count: tradeCount,
      score,
      mt5_linked: accountId !== null,
    };
  });

  // Máy đã kết nối MT5 luôn xếp trên máy chưa kết nối; cùng nhóm thì sort theo score.
  entries.sort((a, b) => {
    if (a.mt5_linked !== b.mt5_linked) return a.mt5_linked ? -1 : 1;
    return b.score - a.score;
  });
  entries.forEach((e, i) => (e.rank = i + 1));
  return entries;
}
