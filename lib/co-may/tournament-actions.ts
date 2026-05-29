"use server";

// Server actions cho Giải đấu (Tournaments).
// Chạy server-side với SUPABASE_SERVICE_ROLE_KEY (bypass RLS) — giống mt5-actions.ts.
// Admin: tạo/sửa/xoá giải + duyệt/từ chối đăng ký. Khách: đăng ký (có enforce rules).

import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";
import type {
  LeaderboardMetric,
  TournamentStatus,
} from "./types";

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Thiếu NEXT_PUBLIC_SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY trong env.");
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export interface ActionResult {
  success: boolean;
  id?: string;
  error?: string;
}

export interface TournamentInput {
  title: string;
  description?: string;
  status?: TournamentStatus;
  leaderboard_metric?: LeaderboardMetric;
  required_currency?: "USD" | "USC" | null;
  min_capital?: number | null; // canonical USD
  max_capital?: number | null;
  start_date?: string | null;
  end_date?: string | null;
  created_by?: string;
}

// ── Admin: tạo giải ──
export async function createTournament(input: TournamentInput): Promise<ActionResult> {
  const sb = serviceClient();
  if (!input.title?.trim()) return { success: false, error: "Tên giải đấu không được để trống." };

  const id = `trn-${randomUUID()}`;
  const now = new Date().toISOString();
  const res = await sb.from("tournaments").insert({
    id,
    title: input.title.trim(),
    description: input.description?.trim() || null,
    status: input.status ?? "draft",
    leaderboard_metric: input.leaderboard_metric ?? "pnl_pct",
    required_currency: input.required_currency ?? null,
    min_capital: input.min_capital ?? null,
    max_capital: input.max_capital ?? null,
    start_date: input.start_date ?? null,
    end_date: input.end_date ?? null,
    created_by: input.created_by ?? null,
    created_at: now,
    updated_at: now,
  });
  if (res.error) return { success: false, error: `Tạo giải fail: ${res.error.message}` };
  return { success: true, id };
}

// ── Admin: sửa giải ──
export async function updateTournament(
  id: string,
  patch: Partial<TournamentInput>,
): Promise<ActionResult> {
  const sb = serviceClient();
  const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.title !== undefined) row.title = patch.title.trim();
  if (patch.description !== undefined) row.description = patch.description?.trim() || null;
  if (patch.status !== undefined) row.status = patch.status;
  if (patch.leaderboard_metric !== undefined) row.leaderboard_metric = patch.leaderboard_metric;
  if (patch.required_currency !== undefined) row.required_currency = patch.required_currency;
  if (patch.min_capital !== undefined) row.min_capital = patch.min_capital;
  if (patch.max_capital !== undefined) row.max_capital = patch.max_capital;
  if (patch.start_date !== undefined) row.start_date = patch.start_date;
  if (patch.end_date !== undefined) row.end_date = patch.end_date;

  const res = await sb.from("tournaments").update(row).eq("id", id);
  if (res.error) return { success: false, error: `Sửa giải fail: ${res.error.message}` };
  return { success: true, id };
}

// ── Admin: xoá giải (cascade registrations) ──
export async function deleteTournament(id: string): Promise<ActionResult> {
  const sb = serviceClient();
  const res = await sb.from("tournaments").delete().eq("id", id);
  if (res.error) return { success: false, error: `Xoá giải fail: ${res.error.message}` };
  return { success: true, id };
}

