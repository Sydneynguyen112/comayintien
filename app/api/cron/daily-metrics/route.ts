import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * Daily aggregate cron — chạy lúc 01:00 UTC = 08:00 Vietnam.
 * Gọi 4 RPC nối tiếp:
 *   - compute_daily_user_metrics(yesterday)
 *   - compute_habit_scores()
 *   - snapshot_user_tiers()  (chỉ chạy chủ nhật để giữ pattern "weekly")
 *   - check_re_engagement_success()
 *
 * Auth: header `Authorization: Bearer ${CRON_SECRET}` — Vercel tự gửi khi schedule
 * khớp `vercel.json` + secret env var được set.
 */
export const runtime = "edge";

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET}`;
  if (process.env.CRON_SECRET && auth !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  // Service role key for unrestricted RPC. Fallback to anon nếu chưa setup.
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    return NextResponse.json({ error: "Missing Supabase env" }, { status: 500 });
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const results: Record<string, unknown> = {};

  // 1. Daily user metrics cho hôm qua
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const dum = await supabase.rpc("compute_daily_user_metrics", { target_date: yesterday });
  results.daily_user_metrics = dum.error ? { error: dum.error.message } : "ok";

  // 2. Habit scores
  const hs = await supabase.rpc("compute_habit_scores");
  results.habit_scores = hs.error ? { error: hs.error.message } : "ok";

  // 3. Tier snapshot — chạy mỗi ngày (idempotent ON CONFLICT update)
  const ts = await supabase.rpc("snapshot_user_tiers");
  results.tier_snapshot = ts.error ? { error: ts.error.message } : "ok";

  // 4. Re-engagement success check
  const re = await supabase.rpc("check_re_engagement_success");
  results.re_engagement = re.error ? { error: re.error.message } : "ok";

  return NextResponse.json({ ok: true, date: yesterday, results });
}
