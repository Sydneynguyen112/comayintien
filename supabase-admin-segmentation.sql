-- ============================================
-- ADMIN DASHBOARD — Tab 4 Segmentation
-- Spec: docs/admin-dashboard/04-tab-segmentation.md
-- IDEMPOTENT. PREREQ: events, user_habit_scores, user_tiers.
-- ============================================

-- ─────────────────────────────────────────────
-- 1. user_segments view
-- ─────────────────────────────────────────────
CREATE OR REPLACE VIEW public.user_segments AS
WITH trade_stats AS (
  SELECT
    user_id,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY weekly_trades) AS median_weekly_trades
  FROM (
    SELECT
      user_id,
      date_trunc('week', created_at) AS week,
      COUNT(*) AS weekly_trades
    FROM public.events
    WHERE event_name = 'trade_logged'
      AND created_at >= NOW() - INTERVAL '4 weeks'
    GROUP BY user_id, week
  ) sub
  GROUP BY user_id
),
account_counts AS (
  -- trading_accounts → comay_machines
  SELECT user_id, COUNT(*)::INT AS account_count
  FROM public.comay_machines
  GROUP BY user_id
),
user_tenure AS (
  SELECT
    id AS user_id,
    EXTRACT(DAY FROM NOW() - created_at)::INT AS days_since_signup
  FROM public.profiles
  WHERE source = 'comay'
)
SELECT
  u.id AS user_id,
  u.email,
  u.full_name,
  ut.days_since_signup,
  COALESCE(ac.account_count, 0) AS account_count,
  COALESCE(ts.median_weekly_trades, 0) AS median_weekly_trades,
  CASE
    WHEN COALESCE(ts.median_weekly_trades, 0) >= 20 THEN 'scalper'
    WHEN COALESCE(ts.median_weekly_trades, 0) >= 8 THEN 'day_trader'
    WHEN COALESCE(ts.median_weekly_trades, 0) >= 3 THEN 'swing_trader'
    WHEN COALESCE(ts.median_weekly_trades, 0) >= 1 THEN 'position_trader'
    ELSE 'inactive'
  END AS trading_style,
  CASE
    WHEN COALESCE(ac.account_count, 0) <= 1 THEN 'single_account'
    WHEN COALESCE(ac.account_count, 0) <= 3 THEN 'multi_account'
    ELSE 'heavy_multi_account'
  END AS account_type,
  CASE
    WHEN ut.days_since_signup < 30 THEN 'new'
    WHEN ut.days_since_signup < 90 THEN 'growing'
    ELSE 'mature'
  END AS tenure_stage
FROM public.profiles u
LEFT JOIN user_tenure ut ON ut.user_id = u.id
LEFT JOIN account_counts ac ON ac.user_id = u.id
LEFT JOIN trade_stats ts ON ts.user_id = u.id
WHERE u.source = 'comay';

-- ─────────────────────────────────────────────
-- 2. get_segment_metrics(dimension)
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_segment_metrics(dimension TEXT)
RETURNS TABLE(
  segment_value TEXT,
  user_count INT,
  pct_of_total NUMERIC,
  avg_habit_score NUMERIC,
  median_trades_per_week NUMERIC,
  retention_28d_pct NUMERIC,
  multi_account_pct NUMERIC
) AS $$
DECLARE
  total_users INT;
