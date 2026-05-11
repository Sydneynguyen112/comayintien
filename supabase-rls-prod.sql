-- ============================================
-- PRODUCTION RLS HARDENING
-- Thay allow_all policies bằng explicit owner + admin checks.
-- Chạy SAU khi 5 admin dashboard SQL đã chạy + đã có super_admin role
-- (UPDATE profiles SET role = 'super_admin' WHERE email = ...).
--
-- IDEMPOTENT. Có thể chạy lại an toàn — DROP IF EXISTS trước CREATE.
-- ============================================

-- Helper: function check role admin/super_admin từ auth.uid()
-- Nếu app KHÔNG dùng auth.uid() (vd dùng localStorage user_id) → keep allow_all
-- và bảo mật ở app layer (middleware check role trước khi gọi RPC).
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
  );
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- ─────────────────────────────────────────────
-- events — admin read, user insert own
-- ─────────────────────────────────────────────
DROP POLICY IF EXISTS "events_user_insert_own" ON public.events;
DROP POLICY IF EXISTS "events_admin_read_all" ON public.events;

CREATE POLICY "events_insert_anyone" ON public.events
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "events_select_admin_or_own" ON public.events
  FOR SELECT TO authenticated
  USING (public.is_admin() OR user_id = auth.uid());

-- ─────────────────────────────────────────────
-- daily_user_metrics — admin only
-- ─────────────────────────────────────────────
DROP POLICY IF EXISTS "dum_admin_read" ON public.daily_user_metrics;
CREATE POLICY "dum_admin_only" ON public.daily_user_metrics
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ─────────────────────────────────────────────
-- user_habit_scores — admin only
-- ─────────────────────────────────────────────
DROP POLICY IF EXISTS "habit_scores_admin_all" ON public.user_habit_scores;
CREATE POLICY "habit_scores_admin_only" ON public.user_habit_scores
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ─────────────────────────────────────────────
-- user_tier_history — admin only
-- ─────────────────────────────────────────────
DROP POLICY IF EXISTS "tier_history_admin_all" ON public.user_tier_history;
CREATE POLICY "tier_history_admin_only" ON public.user_tier_history
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ─────────────────────────────────────────────
-- re_engagement_log — admin only (insert + select)
-- ─────────────────────────────────────────────
DROP POLICY IF EXISTS "re_engagement_admin_all" ON public.re_engagement_log;
CREATE POLICY "re_engagement_admin_only" ON public.re_engagement_log
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ─────────────────────────────────────────────
-- nps_responses — user insert own + read own, admin read all
-- ─────────────────────────────────────────────
DROP POLICY IF EXISTS "nps_all" ON public.nps_responses;

CREATE POLICY "nps_insert_own" ON public.nps_responses
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "nps_select_own_or_admin" ON public.nps_responses
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

-- ─────────────────────────────────────────────
-- user_feedback — user CRUD own, admin read+update all
-- ─────────────────────────────────────────────
DROP POLICY IF EXISTS "feedback_all" ON public.user_feedback;

CREATE POLICY "feedback_insert_own" ON public.user_feedback
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "feedback_select_own_or_admin" ON public.user_feedback
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "feedback_update_admin_only" ON public.user_feedback
  FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ─────────────────────────────────────────────
-- feedback_votes — user vote own + read all, admin read all
-- ─────────────────────────────────────────────
DROP POLICY IF EXISTS "feedback_votes_all" ON public.feedback_votes;

CREATE POLICY "feedback_votes_insert_own" ON public.feedback_votes
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "feedback_votes_delete_own" ON public.feedback_votes
  FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE POLICY "feedback_votes_select_all" ON public.feedback_votes
  FOR SELECT TO authenticated USING (true);

-- ─────────────────────────────────────────────
-- admin_audit_log — admin only
-- ─────────────────────────────────────────────
DROP POLICY IF EXISTS "allow_all_admin_audit_log" ON public.admin_audit_log;
CREATE POLICY "audit_admin_only" ON public.admin_audit_log
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ─────────────────────────────────────────────
-- apps_access — user read own, admin manage all
-- ─────────────────────────────────────────────
DROP POLICY IF EXISTS "allow_all_apps_access" ON public.apps_access;

CREATE POLICY "apps_access_select_own_or_admin" ON public.apps_access
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "apps_access_insert_register" ON public.apps_access
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "apps_access_update_admin" ON public.apps_access
  FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "apps_access_delete_admin" ON public.apps_access
  FOR DELETE TO authenticated
  USING (public.is_admin());

-- ─────────────────────────────────────────────
-- activity_events — user read own, admin read all
-- ─────────────────────────────────────────────
DROP POLICY IF EXISTS "allow_all_activity_events" ON public.activity_events;

CREATE POLICY "activity_insert_anyone" ON public.activity_events
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "activity_select_own_or_admin" ON public.activity_events
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

-- ============================================
-- IMPORTANT: comay_* tables giữ allow_all vì app dùng localStorage user_id pattern.
-- App layer (cloud-sync.ts) tự filter user_id, không dựa vào RLS.
-- Nếu sau này migrate hoàn toàn sang auth.uid() pattern → tighten ở phase sau.
-- ============================================

-- Verify:
-- SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public' ORDER BY tablename, policyname;
