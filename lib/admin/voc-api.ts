"use client";

import { supabase } from "@/lib/supabase";

export interface NpsSummary {
  total_responses: number;
  promoters: number;
  passives: number;
  detractors: number;
  nps_score: number;
  promoter_pct: number;
  passive_pct: number;
  detractor_pct: number;
}

export interface NpsTrendPoint {
  month_start: string;
  nps_score: number;
  response_count: number;
}

export interface NpsResponse {
  id: number;
  user_id: string;
  full_name: string;
  email: string;
  score: number;
  reason: string | null;
  created_at: string;
}

export interface FeedbackStats {
  total: number;
  new_count: number;
  open_count: number;
}

export interface FeedbackTypeCount {
  type: string;
  count: number;
}

export interface FeedbackItem {
  id: number;
  user_id: string;
  full_name: string;
  email: string;
  type: string;
  title: string;
  content: string;
  status: string;
  admin_notes: string | null;
  attached_url: string | null;
  upvotes: number;
  created_at: string;
}

export const FEEDBACK_TYPE_META: Record<string, { label: string; color: string }> = {
  bug: { label: "Bug", color: "#B8512E" },
  feature_request: { label: "Feature", color: "#CD9C20" },
  general: { label: "General", color: "#6B7280" },
  complaint: { label: "Complaint", color: "#9F2D2D" },
  praise: { label: "Praise", color: "#3B6C4F" },
};

export const FEEDBACK_STATUS_META: Record<string, { label: string; color: string }> = {
  new: { label: "New", color: "#CD9C20" },
  reviewing: { label: "Reviewing", color: "#3081A4" },
  planned: { label: "Planned", color: "#7E5BC9" },
  in_progress: { label: "In progress", color: "#0EA5E9" },
  done: { label: "Done", color: "#3B6C4F" },
  wont_fix: { label: "Won't fix", color: "#6B7280" },
};

export async function fetchNpsSummary(period = 90): Promise<NpsSummary> {
  const { data } = await supabase.rpc("get_nps_score", { period_days: period });
  const row = (data as NpsSummary[] | null)?.[0];
  return row ?? {
    total_responses: 0, promoters: 0, passives: 0, detractors: 0,
    nps_score: 0, promoter_pct: 0, passive_pct: 0, detractor_pct: 0,
  };
}

export async function fetchNpsTrend(months = 6): Promise<NpsTrendPoint[]> {
  const { data } = await supabase.rpc("get_nps_trend", { months_back: months });
  return (data as NpsTrendPoint[] | null) ?? [];
}

export async function fetchNpsResponses(limit = 50): Promise<NpsResponse[]> {
  const { data } = await supabase.rpc("get_nps_responses_with_user", { limit_n: limit });
  return (data as NpsResponse[] | null) ?? [];
}

export async function fetchFeedbackStats(): Promise<FeedbackStats> {
  const { data } = await supabase.rpc("get_feedback_stats");
  const row = (data as FeedbackStats[] | null)?.[0];
  return row ?? { total: 0, new_count: 0, open_count: 0 };
}

export async function fetchFeedbackByType(): Promise<FeedbackTypeCount[]> {
  const { data } = await supabase.rpc("get_feedback_by_type");
  return (data as FeedbackTypeCount[] | null) ?? [];
}

export async function fetchFeedbackList(opts: {
  status?: string;
  type?: string;
  sort_by?: "upvotes" | "created_at";
  limit?: number;
}): Promise<FeedbackItem[]> {
  const { data } = await supabase.rpc("get_feedback_list", {
    filter_status: opts.status ?? null,
    filter_type: opts.type ?? null,
    sort_by: opts.sort_by ?? "created_at",
    limit_n: opts.limit ?? 50,
  });
  return (data as FeedbackItem[] | null) ?? [];
}

export async function updateFeedback(id: number, patch: { status?: string; admin_notes?: string }): Promise<void> {
  await supabase
    .from("user_feedback")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id);
}

export async function submitNpsResponse(userId: string, score: number, reason: string, context = "manual"): Promise<void> {
  await supabase.from("nps_responses").insert({ user_id: userId, score, reason: reason || null, context });
}

export async function submitFeedback(
  userId: string,
  type: string, title: string, content: string,
  attachedUrl?: string,
): Promise<void> {
  await supabase.from("user_feedback").insert({
    user_id: userId, type, title, content,
    attached_url: attachedUrl ?? null,
  });
}
