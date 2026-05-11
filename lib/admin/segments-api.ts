"use client";

import { supabase } from "@/lib/supabase";

export type Dimension = "trading_style" | "account_type" | "tenure_stage";

export interface SegmentMetric {
  segment_value: string;
  user_count: number;
  pct_of_total: number;
  avg_habit_score: number | null;
  median_trades_per_week: number;
  retention_28d_pct: number;
  multi_account_pct: number;
}

export interface TopUser {
  user_id: string;
  full_name: string;
  email: string;
  trading_style: string;
  account_type: string;
  tenure_stage: string;
  account_count: number;
  habit_score: number;
  tier: string;
  median_weekly_trades: number;
  total_trades: number;
  last_active: string | null;
  signup_date: string | null;
}

export const STYLE_META: Record<string, { label: string; color: string }> = {
  scalper: { label: "Scalper", color: "#B8512E" },
  day_trader: { label: "Day Trader", color: "#CD9C20" },
  swing_trader: { label: "Swing Trader", color: "#3B6C4F" },
  position_trader: { label: "Position Trader", color: "#3081A4" },
  inactive: { label: "Inactive", color: "#6B7280" },
};

export const ACCOUNT_META: Record<string, { label: string }> = {
  single_account: { label: "1 tài khoản" },
  multi_account: { label: "2-3 tài khoản" },
  heavy_multi_account: { label: "4+ tài khoản" },
};

export const TENURE_META: Record<string, { label: string }> = {
  new: { label: "New (<30d)" },
  growing: { label: "Growing (30-90d)" },
  mature: { label: "Mature (90d+)" },
};

export async function fetchSegmentMetrics(dimension: Dimension): Promise<SegmentMetric[]> {
  const { data } = await supabase.rpc("get_segment_metrics", { dimension });
  return (data as SegmentMetric[] | null) ?? [];
}

export async function fetchTopUsers(opts: {
  trading_style?: string;
  account_type?: string;
  tenure_stage?: string;
  sort_by?: "habit_score" | "total_trades" | "last_active";
  limit?: number;
}): Promise<TopUser[]> {
  const { data } = await supabase.rpc("get_top_users", {
    filter_trading_style: opts.trading_style ?? null,
    filter_account_type: opts.account_type ?? null,
    filter_tenure_stage: opts.tenure_stage ?? null,
    sort_by: opts.sort_by ?? "habit_score",
    limit_n: opts.limit ?? 50,
  });
  return (data as TopUser[] | null) ?? [];
}
