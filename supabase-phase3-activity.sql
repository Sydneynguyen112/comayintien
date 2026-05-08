-- ============================================
-- PHASE 3 — Activity tracking (login + page views)
-- IDEMPOTENT — chạy nhiều lần OK.
-- ============================================

CREATE TABLE IF NOT EXISTS activity_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  path TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

DO $$
BEGIN
  ALTER TABLE activity_events DROP CONSTRAINT IF EXISTS activity_events_type_check;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'drop type check skip: %', SQLERRM;
END $$;

ALTER TABLE activity_events ADD CONSTRAINT activity_events_type_check
  CHECK (type IN ('login','page_view','machine_open','machine_action'));

CREATE INDEX IF NOT EXISTS activity_events_user_idx
  ON activity_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS activity_events_type_idx
  ON activity_events(type, created_at DESC);

ALTER TABLE activity_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_all_activity_events" ON activity_events;
CREATE POLICY "allow_all_activity_events" ON activity_events
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- ============================================
-- Verify
-- SELECT type, COUNT(*) FROM activity_events GROUP BY type;
-- SELECT user_id, COUNT(*) FROM activity_events
--   WHERE created_at > now() - interval '7 days' GROUP BY user_id ORDER BY 2 DESC LIMIT 10;
-- ============================================
