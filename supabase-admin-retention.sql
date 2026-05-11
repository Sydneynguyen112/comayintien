-- ============================================
-- ADMIN DASHBOARD — Tab 3 Retention
-- Spec: docs/admin-dashboard/03-tab-retention.md
-- IDEMPOTENT. PREREQ: supabase-admin-dashboard.sql đã chạy.
-- ============================================

-- ─────────────────────────────────────────────
-- 1. re_engagement_log — track action admin thực hiện trên at-risk users
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.re_engagement_log (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  re_engaged BOOLEAN DEFAULT FALSE,
  re_engaged_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_reengage_user ON public.re_engagement_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reengage_recent ON public.re_engagement_log(created_at DESC);

ALTER TABLE public.re_engagement_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "re_engagement_admin_all" ON public.re_engagement_log;
CREATE POLICY "re_engagement_admin_all" ON public.re_engagement_log
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- ─────────────────────────────────────────────
-- 2. Cohort retention (12 weeks default)
--    Chỉ tính user source='comay'.
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_cohort_retention(num_weeks INT DEFAULT 12)
RETURNS TABLE(
  cohort_week DATE,
  cohort_size INT,
  week_number INT,
  active_users INT,
  retention_pct NUMERIC
) AS $$
  WITH cohorts AS (
    SELECT
      id AS user_id,
      date_trunc('week', created_at)::date AS cohort_week
    FROM public.profiles
    WHERE source = 'comay'
      AND created_at >= NOW() - (num_weeks || ' weeks')::INTERVAL
  ),
  cohort_sizes AS (
    SELECT cohort_week, COUNT(*)::INT AS size
    FROM cohorts GROUP BY cohort_week
  ),
  user_active_weeks AS (
    SELECT DISTINCT
      c.user_id,
      c.cohort_week,
      date_trunc('week', e.created_at)::date AS active_week,
      (EXTRACT(EPOCH FROM (date_trunc('week', e.created_at) - c.cohort_week)) / (7 * 86400))::INT AS week_number
    FROM cohorts c
    JOIN public.events e ON e.user_id = c.user_id
    WHERE e.event_name = 'trade_logged'
      AND e.created_at >= c.cohort_week
  )
  SELECT
    uaw.cohort_week,
    cs.size AS cohort_size,
    uaw.week_number,
    COUNT(DISTINCT uaw.user_id)::INT AS active_users,
    ROUND(COUNT(DISTINCT uaw.user_id)::NUMERIC * 100 / NULLIF(cs.size, 0), 1) AS retention_pct
  FROM user_active_weeks uaw
  JOIN cohort_sizes cs ON cs.cohort_week = uaw.cohort_week
  WHERE uaw.week_number >= 0 AND uaw.week_number <= num_weeks
  GROUP BY uaw.cohort_week, cs.size, uaw.week_number
  ORDER BY uaw.cohort_week DESC, uaw.week_number ASC;
$$ LANGUAGE SQL STABLE;

-- ─────────────────────────────────────────────
-- 3. Weekly churn rate
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_weekly_churn_rate(num_weeks INT DEFAULT 12)
RETURNS TABLE(week_start DATE, active_prev_week INT, churned INT, churn_rate NUMERIC) AS $$
  WITH weeks AS (
    SELECT generate_series(
      date_trunc('week', NOW() - (num_weeks || ' weeks')::INTERVAL),
      date_trunc('week', NOW()),
      '1 week'
    )::date AS wk
  ),
  weekly_active AS (
    SELECT date_trunc('week', created_at)::date AS week_start, user_id
    FROM public.events
    WHERE event_name = 'trade_logged'
    GROUP BY week_start, user_id
  )
  SELECT
    w.wk AS week_start,
    COUNT(DISTINCT prev.user_id)::INT AS active_prev_week,
    (COUNT(DISTINCT prev.user_id) FILTER (WHERE curr.user_id IS NULL))::INT AS churned,
    CASE
      WHEN COUNT(DISTINCT prev.user_id) = 0 THEN 0
      ELSE ROUND(
        COUNT(DISTINCT prev.user_id) FILTER (WHERE curr.user_id IS NULL)::NUMERIC * 100
        / COUNT(DISTINCT prev.user_id), 2
      )
    END AS churn_rate
  FROM weeks w
  LEFT JOIN weekly_active prev ON prev.week_start = (w.wk - INTERVAL '1 week')::date
  LEFT JOIN weekly_active curr ON curr.week_start = w.wk AND curr.user_id = prev.user_id
  GROUP BY w.wk
  ORDER BY w.wk;
$$ LANGUAGE SQL STABLE;

-- ─────────────────────────────────────────────
-- 4. Active vs Churned 90 ngày (stacked area data)
--    Active: có trade trong 7 ngày trước date.
--    Churned: có trade trước nhưng không trong 21 ngày trước date.
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_active_churned_series(days INT DEFAULT 90)
RETURNS TABLE(day DATE, active_count INT, churned_count INT) AS $$
  WITH dates AS (
    SELECT generate_series(
      CURRENT_DATE - (days || ' days')::INTERVAL,
      CURRENT_DATE,
      '1 day'::INTERVAL
    )::DATE AS d
  ),
  trade_users AS (
    SELECT DISTINCT user_id, MIN(created_at::date) AS first_trade, MAX(created_at::date) AS last_trade
    FROM public.events WHERE event_name = 'trade_logged'
    GROUP BY user_id
  ),
  user_trade_dates AS (
    SELECT DISTINCT user_id, created_at::date AS trade_date
    FROM public.events WHERE event_name = 'trade_logged'
  )
  SELECT
    d.d AS day,
    (SELECT COUNT(DISTINCT user_id)::INT FROM user_trade_dates
       WHERE trade_date BETWEEN (d.d - INTERVAL '7 days')::DATE AND d.d) AS active_count,
    (SELECT COUNT(*)::INT FROM trade_users tu
       WHERE tu.first_trade <= d.d
         AND tu.last_trade < (d.d - INTERVAL '21 days')::DATE) AS churned_count
  FROM dates d
  ORDER BY d.d;
$$ LANGUAGE SQL STABLE;

-- ─────────────────────────────────────────────
-- 5. Resurrection rate 30 ngày
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_resurrection_rate()
RETURNS NUMERIC AS $$
  WITH user_activity AS (
    SELECT
      user_id,
      MIN(created_at) AS first_activity,
      MAX(CASE WHEN created_at < NOW() - INTERVAL '30 days' THEN created_at END) AS last_old_activity,
      MAX(CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN created_at END) AS last_new_activity
    FROM public.events
    WHERE event_name = 'trade_logged'
    GROUP BY user_id
  ),
  previously_churned AS (
    SELECT user_id FROM user_activity
    WHERE last_old_activity IS NOT NULL
      AND last_old_activity < NOW() - INTERVAL '51 days'
  ),
  resurrected AS (
    SELECT pc.user_id FROM previously_churned pc
    JOIN user_activity ua ON ua.user_id = pc.user_id
    WHERE ua.last_new_activity IS NOT NULL
  )
  SELECT
    CASE WHEN (SELECT COUNT(*) FROM previously_churned) = 0 THEN 0
      ELSE ROUND((SELECT COUNT(*) FROM resurrected)::NUMERIC * 100
        / (SELECT COUNT(*) FROM previously_churned), 2)
    END
$$ LANGUAGE SQL STABLE;

-- ─────────────────────────────────────────────
-- 6. Churn snapshot counts
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_churn_snapshot()
RETURNS TABLE(active_count INT, churned_count INT, resurrected_30d INT) AS $$
  WITH user_max AS (
    SELECT user_id, MAX(created_at) AS last_event
    FROM public.events WHERE event_name = 'trade_logged'
    GROUP BY user_id
  )
  SELECT
    (SELECT COUNT(*)::INT FROM user_max WHERE last_event >= NOW() - INTERVAL '7 days') AS active_count,
    (SELECT COUNT(*)::INT FROM user_max WHERE last_event < NOW() - INTERVAL '21 days') AS churned_count,
    (SELECT COUNT(DISTINCT r.user_id)::INT FROM public.re_engagement_log r
       WHERE r.re_engaged = TRUE AND r.re_engaged_at >= NOW() - INTERVAL '30 days') AS resurrected_30d
$$ LANGUAGE SQL STABLE;

-- ─────────────────────────────────────────────
-- 7. At-risk users (simplified — không phụ thuộc habit_scores/tier_history)
--    Reasons:
--    - frequency_drop: tuần này ≤40% median 4 tuần trước (cần ≥3 trade trong 4 tuần)
--    - silent: ≥7 ngày không trade nhưng tổng có ≥3 trade lifetime
--    - returning_no_activity: signup >7 ngày trước nhưng tổng <3 trade
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_at_risk_users()
RETURNS TABLE(
  user_id UUID,
  full_name TEXT,
  email TEXT,
  last_active TIMESTAMPTZ,
  days_inactive INT,
  trades_total INT,
  trades_this_week INT,
  median_trades_4w NUMERIC,
  risk_reasons TEXT[],
  last_action_at TIMESTAMPTZ,
  last_action_type TEXT
) AS $$
  WITH base AS (
    SELECT
      p.id AS user_id,
      p.full_name,
      p.email,
      (SELECT MAX(created_at) FROM public.events
         WHERE user_id = p.id AND event_name = 'trade_logged') AS last_active,
      EXTRACT(DAY FROM (NOW() - COALESCE(
        (SELECT MAX(created_at) FROM public.events
           WHERE user_id = p.id AND event_name = 'trade_logged'),
        p.created_at
      )))::INT AS days_inactive,
      (SELECT COUNT(*)::INT FROM public.events
         WHERE user_id = p.id AND event_name = 'trade_logged') AS trades_total,
      (SELECT COUNT(*)::INT FROM public.events
         WHERE user_id = p.id AND event_name = 'trade_logged'
           AND created_at >= NOW() - INTERVAL '7 days') AS trades_this_week,
      COALESCE((
        SELECT PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY weekly_count)
        FROM (
          SELECT COUNT(*)::INT AS weekly_count
          FROM public.events
          WHERE user_id = p.id AND event_name = 'trade_logged'
            AND created_at >= NOW() - INTERVAL '5 weeks'
            AND created_at < NOW() - INTERVAL '1 week'
          GROUP BY date_trunc('week', created_at)
        ) sub
      ), 0) AS median_trades_4w
    FROM public.profiles p
    JOIN public.apps_access a ON a.user_id = p.id AND a.app = 'comay' AND a.status = 'approved'
    WHERE p.created_at < NOW() - INTERVAL '7 days'
      AND p.source = 'comay'
  ),
  scored AS (
    SELECT
      *,
      ARRAY_REMOVE(ARRAY[
        CASE WHEN median_trades_4w > 0
                  AND trades_this_week::NUMERIC / median_trades_4w <= 0.4
             THEN 'frequency_drop' END,
        CASE WHEN days_inactive >= 7 AND trades_total >= 3 THEN 'silent_active_user' END,
        CASE WHEN trades_total < 3 AND days_inactive >= 7 THEN 'low_activation' END
      ], NULL) AS risk_reasons
    FROM base
  ),
  last_action AS (
    SELECT DISTINCT ON (user_id) user_id, created_at AS last_action_at, action_type AS last_action_type
    FROM public.re_engagement_log
    ORDER BY user_id, created_at DESC
  )
  SELECT
    s.user_id, s.full_name, s.email, s.last_active, s.days_inactive,
    s.trades_total, s.trades_this_week, s.median_trades_4w, s.risk_reasons,
    la.last_action_at, la.last_action_type
  FROM scored s
  LEFT JOIN last_action la ON la.user_id = s.user_id
  WHERE array_length(s.risk_reasons, 1) > 0
    AND s.days_inactive < 21
  ORDER BY array_length(s.risk_reasons, 1) DESC, s.days_inactive DESC;
$$ LANGUAGE SQL STABLE;

-- ─────────────────────────────────────────────
-- 8. Check re-engagement success (chạy weekly)
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.check_re_engagement_success()
RETURNS void AS $$
  UPDATE public.re_engagement_log r
  SET re_engaged = TRUE,
      re_engaged_at = (
        SELECT MIN(created_at) FROM public.events
        WHERE user_id = r.user_id AND event_name = 'trade_logged'
          AND created_at > r.created_at
      )
  WHERE re_engaged = FALSE
    AND EXISTS (
      SELECT 1 FROM public.events
      WHERE user_id = r.user_id AND event_name = 'trade_logged'
        AND created_at > r.created_at
        AND created_at >= NOW() - INTERVAL '30 days'
    );
$$ LANGUAGE plpgsql;

-- ============================================
-- Verify
-- SELECT * FROM public.get_cohort_retention(8);
-- SELECT * FROM public.get_weekly_churn_rate(12);
-- SELECT * FROM public.get_churn_snapshot();
-- SELECT * FROM public.get_at_risk_users();
-- ============================================
