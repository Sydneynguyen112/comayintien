"use client";

import { supabase } from "@/lib/supabase";

export interface HabitSummary {
  avg_score: number;
  power_users: number;
  delta_7d: number;
  total_scored_users: number;
}

export interface HabitBucket {
  bucket_start: number;
  count: number;
}

export interface TopHabitUser {
  user_id: string;
  full_name: string;
  email: string;
  total_score: number;
  frequency_score: number;
  consistency_score: number;
  recency_score: number;
  delta_7d: number;
  last_active: string | null;
}

export interface TierCount {
  tier: string;
  user_count: number;
}

export interface TierHistoryPoint {
  week_start: string;
  tier: string;
  user_count: number;
}

export interface TierMovement {
  from_tier: string;
  to_tier: string;
  user_count: number;
}

export interface LoggingBehavior {
  median_trades_per_week: number;
  median_sessions_per_day: number;
  median_gap_hours: number;
  withdrawal_user_pct: number;
}

export interface HeatmapCell {
  day_of_week: number;
  hour_of_day: number;
  event_count: number;
}

export interface StreakBucket {
  bucket: string;
  user_count: number;
}

export async function fetchHabitSummary(): Promise<HabitSummary> {
  const { data } = await supabase.rpc("get_habit_summary");
  const row = (data as HabitSummary[] | null)?.[0];
  return row ?? { avg_score: 0, power_users: 0, delta_7d: 0, total_scored_users: 0 };
}

export async function fetchHabitDistribution(): Promise<HabitBucket[]> {
  const { data } = await supabase.rpc("get_habit_distribution");
  return (data as HabitBucket[] | null) ?? [];
}

export async function fetchTopHabitUsers(limit = 20): Promise<TopHabitUser[]> {
  const { data } = await supabase.rpc("get_top_habit_users", { limit_count: limit });
  return (data as TopHabitUser[] | null) ?? [];
}

export async function fetchTierDistribution(): Promise<TierCount[]> {
  const { data } = await supabase.rpc("get_tier_distribution");
  return (data as TierCount[] | null) ?? [];
}

export async function fetchTierHistorySeries(weeks = 12): Promise<TierHistoryPoint[]> {
  const { data } = await supabase.rpc("get_tier_history_series", { weeks });
  return (data as TierHistoryPoint[] | null) ?? [];
}

export async function fetchTierMovements(weeksBack = 4): Promise<TierMovement[]> {
  const { data } = await supabase.rpc("get_tier_movements", { weeks_back: weeksBack });
  return (data as TierMovement[] | null) ?? [];
}

export async function fetchLoggingBehavior(): Promise<LoggingBehavior> {
  const { data } = await supabase.rpc("get_logging_behavior");
  const row = (data as LoggingBehavior[] | null)?.[0];
  return row ?? { median_trades_per_week: 0, median_sessions_per_day: 0, median_gap_hours: 0, withdrawal_user_pct: 0 };
}

export async function fetchActivityHeatmap(): Promise<HeatmapCell[]> {
  const { data } = await supabase.rpc("get_activity_heatmap");
  return (data as HeatmapCell[] | null) ?? [];
}

export async function fetchStreakDistribution(): Promise<StreakBucket[]> {
  const { data } = await supabase.rpc("get_streak_distribution");
  return (data as StreakBucket[] | null) ?? [];
}

export const TIER_META: Record<string, { label: string; color: string }> = {
  power: { label: "Power", color: "#7E5BC9" },
  core: { label: "Core", color: "#3081A4" },
  casual: { label: "Casual", color: "#3B6C4F" },
  at_risk: { label: "At-Risk", color: "#CD9C20" },
  dormant: { label: "Dormant", color: "#B8512E" },
  churned: { label: "Churned", color: "#9F2D2D" },
};
