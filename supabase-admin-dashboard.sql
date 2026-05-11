-- ============================================
-- ADMIN DASHBOARD — events + daily_user_metrics + RPC functions
-- Spec: docs/admin-dashboard/01-tab-overview.md
-- IDEMPOTENT
-- ============================================

-- ─────────────────────────────────────────────
-- 1. EVENTS TABLE (cardinal user actions stream)
-- ─────────────────────────────────────────────
-- Khác với activity_events (page view, login granular), events lưu
-- domain-level actions cho habit/funnel analysis.
CREATE TABLE IF NOT EXISTS public.events (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  event_name TEXT NOT NULL,
  properties JSONB DEFAULT '{}'::jsonb,
  session_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_events_user_created ON public.events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_name_created ON public.events(event_name, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_created ON public.events(created_at DESC);

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "events_user_insert_own" ON public.events;
CREATE POLICY "events_user_insert_own" ON public.events
  FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "events_admin_read_all" ON public.events;
CREATE POLICY "events_admin_read_all" ON public.events
  FOR SELECT TO anon, authenticated USING (true);

-- ─────────────────────────────────────────────
-- 2. DAILY_USER_METRICS (pre-aggregated)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.daily_user_metrics (
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  trades_logged INT DEFAULT 0,
  withdrawals_logged INT DEFAULT 0,
  sessions INT DEFAULT 0,
  events_count INT DEFAULT 0,
  is_active BOOLEAN DEFAULT FALSE,
  PRIMARY KEY (user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_dum_date ON public.daily_user_metrics(date DESC);
CREATE INDEX IF NOT EXISTS idx_dum_active_date ON public.daily_user_metrics(is_active, date DESC);

ALTER TABLE public.daily_user_metrics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "dum_admin_read" ON public.daily_user_metrics;
CREATE POLICY "dum_admin_read" ON public.daily_user_metrics
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- ─────────────────────────────────────────────
-- 3. COMPUTE FUNCTION (chạy nightly hoặc backfill)
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.compute_daily_user_metrics(target_date DATE DEFAULT (CURRENT_DATE - INTERVAL '1 day')::DATE)
RETURNS void AS $$
BEGIN
  INSERT INTO public.daily_user_metrics (user_id, date, trades_logged, withdrawals_logged, sessions, events_count, is_active)
  SELECT
    user_id,
    target_date AS date,
    COUNT(*) FILTER (WHERE event_name = 'trade_logged') AS trades_logged,
    COUNT(*) FILTER (WHERE event_name = 'withdrawal_logged') AS withdrawals_logged,
    COUNT(DISTINCT session_id) FILTER (WHERE session_id IS NOT NULL) AS sessions,
    COUNT(*) AS events_count,
    TRUE AS is_active
  FROM public.events
  WHERE created_at::date = target_date
    AND user_id IS NOT NULL
  GROUP BY user_id
  ON CONFLICT (user_id, date)
  DO UPDATE SET
    trades_logged = EXCLUDED.trades_logged,
    withdrawals_logged = EXCLUDED.withdrawals_logged,
    sessions = EXCLUDED.sessions,
    events_count = EXCLUDED.events_count,
    is_active = EXCLUDED.is_active;
END;
$$ LANGUAGE plpgsql;

-- Backfill 90 days at once
CREATE OR REPLACE FUNCTION public.backfill_daily_metrics(days_back INT DEFAULT 90)
RETURNS void AS $$
DECLARE
  d DATE;
BEGIN
  FOR i IN 0..days_back LOOP
    d := (CURRENT_DATE - (i || ' days')::INTERVAL)::DATE;
    PERFORM public.compute_daily_user_metrics(d);
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ─────────────────────────────────────────────
-- 4. BACKFILL EVENTS từ data hiện có
-- ─────────────────────────────────────────────
-- 4a. user_signup từ profiles (chỉ comay users)
INSERT INTO public.events (user_id, event_name, created_at, properties)
SELECT id, 'user_signup', created_at, jsonb_build_object('source', source)
FROM public.profiles
WHERE source = 'comay'
  AND NOT EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.user_id = profiles.id AND e.event_name = 'user_signup'
  );

-- 4b. trade_logged từ comay_transactions
INSERT INTO public.events (user_id, event_name, created_at, properties)
SELECT
  user_id,
  'trade_logged',
  created_at,
  jsonb_build_object(
    'machine_id', machine_id,
    'trade_type', type,
    'pnl', amount,
    'symbol', symbol
  )
FROM public.comay_transactions
WHERE type IN ('trade_win', 'trade_loss')
  AND NOT EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.user_id = comay_transactions.user_id
      AND e.event_name = 'trade_logged'
      AND e.created_at = comay_transactions.created_at
      AND e.properties->>'machine_id' = comay_transactions.machine_id
  );

-- 4c. withdrawal_logged từ comay_transactions
INSERT INTO public.events (user_id, event_name, created_at, properties)
SELECT
  user_id,
  'withdrawal_logged',
  created_at,
  jsonb_build_object('machine_id', machine_id, 'amount', amount)
FROM public.comay_transactions
WHERE type = 'withdraw'
  AND NOT EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.user_id = comay_transactions.user_id
      AND e.event_name = 'withdrawal_logged'
      AND e.created_at = comay_transactions.created_at
      AND e.properties->>'machine_id' = comay_transactions.machine_id
  );

-- 4d. trading_account_created từ comay_machines
INSERT INTO public.events (user_id, event_name, created_at, properties)
SELECT
  user_id,
  'trading_account_created',
  created_at,
  jsonb_build_object('machine_id', id, 'name', name, 'capital', capital)
FROM public.comay_machines
WHERE NOT EXISTS (
  SELECT 1 FROM public.events e
  WHERE e.user_id = comay_machines.user_id
    AND e.event_name = 'trading_account_created'
    AND e.properties->>'machine_id' = comay_machines.id
);

-- 4e. user_login từ activity_events
INSERT INTO public.events (user_id, event_name, created_at, properties)
SELECT user_id, 'user_login', created_at, COALESCE(metadata, '{}'::jsonb)
FROM public.activity_events
WHERE type = 'login'
  AND NOT EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.user_id = activity_events.user_id
      AND e.event_name = 'user_login'
      AND e.created_at = activity_events.created_at
  );