BEGIN
  SELECT COUNT(*) INTO total_users FROM public.user_segments;
  IF total_users = 0 THEN total_users := 1; END IF;

  IF dimension = 'trading_style' THEN
    RETURN QUERY
    SELECT
      us.trading_style,
      COUNT(*)::INT,
      ROUND(COUNT(*)::NUMERIC * 100 / total_users, 1),
      ROUND(AVG(hs.total_score), 1),
      ROUND(AVG(us.median_weekly_trades), 1),
      ROUND(COUNT(*) FILTER (WHERE ut.tier IN ('power','core','casual'))::NUMERIC * 100 / NULLIF(COUNT(*), 0), 1),
      ROUND(COUNT(*) FILTER (WHERE us.account_type != 'single_account')::NUMERIC * 100 / NULLIF(COUNT(*), 0), 1)
    FROM public.user_segments us
    LEFT JOIN public.user_habit_scores hs ON hs.user_id = us.user_id
    LEFT JOIN public.user_tiers ut ON ut.user_id = us.user_id
    GROUP BY us.trading_style;

  ELSIF dimension = 'account_type' THEN
    RETURN QUERY
    SELECT
      us.account_type, COUNT(*)::INT,
      ROUND(COUNT(*)::NUMERIC * 100 / total_users, 1),
      ROUND(AVG(hs.total_score), 1),
      ROUND(AVG(us.median_weekly_trades), 1),
      ROUND(COUNT(*) FILTER (WHERE ut.tier IN ('power','core','casual'))::NUMERIC * 100 / NULLIF(COUNT(*), 0), 1),
      0::NUMERIC
    FROM public.user_segments us
    LEFT JOIN public.user_habit_scores hs ON hs.user_id = us.user_id
    LEFT JOIN public.user_tiers ut ON ut.user_id = us.user_id
    GROUP BY us.account_type;

  ELSIF dimension = 'tenure_stage' THEN
    RETURN QUERY
    SELECT
      us.tenure_stage, COUNT(*)::INT,
      ROUND(COUNT(*)::NUMERIC * 100 / total_users, 1),
      ROUND(AVG(hs.total_score), 1),
      ROUND(AVG(us.median_weekly_trades), 1),
      ROUND(COUNT(*) FILTER (WHERE ut.tier IN ('power','core','casual'))::NUMERIC * 100 / NULLIF(COUNT(*), 0), 1),
      ROUND(COUNT(*) FILTER (WHERE us.account_type != 'single_account')::NUMERIC * 100 / NULLIF(COUNT(*), 0), 1)
    FROM public.user_segments us
    LEFT JOIN public.user_habit_scores hs ON hs.user_id = us.user_id
    LEFT JOIN public.user_tiers ut ON ut.user_id = us.user_id
    GROUP BY us.tenure_stage;
  END IF;
END;
$$ LANGUAGE plpgsql STABLE;

-- ─────────────────────────────────────────────
-- 3. get_top_users() với filter
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_top_users(
  filter_trading_style TEXT DEFAULT NULL,
  filter_account_type TEXT DEFAULT NULL,
  filter_tenure_stage TEXT DEFAULT NULL,
  sort_by TEXT DEFAULT 'habit_score',
  limit_n INT DEFAULT 50
)
RETURNS TABLE(
  user_id UUID,
  full_name TEXT,
  email TEXT,
  trading_style TEXT,
  account_type TEXT,
  tenure_stage TEXT,
  account_count INT,
  habit_score NUMERIC,
  tier TEXT,
  median_weekly_trades NUMERIC,
  total_trades INT,
  last_active TIMESTAMPTZ,
  signup_date TIMESTAMPTZ
) AS $$
  SELECT
    us.user_id,
    us.full_name,
    us.email,
    us.trading_style,
    us.account_type,
    us.tenure_stage,
    us.account_count,
    COALESCE(hs.total_score, 0)::NUMERIC AS habit_score,
    COALESCE(ut.tier, 'unknown') AS tier,
    us.median_weekly_trades,
    (SELECT COUNT(*)::INT FROM public.events
     WHERE user_id = us.user_id AND event_name = 'trade_logged') AS total_trades,
    (SELECT MAX(created_at) FROM public.events WHERE user_id = us.user_id) AS last_active,
    p.created_at AS signup_date
  FROM public.user_segments us
  LEFT JOIN public.user_habit_scores hs ON hs.user_id = us.user_id
  LEFT JOIN public.user_tiers ut ON ut.user_id = us.user_id
  LEFT JOIN public.profiles p ON p.id = us.user_id
  WHERE (filter_trading_style IS NULL OR us.trading_style = filter_trading_style)
    AND (filter_account_type IS NULL OR us.account_type = filter_account_type)
    AND (filter_tenure_stage IS NULL OR us.tenure_stage = filter_tenure_stage)
  ORDER BY
    CASE WHEN sort_by = 'habit_score' THEN COALESCE(hs.total_score, 0) END DESC NULLS LAST,
    CASE WHEN sort_by = 'total_trades' THEN
      (SELECT COUNT(*) FROM public.events WHERE user_id = us.user_id AND event_name = 'trade_logged')
    END DESC NULLS LAST,
    CASE WHEN sort_by = 'last_active' THEN
      (SELECT MAX(created_at) FROM public.events WHERE user_id = us.user_id)
    END DESC NULLS LAST
  LIMIT limit_n;
$$ LANGUAGE SQL STABLE;

-- ============================================
-- Verify
-- SELECT * FROM public.user_segments LIMIT 5;
-- SELECT * FROM public.get_segment_metrics('trading_style');
-- SELECT * FROM public.get_top_users(NULL, NULL, NULL, 'habit_score', 10);
-- ============================================
