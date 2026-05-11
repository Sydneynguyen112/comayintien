-- ============================================
-- ADMIN DASHBOARD — Tab 2 Engagement & Habit
-- Spec: docs/admin-dashboard/02-tab-engagement.md
-- IDEMPOTENT. PREREQ: events table + daily_user_metrics.
-- ============================================

-- ─────────────────────────────────────────────
-- 1. user_habit_scores — habit strength 0-100
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_habit_scores (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  frequency_score NUMERIC(5,2) DEFAULT 0,
  consistency_score NUMERIC(5,2) DEFAULT 0,
  recency_score NUMERIC(5,2) DEFAULT 0,
  total_score NUMERIC(5,2) DEFAULT 0,
  computed_at TIMESTAMPTZ DEFAULT NOW(),
  total_score_7d_ago NUMERIC(5,2),
  total_score_28d_ago NUMERIC(5,2)
);

CREATE INDEX IF NOT EXISTS idx_habit_scores_total ON public.user_habit_scores(total_score DESC);

ALTER TABLE public.user_habit_scores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "habit_scores_admin_all" ON public.user_habit_scores;
CREATE POLICY "habit_scores_admin_all" ON public.user_habit_scores
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- ─────────────────────────────────────────────
-- 2. compute_habit_scores: 0.4F + 0.3C + 0.3R cho mọi user active 28d
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.compute_habit_scores()
RETURNS void AS $$
DECLARE
  v_user RECORD;
  v_frequency NUMERIC;
  v_consistency NUMERIC;
  v_recency NUMERIC;
  v_total NUMERIC;
  v_days_active INT;
  v_gaps_array NUMERIC[];
  v_mean NUMERIC;
  v_std NUMERIC;
  v_cv NUMERIC;
  v_days_since_last INT;
BEGIN
  FOR v_user IN
    SELECT DISTINCT user_id FROM public.events
    WHERE created_at >= NOW() - INTERVAL '28 days'
      AND user_id IS NOT NULL
  LOOP
    SELECT COUNT(DISTINCT created_at::date) INTO v_days_active
    FROM public.events
    WHERE user_id = v_user.user_id
      AND created_at >= NOW() - INTERVAL '28 days';
    v_frequency := LEAST(100, v_days_active::NUMERIC / 28 * 100);

    SELECT ARRAY_AGG(gap_seconds ORDER BY gap_seconds) INTO v_gaps_array
    FROM (
      SELECT EXTRACT(EPOCH FROM (created_at - LAG(created_at) OVER (ORDER BY created_at))) AS gap_seconds
      FROM public.events
      WHERE user_id = v_user.user_id
        AND event_name = 'trade_logged'
        AND created_at >= NOW() - INTERVAL '28 days'
    ) sub
    WHERE gap_seconds IS NOT NULL;

    IF v_gaps_array IS NULL OR array_length(v_gaps_array, 1) < 2 THEN
      v_consistency := 0;
    ELSE
      SELECT AVG(g), STDDEV(g) INTO v_mean, v_std FROM unnest(v_gaps_array) AS g;
      IF v_mean IS NULL OR v_mean = 0 THEN
        v_consistency := 0;
      ELSE
        v_cv := v_std / v_mean;
        v_consistency := GREATEST(0, LEAST(100, (1 - v_cv) * 100));
      END IF;
    END IF;

    SELECT EXTRACT(DAY FROM NOW() - MAX(created_at))::INT INTO v_days_since_last
    FROM public.events WHERE user_id = v_user.user_id;
    v_recency := EXP(-0.1 * COALESCE(v_days_since_last, 28)) * 100;

    v_total := 0.4 * v_frequency + 0.3 * v_consistency + 0.3 * v_recency;

    INSERT INTO public.user_habit_scores (user_id, frequency_score, consistency_score, recency_score, total_score, computed_at)
    VALUES (v_user.user_id, v_frequency, v_consistency, v_recency, v_total, NOW())
    ON CONFLICT (user_id) DO UPDATE SET
      total_score_7d_ago = CASE
        WHEN public.user_habit_scores.computed_at < NOW() - INTERVAL '7 days'
        THEN public.user_habit_scores.total_score
        ELSE public.user_habit_scores.total_score_7d_ago
      END,
      total_score_28d_ago = CASE
        WHEN public.user_habit_scores.computed_at < NOW() - INTERVAL '28 days'
        THEN public.user_habit_scores.total_score
        ELSE public.user_habit_scores.total_score_28d_ago
      END,
      frequency_score = EXCLUDED.frequency_score,
      consistency_score = EXCLUDED.consistency_score,
      recency_score = EXCLUDED.recency_score,
      total_score = EXCLUDED.total_score,
      computed_at = NOW();
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ─────────────────────────────────────────────
-- 3. user_tiers view + history table
-- ─────────────────────────────────────────────
CREATE OR REPLACE VIEW public.user_tiers AS
WITH user_activity AS (
  SELECT
    p.id AS user_id,
    COUNT(DISTINCT d.date) FILTER (WHERE d.date >= CURRENT_DATE - 28) AS days_active_28d,
    MAX(d.date) AS last_active_date
  FROM public.profiles p
  LEFT JOIN public.daily_user_metrics d ON d.user_id = p.id AND d.is_active = TRUE
  WHERE p.source = 'comay'
  GROUP BY p.id
)
SELECT
  user_id, days_active_28d, last_active_date,
  CASE
    WHEN days_active_28d >= 20 THEN 'power'
    WHEN days_active_28d >= 10 THEN 'core'
    WHEN days_active_28d >= 3 THEN 'casual'
    WHEN days_active_28d >= 1 THEN 'at_risk'
    WHEN last_active_date IS NOT NULL AND last_active_date >= CURRENT_DATE - 60 THEN 'dormant'
    ELSE 'churned'
  END AS tier