-- Sau khi backfill events → compute daily metrics 90 ngày
SELECT public.backfill_daily_metrics(90);

-- ─────────────────────────────────────────────
-- 5. RPC FUNCTIONS cho KPI
-- ─────────────────────────────────────────────

-- WAU Loggers (North Star): user có ≥3 trade_logged trong 7 ngày
CREATE OR REPLACE FUNCTION public.get_wau_loggers(end_date DATE DEFAULT CURRENT_DATE)
RETURNS INT AS $$
  WITH loggers AS (
    SELECT user_id, COUNT(*) AS cnt
    FROM public.events
    WHERE event_name = 'trade_logged'
      AND created_at >= (end_date - INTERVAL '7 days')
      AND created_at < (end_date + INTERVAL '1 day')
    GROUP BY user_id
  )
  SELECT COUNT(*)::INT FROM loggers WHERE cnt >= 3
$$ LANGUAGE SQL STABLE;

-- DAU
CREATE OR REPLACE FUNCTION public.get_dau(target_date DATE DEFAULT CURRENT_DATE)
RETURNS INT AS $$
  SELECT COALESCE(COUNT(DISTINCT user_id)::INT, 0)
  FROM public.daily_user_metrics
  WHERE date = target_date AND is_active = TRUE
$$ LANGUAGE SQL STABLE;

-- MAU
CREATE OR REPLACE FUNCTION public.get_mau(end_date DATE DEFAULT CURRENT_DATE)
RETURNS INT AS $$
  SELECT COALESCE(COUNT(DISTINCT user_id)::INT, 0)
  FROM public.daily_user_metrics
  WHERE date >= (end_date - INTERVAL '30 days')
    AND date <= end_date
    AND is_active = TRUE
$$ LANGUAGE SQL STABLE;

-- WAU (7d distinct active)
CREATE OR REPLACE FUNCTION public.get_wau(end_date DATE DEFAULT CURRENT_DATE)
RETURNS INT AS $$
  SELECT COALESCE(COUNT(DISTINCT user_id)::INT, 0)
  FROM public.daily_user_metrics
  WHERE date >= (end_date - INTERVAL '7 days')
    AND date <= end_date
    AND is_active = TRUE
$$ LANGUAGE SQL STABLE;

-- New signups count
CREATE OR REPLACE FUNCTION public.get_signups_count(start_date DATE, end_date DATE)
RETURNS INT AS $$
  SELECT COUNT(*)::INT
  FROM public.profiles
  WHERE source = 'comay'
    AND created_at::date >= start_date
    AND created_at::date <= end_date
$$ LANGUAGE SQL STABLE;

