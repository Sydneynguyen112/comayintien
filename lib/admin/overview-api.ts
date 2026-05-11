"use client";

import { supabase } from "@/lib/supabase";
import type { TimeSeriesPoint } from "./types";

export interface OverviewKpis {
  wau_loggers: { current: number; previous: number };
  dau: { current: number; previous: number };
  mau: { current: number };
  stickiness: { current: number; previous: number };
  new_signups: { current: number; previous: number };
  activation_rate: { current: number };
  at_risk_users: { current: number };
  trades_today: { current: number; previous: number };
}

export interface OverviewSeries {
  wauLoggers12w: TimeSeriesPoint[];
  activeUsers90d: { date: string; dau: number; wau: number; mau: number }[];
  signups30d: TimeSeriesPoint[];
}

/**
 * Fetch all KPI in parallel. 8 RPC calls → ~200-400ms tổng (Postgres pool reuse).
 */
export async function fetchOverviewKpis(): Promise<OverviewKpis> {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const lastWeek = new Date(today);
  lastWeek.setDate(today.getDate() - 7);
  const last14Days = new Date(today);
  last14Days.setDate(today.getDate() - 14);
  const last7DaysStart = lastWeek.toISOString().slice(0, 10);
  const last14DaysStart = last14Days.toISOString().slice(0, 10);
  const todayKey = today.toISOString().slice(0, 10);
  const yesterdayKey = yesterday.toISOString().slice(0, 10);
  const lastWeekKey = lastWeek.toISOString().slice(0, 10);

  const [
    wauNow, wauPrev,
    dauNow, dauPrev,
    mauNow, mauPrev,
    signupsNow, signupsPrev,
    activation,
    atRisk,
    tradesNow, tradesPrev,
  ] = await Promise.all([
    supabase.rpc("get_wau_loggers", { end_date: todayKey }),
    supabase.rpc("get_wau_loggers", { end_date: lastWeekKey }),
    supabase.rpc("get_dau", { target_date: todayKey }),
    supabase.rpc("get_dau", { target_date: yesterdayKey }),
    supabase.rpc("get_mau", { end_date: todayKey }),
    supabase.rpc("get_mau", { end_date: lastWeekKey }),
    supabase.rpc("get_signups_count", { start_date: last7DaysStart, end_date: todayKey }),
    supabase.rpc("get_signups_count", { start_date: last14DaysStart, end_date: last7DaysStart }),
    supabase.rpc("get_activation_rate"),
    supabase.rpc("get_at_risk_count"),
    supabase.rpc("get_trades_count", { target_date: todayKey }),
    supabase.rpc("get_trades_count", { target_date: yesterdayKey }),
  ]);

  const mauValue = (mauNow.data as number) ?? 0;
  const mauPrevValue = (mauPrev.data as number) ?? 0;
  const dauValue = (dauNow.data as number) ?? 0;
  const dauPrevValue = (dauPrev.data as number) ?? 0;
  const stickyNow = mauValue > 0 ? (dauValue / mauValue) * 100 : 0;
  const stickyPrev = mauPrevValue > 0 ? (dauPrevValue / mauPrevValue) * 100 : 0;

  return {
    wau_loggers: { current: (wauNow.data as number) ?? 0, previous: (wauPrev.data as number) ?? 0 },
    dau: { current: dauValue, previous: dauPrevValue },
    mau: { current: mauValue },
    stickiness: { current: stickyNow, previous: stickyPrev },
    new_signups: { current: (signupsNow.data as number) ?? 0, previous: (signupsPrev.data as number) ?? 0 },
    activation_rate: { current: Number(activation.data ?? 0) },
    at_risk_users: { current: (atRisk.data as number) ?? 0 },
    trades_today: { current: (tradesNow.data as number) ?? 0, previous: (tradesPrev.data as number) ?? 0 },
  };
}

export async function fetchOverviewSeries(): Promise<OverviewSeries> {
  const [wau, active, signups] = await Promise.all([
    supabase.rpc("get_wau_loggers_series", { weeks: 12 }),
    supabase.rpc("get_active_users_series", { days: 90 }),
    supabase.rpc("get_signups_series", { days: 30 }),
  ]);

  type WauRow = { week_end: string; value: number };
  type ActiveRow = { day: string; dau: number; wau: number; mau: number };
  type SignupRow = { day: string; count: number };

  return {
    wauLoggers12w: ((wau.data as WauRow[]) ?? []).map((r) => ({ date: r.week_end, value: r.value })),
    activeUsers90d: ((active.data as ActiveRow[]) ?? []).map((r) => ({
      date: r.day, dau: r.dau, wau: r.wau, mau: r.mau,
    })),
    signups30d: ((signups.data as SignupRow[]) ?? []).map((r) => ({ date: r.day, value: r.count })),
  };
}