FROM user_activity;

CREATE TABLE IF NOT EXISTS public.user_tier_history (
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  tier TEXT NOT NULL,
  PRIMARY KEY (user_id, week_start)
);

CREATE INDEX IF NOT EXISTS idx_tier_history_week ON public.user_tier_history(week_start DESC);

ALTER TABLE public.user_tier_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tier_history_admin_all" ON public.user_tier_history;
CREATE POLICY "tier_history_admin_all" ON public.user_tier_history
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.snapshot_user_tiers()
RETURNS void AS $$
BEGIN
  INSERT INTO public.user_tier_history (user_id, week_start, tier)
  SELECT user_id, date_trunc('week', CURRENT_DATE)::date, tier
  FROM public.user_tiers
  ON CONFLICT (user_id, week_start) DO UPDATE SET tier = EXCLUDED.tier;
END;
$$ LANGUAGE plpgsql;

-- ─────────────────────────────────────────────
-- 4. RPC: Habit summary + top users + distribution
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_habit_summary()
RETURNS TABLE(
  avg_score NUMERIC,
  power_users INT,
  delta_7d NUMERIC,
  total_scored_users INT
) AS $$
  SELECT
    COALESCE(ROUND(AVG(total_score), 1), 0) AS avg_score,
    COUNT(*) FILTER (WHERE total_score >= 70)::INT AS power_users,
    COALESCE(ROUND(AVG(total_score) - AVG(total_score_7d_ago), 1), 0) AS delta_7d,
    COUNT(*)::INT AS total_scored_users
  FROM public.user_habit_scores
$$ LANGUAGE SQL STABLE;

CREATE OR REPLACE FUNCTION public.get_habit_distribution()
RETURNS TABLE(bucket_start INT, count INT) AS $$
  WITH buckets AS (
    SELECT generate_series(0, 90, 10) AS bs
  )
  SELECT
    b.bs AS bucket_start,
    COALESCE((SELECT COUNT(*)::INT FROM public.user_habit_scores
              WHERE total_score >= b.bs AND total_score < b.bs + 10), 0) AS count
  FROM buckets b
  ORDER BY b.bs
$$ LANGUAGE SQL STABLE;

