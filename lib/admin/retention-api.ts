"use client";

import { supabase } from "@/lib/supabase";

export interface CohortRow {
  cohort_week: string;
  cohort_size: number;
  week_number: number;
  active_users: number;
  retention_pct: number;
}

export interface CohortGrid {
  cohorts: { week: string; size: number; cells: (number | null)[] }[];
  maxWeekNumber: number;
}

export interface ChurnSnapshot {
  active_count: number;
  churned_count: number;
  resurrected_30d: number;
}

export interface ChurnRow {
  week_start: string;
  active_prev_week: number;
  churned: number;
  churn_rate: number;
}

export interface ActiveChurnedPoint {
  day: string;
  active_count: number;
  churned_count: number;
}

export interface AtRiskUser {
  user_id: string;
  full_name: string;
  email: string;
  last_active: string | null;
  days_inactive: number;
  trades_total: number;
  trades_this_week: number;
  median_trades_4w: number;
  risk_reasons: string[];
  last_action_at: string | null;
  last_action_type: string | null;
}

export async function fetchCohortRetention(weeks = 12): Promise<CohortGrid> {
  const { data } = await supabase.rpc("get_cohort_retention", { num_weeks: weeks });
  const rows = (data as CohortRow[] | null) ?? [];
  const byCohort = new Map<string, { size: number; cells: Map<number, number> }>();
  let maxWeekNumber = 0;
  for (const r of rows) {
    if (!byCohort.has(r.cohort_week)) {
      byCohort.set(r.cohort_week, { size: r.cohort_size, cells: new Map() });
    }
    byCohort.get(r.cohort_week)!.cells.set(r.week_number, Number(r.retention_pct ?? 0));
    if (r.week_number > maxWeekNumber) maxWeekNumber = r.week_number;
  }
  const cohorts = Array.from(byCohort.entries())
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([week, info]) => {
      const cells: (number | null)[] = [];
      for (let w = 0; w <= maxWeekNumber; w++) {
        cells.push(info.cells.has(w) ? info.cells.get(w)! : null);
      }
      return { week, size: info.size, cells };
    });
  return { cohorts, maxWeekNumber };
}

export async function fetchChurnSnapshot(): Promise<ChurnSnapshot> {
  const { data } = await supabase.rpc("get_churn_snapshot");
  const row = (data as ChurnSnapshot[] | null)?.[0];
  return row ?? { active_count: 0, churned_count: 0, resurrected_30d: 0 };
}

export async function fetchWeeklyChurnRate(weeks = 12): Promise<ChurnRow[]> {
  const { data } = await supabase.rpc("get_weekly_churn_rate", { num_weeks: weeks });
  return (data as ChurnRow[] | null) ?? [];
}

export async function fetchActiveChurnedSeries(days = 90): Promise<ActiveChurnedPoint[]> {
  const { data } = await supabase.rpc("get_active_churned_series", { days });
  return (data as ActiveChurnedPoint[] | null) ?? [];
}

export async function fetchResurrectionRate(): Promise<number> {
  const { data } = await supabase.rpc("get_resurrection_rate");
  return Number(data ?? 0);
}

export async function fetchAtRiskUsers(): Promise<AtRiskUser[]> {
  const { data } = await supabase.rpc("get_at_risk_users");
  return (data as AtRiskUser[] | null) ?? [];
}

export async function logReEngagement(
  userId: string,
  actionType: string,
  notes: string,
  adminId: string,
): Promise<void> {
  await supabase.from("re_engagement_log").insert({
    user_id: userId,
    action_type: actionType,
    notes,
    created_by: adminId,
  });
}