-- Activation rate: user signup 14-28 ngày trước có ≥7 trades trong 14 ngày đầu
CREATE OR REPLACE FUNCTION public.get_activation_rate()
RETURNS NUMERIC AS $$
  WITH eligible AS (
    SELECT id, created_at
    FROM public.profiles
    WHERE source = 'comay'
      AND created_at::date BETWEEN (CURRENT_DATE - 28) AND (CURRENT_DATE - 14)
  ),
  activated AS (
    SELECT u.id
    FROM eligible u
    JOIN public.events e ON e.user_id = u.id
    WHERE e.event_name = 'trade_logged'
      AND e.created_at <= u.created_at + INTERVAL '14 days'
    GROUP BY u.id
    HAVING COUNT(*) >= 7
  )
  SELECT
    CASE WHEN (SELECT COUNT(*) FROM eligible) = 0 THEN 0
      ELSE ROUND((SELECT COUNT(*) FROM activated)::NUMERIC * 100 / (SELECT COUNT(*) FROM eligible), 2)
    END
$$ LANGUAGE SQL STABLE;

-- Trades count (1 ngày)
CREATE OR REPLACE FUNCTION public.get_trades_count(target_date DATE DEFAULT CURRENT_DATE)
RETURNS INT AS $$
  SELECT COUNT(*)::INT
  FROM public.events
  WHERE event_name = 'trade_logged'
    AND created_at::date = target_date
$$ LANGUAGE SQL STABLE;

-- At-risk user count (stub — Tab 3 sẽ chi tiết hoá)
-- Tạm define: user approved comay, không có event trong ≥7 ngày qua
CREATE OR REPLACE FUNCTION public.get_at_risk_count()
RETURNS INT AS $$
  WITH approved_users AS (
    SELECT user_id FROM public.apps_access
    WHERE app = 'comay' AND status = 'approved'
  ),
  recently_active AS (
    SELECT DISTINCT user_id FROM public.events
    WHERE created_at >= (CURRENT_DATE - INTERVAL '7 days')
  )
  SELECT COUNT(*)::INT
  FROM approved_users a
  WHERE NOT EXISTS (SELECT 1 FROM recently_active r WHERE r.user_id = a.user_id)
$$ LANGUAGE SQL STABLE;

-- ─────────────────────────────────────────────
-- 6. TIME SERIES helpers cho charts
-- ─────────────────────────────────────────────

-- WAU loggers 12 tuần qua
CREATE OR REPLACE FUNCTION public.get_wau_loggers_series(weeks INT DEFAULT 12)
RETURNS TABLE (week_end DATE, value INT) AS $$
  SELECT
    (CURRENT_DATE - (gs * 7 || ' days')::INTERVAL)::DATE AS week_end,
    public.get_wau_loggers((CURRENT_DATE - (gs * 7 || ' days')::INTERVAL)::DATE) AS value
  FROM generate_series(weeks - 1, 0, -1) AS gs
$$ LANGUAGE SQL STABLE;

-- DAU/WAU/MAU 90 ngày
CREATE OR REPLACE FUNCTION public.get_active_users_series(days INT DEFAULT 90)
RETURNS TABLE (day DATE, dau INT, wau INT, mau INT) AS $$
  SELECT
    d::DATE AS day,
    public.get_dau(d::DATE) AS dau,
    public.get_wau(d::DATE) AS wau,
    public.get_mau(d::DATE) AS mau
  FROM generate_series(
    CURRENT_DATE - (days || ' days')::INTERVAL,
    CURRENT_DATE,
    '1 day'::INTERVAL
  ) AS d
$$ LANGUAGE SQL STABLE;

-- Signups 30 ngày (theo ngày)
CREATE OR REPLACE FUNCTION public.get_signups_series(days INT DEFAULT 30)
RETURNS TABLE (day DATE, count INT) AS $$
  SELECT
    d.day::DATE,
    COALESCE((SELECT COUNT(*)::INT FROM public.profiles p
              WHERE p.source = 'comay' AND p.created_at::date = d.day::date), 0) AS count
  FROM generate_series(
    CURRENT_DATE - (days || ' days')::INTERVAL,
    CURRENT_DATE,
    '1 day'::INTERVAL
  ) AS d(day)
$$ LANGUAGE SQL STABLE;

-- ============================================
-- Verify
-- ============================================
-- SELECT public.get_wau_loggers();
-- SELECT public.get_dau();
-- SELECT public.get_mau();
-- SELECT public.get_activation_rate();
-- SELECT public.get_at_risk_count();
-- SELECT * FROM public.get_wau_loggers_series(12);