CREATE OR REPLACE FUNCTION public.get_top_habit_users(limit_count INT DEFAULT 20)
RETURNS TABLE(
  user_id UUID, full_name TEXT, email TEXT,
  total_score NUMERIC, frequency_score NUMERIC, consistency_score NUMERIC, recency_score NUMERIC,
  delta_7d NUMERIC, last_active TIMESTAMPTZ
) AS $$
  SELECT
    h.user_id, p.full_name, p.email,
    h.total_score, h.frequency_score, h.consistency_score, h.recency_score,
    COALESCE(h.total_score - h.total_score_7d_ago, 0) AS delta_7d,
    (SELECT MAX(created_at) FROM public.events WHERE user_id = h.user_id) AS last_active
  FROM public.user_habit_scores h
  JOIN public.profiles p ON p.id = h.user_id
  ORDER BY h.total_score DESC
  LIMIT limit_count
$$ LANGUAGE SQL STABLE;

-- ─────────────────────────────────────────────
-- 5. RPC: Tier distribution + 12-week stacked + movement
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_tier_distribution()
RETURNS TABLE(tier TEXT, user_count INT) AS $$
  SELECT tier, COUNT(*)::INT AS user_count
  FROM public.user_tiers
  GROUP BY tier
  ORDER BY user_count DESC
$$ LANGUAGE SQL STABLE;

CREATE OR REPLACE FUNCTION public.get_tier_history_series(weeks INT DEFAULT 12)
RETURNS TABLE(week_start DATE, tier TEXT, user_count INT) AS $$
  SELECT week_start, tier, COUNT(*)::INT AS user_count
  FROM public.user_tier_history
  WHERE week_start >= (CURRENT_DATE - (weeks || ' weeks')::INTERVAL)::DATE
  GROUP BY week_start, tier
  ORDER BY week_start
$$ LANGUAGE SQL STABLE;

CREATE OR REPLACE FUNCTION public.get_tier_movements(weeks_back INT DEFAULT 4)
RETURNS TABLE(from_tier TEXT, to_tier TEXT, user_count INT) AS $$
  WITH this_week AS (
    SELECT user_id, tier
    FROM public.user_tier_history
    WHERE week_start = date_trunc('week', CURRENT_DATE)::date
  ),
  past_week AS (
    SELECT user_id, tier
    FROM public.user_tier_history
    WHERE week_start = (date_trunc('week', CURRENT_DATE) - (weeks_back || ' weeks')::INTERVAL)::date
  )
  SELECT p.tier AS from_tier, t.tier AS to_tier, COUNT(*)::INT AS user_count
  FROM past_week p
  JOIN this_week t ON t.user_id = p.user_id
  WHERE p.tier <> t.tier
  GROUP BY p.tier, t.tier
  ORDER BY user_count DESC
$$ LANGUAGE SQL STABLE;

-- ─────────────────────────────────────────────
-- 6. RPC: Logging behavior metrics
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_logging_behavior()
RETURNS TABLE(
  median_trades_per_week NUMERIC,
  median_sessions_per_day NUMERIC,
  median_gap_hours NUMERIC,
  withdrawal_user_pct NUMERIC
) AS $$
  WITH weekly_trades AS (
    SELECT user_id, date_trunc('week', created_at) AS wk, COUNT(*)::INT AS cnt
    FROM public.events
    WHERE event_name = 'trade_logged'
      AND created_at >= NOW() - INTERVAL '4 weeks'
    GROUP BY user_id, wk
  ),
  daily_sessions AS (
    SELECT user_id, created_at::date AS dt, COUNT(DISTINCT session_id) AS cnt
    FROM public.events
    WHERE created_at >= NOW() - INTERVAL '30 days'
      AND session_id IS NOT NULL
    GROUP BY user_id, dt
  ),
  gaps AS (
    SELECT EXTRACT(EPOCH FROM (created_at - LAG(created_at) OVER (PARTITION BY user_id ORDER BY created_at))) / 3600 AS gap_hr
    FROM public.events
    WHERE event_name = 'trade_logged'
      AND created_at >= NOW() - INTERVAL '30 days'
  ),
  withdraw_users AS (
    SELECT COUNT(DISTINCT user_id)::NUMERIC AS w
    FROM public.events
    WHERE event_name = 'withdrawal_logged'
      AND created_at >= NOW() - INTERVAL '30 days'
  ),
  total_users AS (
    SELECT COUNT(DISTINCT user_id)::NUMERIC AS t
    FROM public.events
    WHERE created_at >= NOW() - INTERVAL '30 days'
  )
  SELECT
    COALESCE((SELECT PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY cnt) FROM weekly_trades), 0)::NUMERIC AS median_trades_per_week,
    COALESCE((SELECT PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY cnt) FROM daily_sessions), 0)::NUMERIC AS median_sessions_per_day,
    COALESCE((SELECT PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY gap_hr) FROM gaps WHERE gap_hr IS NOT NULL), 0)::NUMERIC AS median_gap_hours,
    CASE WHEN (SELECT t FROM total_users) = 0 THEN 0
         ELSE ROUND((SELECT w FROM withdraw_users) * 100 / (SELECT t FROM total_users), 1)
    END AS withdrawal_user_pct
