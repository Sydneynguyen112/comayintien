-- ============================================
-- PHASE 2 — Admin approval gate
-- apps_access.status: pending | approved | locked
-- IDEMPOTENT — chạy nhiều lần OK.
-- ============================================

-- 1. Thêm cột status
ALTER TABLE apps_access ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';

-- 2. Drop constraint cũ nếu có rồi tạo lại
DO $$
BEGIN
  ALTER TABLE apps_access DROP CONSTRAINT IF EXISTS apps_access_status_check;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'drop status check skip: %', SQLERRM;
END $$;

ALTER TABLE apps_access ADD CONSTRAINT apps_access_status_check
  CHECK (status IN ('pending','approved','locked'));

-- 3. Backfill: tất cả rows hiện có → 'approved' (không lock-out users cũ)
UPDATE apps_access SET status = 'approved' WHERE status IS NULL OR status = 'pending';

-- 4. Index để query nhanh khi admin filter theo trạng thái
CREATE INDEX IF NOT EXISTS apps_access_status_idx ON apps_access(app, status);

-- 5. Track thêm khi user được approve / lock
ALTER TABLE apps_access ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE apps_access ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE apps_access ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ;
ALTER TABLE apps_access ADD COLUMN IF NOT EXISTS locked_by UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- Backfill approved_at = granted_at cho rows đã approved
UPDATE apps_access SET approved_at = granted_at WHERE status = 'approved' AND approved_at IS NULL;

-- ============================================
-- Verify
-- ============================================
-- SELECT app, status, COUNT(*) FROM apps_access GROUP BY app, status ORDER BY app, status;
