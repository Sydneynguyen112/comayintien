-- ============================================
-- PHASE 1 — Supabase consolidation
-- Add: source, apps_access, super_admin role, admin_audit_log
-- IDEMPOTENT — chạy nhiều lần OK, không xoá data.
-- ============================================

-- 1. Mở rộng role: thêm 'super_admin'
DO $$
BEGIN
  ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
  ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
    CHECK (role IN ('admin','mentor','student','super_admin'));
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'profiles_role_check skip: %', SQLERRM;
END $$;

-- 2. Track user đến từ app nào
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'lms';

-- Drop constraint cũ nếu có rồi tạo lại để cover giá trị mới
DO $$
BEGIN
  ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_source_check;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'drop source check skip: %', SQLERRM;
END $$;

ALTER TABLE profiles ADD CONSTRAINT profiles_source_check
  CHECK (source IN ('lms','comay','admin','external'));

-- Backfill: user cũ chưa có source → coi như 'lms'
UPDATE profiles SET source = 'lms' WHERE source IS NULL;

-- 3. Bảng apps_access — track user có quyền truy cập app nào
CREATE TABLE IF NOT EXISTS apps_access (
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  app TEXT NOT NULL CHECK (app IN ('lms','comay','admin')),
  granted_at TIMESTAMPTZ DEFAULT now(),
  last_seen_at TIMESTAMPTZ,
  PRIMARY KEY (user_id, app)
);

CREATE INDEX IF NOT EXISTS apps_access_app_idx ON apps_access(app);

ALTER TABLE apps_access ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_all_apps_access" ON apps_access;
CREATE POLICY "allow_all_apps_access" ON apps_access
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 4. Backfill apps_access cho user hiện có — mọi profile đều có quyền 'lms'
INSERT INTO apps_access (user_id, app, granted_at)
SELECT id, 'lms', created_at FROM profiles
ON CONFLICT (user_id, app) DO NOTHING;

-- User có user_features.money_machine → cấp luôn 'comay'
INSERT INTO apps_access (user_id, app, granted_at)
SELECT user_id, 'comay', enabled_at FROM user_features
WHERE feature = 'money_machine'
ON CONFLICT (user_id, app) DO NOTHING;

-- 5. Audit log cho admin nội bộ (future-proof)
CREATE TABLE IF NOT EXISTS admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  target_user_id UUID,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS admin_audit_admin_idx ON admin_audit_log(admin_id, created_at DESC);
CREATE INDEX IF NOT EXISTS admin_audit_target_idx ON admin_audit_log(target_user_id, created_at DESC);

ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_all_admin_audit_log" ON admin_audit_log;
CREATE POLICY "allow_all_admin_audit_log" ON admin_audit_log
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- ============================================
-- Verify queries (chạy sau migration để check)
-- ============================================
-- SELECT role, COUNT(*) FROM profiles GROUP BY role;
-- SELECT source, COUNT(*) FROM profiles GROUP BY source;
-- SELECT app, COUNT(*) FROM apps_access GROUP BY app;
-- SELECT * FROM admin_audit_log LIMIT 5;