$$ LANGUAGE SQL STABLE;

-- Activity heatmap (7 days × 24 hours)
CREATE OR REPLACE FUNCTION public.get_activity_heatmap()
RETURNS TABLE(day_of_week INT, hour_of_day INT, event_count INT) AS $$
  SELECT
    EXTRACT(DOW FROM created_at)::INT AS day_of_week,
    EXTRACT(HOUR FROM created_at)::INT AS hour_of_day,
    COUNT(*)::INT AS event_count
  FROM public.events
  WHERE created_at >= NOW() - INTERVAL '30 days'
  GROUP BY day_of_week, hour_of_day
$$ LANGUAGE SQL STABLE;

-- Current streak distribution
CREATE OR REPLACE FUNCTION public.get_streak_distribution()
RETURNS TABLE(bucket TEXT, user_count INT) AS $$
  WITH user_dates AS (
    SELECT DISTINCT user_id, created_at::date AS d
    FROM public.events
    WHERE event_name = 'trade_logged'
  ),
  numbered AS (
    SELECT user_id, d, d - (ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY d))::INT AS grp
    FROM user_dates
  ),
  streaks AS (
    SELECT user_id, MAX(d) AS streak_end, COUNT(*)::INT AS streak_len
    FROM numbered
    GROUP BY user_id, grp
  ),
  live_streaks AS (
    SELECT user_id, streak_len FROM streaks WHERE streak_end >= CURRENT_DATE - 1
  )
  SELECT
    CASE
      WHEN streak_len BETWEEN 1 AND 3 THEN '1-3d'
      WHEN streak_len BETWEEN 4 AND 7 THEN '4-7d'
      WHEN streak_len BETWEEN 8 AND 14 THEN '8-14d'
      WHEN streak_len BETWEEN 15 AND 30 THEN '15-30d'
      WHEN streak_len BETWEEN 31 AND 60 THEN '31-60d'
      ELSE '60d+'
    END AS bucket,
    COUNT(*)::INT AS user_count
  FROM live_streaks
  GROUP BY 1
  ORDER BY MIN(streak_len)
$$ LANGUAGE SQL STABLE;

-- Avg habit score 90d (lưu computed_at, snapshot 1 lần / ngày — proxy bằng avg theo current)
CREATE OR REPLACE FUNCTION public.get_avg_habit_score_series(days INT DEFAULT 90)
RETURNS TABLE(day DATE, avg_score NUMERIC) AS $$
  -- Proxy: dùng daily_user_metrics events_count làm proxy nếu chưa có snapshot
  -- Cho MVP, trả current score lặp cho mọi day. Tab này sẽ refine khi có habit_score_snapshots.
  SELECT (CURRENT_DATE - (i || ' days')::INTERVAL)::DATE AS day,
         COALESCE((SELECT ROUND(AVG(total_score), 1) FROM public.user_habit_scores), 0) AS avg_score
  FROM generate_series(0, days) AS i
  ORDER BY day
$$ LANGUAGE SQL STABLE;

-- ─────────────────────────────────────────────
-- Trigger snapshot lần đầu sau khi compute
-- ─────────────────────────────────────────────
SELECT public.compute_habit_scores();
SELECT public.snapshot_user_tiers();

-- ============================================
-- Verify
-- SELECT * FROM public.get_habit_summary();
-- SELECT * FROM public.get_tier_distribution();
-- SELECT * FROM public.get_logging_behavior();
-- SELECT * FROM public.get_streak_distribution();
-- ============================================