// ── Khách: đăng ký 1 cỗ máy vào giải (enforce rules) ──
export async function registerForTournament(input: {
  tournamentId: string;
  machineId: string;
  userId: string;
}): Promise<ActionResult> {
  const sb = serviceClient();

  // 1. Giải tồn tại + đang mở
  const tRes = await sb
    .from("tournaments")
    .select("id, status, required_currency, min_capital, max_capital")
    .eq("id", input.tournamentId)
    .maybeSingle();
  if (tRes.error) return { success: false, error: `Query giải fail: ${tRes.error.message}` };
  if (!tRes.data) return { success: false, error: "Không tìm thấy giải đấu." };
  if (tRes.data.status !== "open")
    return { success: false, error: "Giải đấu hiện không mở đăng ký." };

  // 2. Máy tồn tại + thuộc user
  const mRes = await sb
    .from("comay_machines")
    .select("id, user_id, capital, currency_unit, status")
    .eq("id", input.machineId)
    .maybeSingle();
  if (mRes.error) return { success: false, error: `Query máy fail: ${mRes.error.message}` };
  if (!mRes.data) return { success: false, error: "Không tìm thấy cỗ máy." };
  if (mRes.data.user_id !== input.userId)
    return { success: false, error: "Cỗ máy không thuộc về bạn." };

  // 3. Enforce rules
  const reqCur = tRes.data.required_currency as "USD" | "USC" | null;
  const machineCur = (mRes.data.currency_unit as string) || "USD";
  if (reqCur && machineCur !== reqCur)
    return { success: false, error: `Giải yêu cầu tài khoản ${reqCur === "USC" ? "cent (¢)" : "USD ($)"}.` };

  const cap = Number(mRes.data.capital) || 0;
  const min = tRes.data.min_capital as number | null;
  const max = tRes.data.max_capital as number | null;
  if (min != null && cap < min)
    return { success: false, error: `Vốn cỗ máy phải ≥ vốn tối thiểu của giải.` };
  if (max != null && cap > max)
    return { success: false, error: `Vốn cỗ máy phải ≤ vốn tối đa của giải.` };

  // 4. Chưa đăng ký giải này
  const existing = await sb
    .from("tournament_registrations")
    .select("id")
    .eq("tournament_id", input.tournamentId)
    .eq("user_id", input.userId)
    .maybeSingle();
  if (existing.data)
    return { success: false, error: "Bạn đã đăng ký giải này rồi." };

  // 5. Insert pending
  const id = `treg-${randomUUID()}`;
  const now = new Date().toISOString();
  const res = await sb.from("tournament_registrations").insert({
    id,
    tournament_id: input.tournamentId,
    user_id: input.userId,
    machine_id: input.machineId,
    status: "pending",
    created_at: now,
    updated_at: now,
  });
  if (res.error) {
    if (res.error.code === "23505")
      return { success: false, error: "Bạn đã đăng ký giải này rồi." };
    return { success: false, error: `Đăng ký fail: ${res.error.message}` };
  }
  return { success: true, id };
}

// ── Admin: duyệt đăng ký (chụp baseline để tính điểm từ thời điểm này) ──
export async function approveRegistration(
  registrationId: string,
  adminId?: string,
): Promise<ActionResult> {
  const sb = serviceClient();

  const regRes = await sb
    .from("tournament_registrations")
    .select("id, machine_id")
    .eq("id", registrationId)
    .maybeSingle();
  if (regRes.error) return { success: false, error: `Query đăng ký fail: ${regRes.error.message}` };
  if (!regRes.data) return { success: false, error: "Không tìm thấy đăng ký." };

  // baseline_balance = capital + Σ pnl + Σ withdraw (withdraw amount âm)
  const machineId = regRes.data.machine_id as string;
  const mRes = await sb.from("comay_machines").select("capital").eq("id", machineId).maybeSingle();
  if (mRes.error || !mRes.data) return { success: false, error: "Không đọc được vốn cỗ máy." };
  const capital = Number(mRes.data.capital) || 0;

  const txRes = await sb
    .from("comay_transactions")
    .select("type, amount")
    .eq("machine_id", machineId);
  if (txRes.error) return { success: false, error: `Query giao dịch fail: ${txRes.error.message}` };
  let balance = capital;
  for (const t of txRes.data ?? []) {
    const type = t.type as string;
    const amount = Number(t.amount) || 0;
    if (type === "trade_win" || type === "trade_loss" || type === "withdraw") balance += amount;
  }

  const now = new Date().toISOString();
  const res = await sb
    .from("tournament_registrations")
    .update({
      status: "approved",
      baseline_balance: balance,
      baseline_at: now,
      approved_by: adminId ?? null,
      reject_reason: null,
      updated_at: now,
    })
    .eq("id", registrationId);
  if (res.error) return { success: false, error: `Duyệt fail: ${res.error.message}` };
  return { success: true, id: registrationId };
}

// ── Admin: từ chối đăng ký ──
export async function rejectRegistration(
  registrationId: string,
  reason?: string,
  adminId?: string,
): Promise<ActionResult> {
  const sb = serviceClient();
  const now = new Date().toISOString();
  const res = await sb
    .from("tournament_registrations")
    .update({
      status: "rejected",
      reject_reason: reason?.trim() || null,
      approved_by: adminId ?? null,
      updated_at: now,
    })
    .eq("id", registrationId);
  if (res.error) return { success: false, error: `Từ chối fail: ${res.error.message}` };
  return { success: true, id: registrationId };
}
