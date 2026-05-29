// Đọc dữ liệu Giải đấu phía client (query Supabase trực tiếp, RLS allow_all cho
// phép đọc chéo user — cần cho leaderboard). Không đi qua localStorage per-user.

import { supabase } from "@/lib/supabase";
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

interface TxRow {
  machine_id: string;
  type: string;
  amount: number;
  volume: number | null;
  created_at: string;
}

/**
 * Leaderboard tính động: registrations approved → máy + giao dịch (sau baseline_at)
 * → metric theo giải. Sort desc theo metric chính, gán rank.
 */
export async function computeLeaderboard(tournament: Tournament): Promise<LeaderboardEntry[]> {
  const regs = await listRegistrations(tournament.id, "approved");
  if (regs.length === 0) return [];

  const machineIds = regs.map((r) => r.machine_id);
  const userIds = Array.from(new Set(regs.map((r) => r.user_id)));

  const [machinesRes, txRes, profilesRes] = await Promise.all([
    supabase.from("comay_machines").select("id, name, capital, currency_unit").in("id", machineIds),
    supabase.from("comay_transactions").select("machine_id, type, amount, volume, created_at").in("machine_id", machineIds),
    supabase.from("profiles").select("id, full_name").in("id", userIds),
  ]);

  const machineById = new Map(
    ((machinesRes.data ?? []) as { id: string; name: string; capital: number; currency_unit: string | null }[]).map(
      (m) => [m.id, m],
    ),
  );
  const nameByUser = new Map(
    ((profilesRes.data ?? []) as { id: string; full_name: string | null }[]).map((p) => [p.id, p.full_name ?? "—"]),
  );
  const txByMachine = new Map<string, TxRow[]>();
  for (const t of (txRes.data ?? []) as TxRow[]) {
    const arr = txByMachine.get(t.machine_id) ?? [];
    arr.push(t);
    txByMachine.set(t.machine_id, arr);
  }

  const entries: LeaderboardEntry[] = regs.map((r) => {
    const m = machineById.get(r.machine_id);
    const baselineAt = r.baseline_at ? new Date(r.baseline_at).getTime() : 0;
    const baseline = Number(r.baseline_balance ?? m?.capital ?? 0) || 0;
    const txs = (txByMachine.get(r.machine_id) ?? []).filter(
      (t) => new Date(t.created_at).getTime() >= baselineAt,
    );
    const trades = txs.filter((t) => t.type === "trade_win" || t.type === "trade_loss");
    const pnl = trades.reduce((s, t) => s + (Number(t.amount) || 0), 0);
    const wins = trades.filter((t) => (Number(t.amount) || 0) > 0).length;
    const tradeCount = trades.length;
    const winRate = tradeCount > 0 ? wins / tradeCount : 0;
    const volume = trades.reduce((s, t) => s + (Number(t.volume) || 0), 0);
    const pnlPct = baseline > 0 ? (pnl / baseline) * 100 : 0;
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
    };
  });

  entries.sort((a, b) => b.score - a.score);
  entries.forEach((e, i) => (e.rank = i + 1));
  return entries;
}
