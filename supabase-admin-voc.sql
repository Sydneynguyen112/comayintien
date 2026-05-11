-- ============================================
-- ADMIN DASHBOARD — Tab 5 Voice of Customer
-- Spec: docs/admin-dashboard/05-tab-voc.md
-- IDEMPOTENT
-- ============================================

-- ─────────────────────────────────────────────
-- 1. nps_responses
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.nps_responses (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  score INT NOT NULL CHECK (score >= 0 AND score <= 10),
  reason TEXT,
  context TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_nps_created ON public.nps_responses(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_nps_user ON public.nps_responses(user_id);

ALTER TABLE public.nps_responses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "nps_all" ON public.nps_responses;
CREATE POLICY "nps_all" ON public.nps_responses
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- ─────────────────────────────────────────────
-- 2. user_feedback + feedback_votes
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_feedback (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  status TEXT DEFAULT 'new',
  admin_notes TEXT,
  attached_url TEXT,
  upvotes INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

DO $$ BEGIN
  ALTER TABLE public.user_feedback DROP CONSTRAINT IF EXISTS user_feedback_type_check;
  ALTER TABLE public.user_feedback DROP CONSTRAINT IF EXISTS user_feedback_status_check;
EXCEPTION WHEN OTHERS THEN NULL; END $$;
ALTER TABLE public.user_feedback ADD CONSTRAINT user_feedback_type_check
  CHECK (type IN ('bug','feature_request','general','complaint','praise'));
ALTER TABLE public.user_feedback ADD CONSTRAINT user_feedback_status_check
  CHECK (status IN ('new','reviewing','planned','in_progress','done','wont_fix'));

CREATE INDEX IF NOT EXISTS idx_feedback_status ON public.user_feedback(status);
CREATE INDEX IF NOT EXISTS idx_feedback_type ON public.user_feedback(type);
CREATE INDEX IF NOT EXISTS idx_feedback_upvotes ON public.user_feedback(upvotes DESC);

ALTER TABLE public.user_feedback ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "feedback_all" ON public.user_feedback;
CREATE POLICY "feedback_all" ON public.user_feedback
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.feedback_votes (
  feedback_id BIGINT REFERENCES public.user_feedback(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (feedback_id, user_id)
);
ALTER TABLE public.feedback_votes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "feedback_votes_all" ON public.feedback_votes;
CREATE POLICY "feedback_votes_all" ON public.feedback_votes
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- ─────────────────────────────────────────────
-- 3. NPS RPC
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_nps_score(period_days INT DEFAULT 90)
RETURNS TABLE(
  total_responses INT,
  promoters INT,
  passives INT,
  detractors INT,
  nps_score NUMERIC,
  promoter_pct NUMERIC,
  passive_pct NUMERIC,
  detractor_pct NUMERIC
) AS $$
  WITH counts AS (
    SELECT
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE score >= 9) AS promoter_count,
      COUNT(*) FILTER (WHERE score BETWEEN 7 AND 8) AS passive_count,
      COUNT(*) FILTER (WHERE score <= 6) AS detractor_count
    FROM public.nps_responses
    WHERE created_at >= NOW() - (period_days || ' days')::INTERVAL
  )
  SELECT
    total::INT, promoter_count::INT, passive_count::INT, detractor_count::INT,
    CASE WHEN total = 0 THEN 0
         ELSE ROUND((promoter_count - detractor_count)::NUMERIC * 100 / total, 1) END,
    CASE WHEN total = 0 THEN 0 ELSE ROUND(promoter_count::NUMERIC * 100 / total, 1) END,
    CASE WHEN total = 0 THEN 0 ELSE ROUND(passive_count::NUMERIC * 100 / total, 1) END,
    CASE WHEN total = 0 THEN 0 ELSE ROUND(detractor_count::NUMERIC * 100 / total, 1) END
  FROM counts;
$$ LANGUAGE SQL STABLE;

CREATE OR REPLACE FUNCTION public.get_nps_trend(months_back INT DEFAULT 6)
RETURNS TABLE(month_start DATE, nps_score NUMERIC, response_count INT) AS $$
  SELECT
    date_trunc('month', created_at)::date AS month_start,
    ROUND(
      (COUNT(*) FILTER (WHERE score >= 9) - COUNT(*) FILTER (WHERE score <= 6))::NUMERIC
      * 100 / NULLIF(COUNT(*), 0), 1
    ) AS nps_score,
    COUNT(*)::INT AS response_count
  FROM public.nps_responses
  WHERE created_at >= date_trunc('month', NOW() - (months_back || ' months')::INTERVAL)
  GROUP BY month_start
  ORDER BY month_start;
$$ LANGUAGE SQL STABLE;

CREATE OR REPLACE FUNCTION public.get_nps_responses_with_user(limit_n INT DEFAULT 50)
RETURNS TABLE(
  id BIGINT, user_id UUID, full_name TEXT, email TEXT,
  score INT, reason TEXT, created_at TIMESTAMPTZ
) AS $$
  SELECT n.id, n.user_id, p.full_name, p.email, n.score, n.reason, n.created_at
  FROM public.nps_responses n
  LEFT JOIN public.profiles p ON p.id = n.user_id
  ORDER BY n.created_at DESC
  LIMIT limit_n;
$$ LANGUAGE SQL STABLE;

-- ─────────────────────────────────────────────
-- 4. Feedback RPC
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_feedback_stats()
RETURNS TABLE(
  total INT,
  new_count INT,
  open_count INT
) AS $$
  SELECT
    COUNT(*)::INT,
    COUNT(*) FILTER (WHERE status = 'new')::INT,
    COUNT(*) FILTER (WHERE status NOT IN ('done', 'wont_fix'))::INT
  FROM public.user_feedback
  WHERE created_at >= NOW() - INTERVAL '90 days'
$$ LANGUAGE SQL STABLE;

CREATE OR REPLACE FUNCTION public.get_feedback_by_type()
RETURNS TABLE(type TEXT, count INT) AS $$
  SELECT type, COUNT(*)::INT
  FROM public.user_feedback
  WHERE created_at >= NOW() - INTERVAL '90 days'
  GROUP BY type
  ORDER BY count DESC
$$ LANGUAGE SQL STABLE;

CREATE OR REPLACE FUNCTION public.get_feedback_list(
  filter_status TEXT DEFAULT NULL,
  filter_type TEXT DEFAULT NULL,
  sort_by TEXT DEFAULT 'created_at',
  limit_n INT DEFAULT 50
)
RETURNS TABLE(
  id BIGINT, user_id UUID, full_name TEXT, email TEXT,
  type TEXT, title TEXT, content TEXT,
  status TEXT, admin_notes TEXT, attached_url TEXT,
  upvotes INT, created_at TIMESTAMPTZ
) AS $$
  SELECT
    f.id, f.user_id, p.full_name, p.email,
    f.type, f.title, f.content, f.status, f.admin_notes, f.attached_url,
    f.upvotes, f.created_at
  FROM public.user_feedback f
  LEFT JOIN public.profiles p ON p.id = f.user_id
  WHERE (filter_status IS NULL OR f.status = filter_status)
    AND (filter_type IS NULL OR f.type = filter_type)
  ORDER BY
    CASE WHEN sort_by = 'upvotes' THEN f.upvotes END DESC NULLS LAST,
    CASE WHEN sort_by = 'created_at' THEN f.created_at END DESC NULLS LAST
  LIMIT limit_n
$$ LANGUAGE SQL STABLE;

-- ============================================
-- Verify
-- SELECT * FROM public.get_nps_score(90);
-- SELECT * FROM public.get_nps_trend(6);
-- SELECT * FROM public.get_feedback_stats();
-- ============================================
