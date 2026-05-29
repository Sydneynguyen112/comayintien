-- ============================================================================
-- Giải đấu (Tournaments) — "Cỗ Máy In Tiền"
-- ============================================================================
-- Chạy 1 lần trong Supabase SQL Editor TRƯỚC khi deploy code tournament.
-- Idempotent: dùng IF NOT EXISTS.
--
-- 2 bảng:
--   1. tournaments              - Giải đấu do admin tạo (toàn cục)
--   2. tournament_registrations - Khách đăng ký 1 cỗ máy vào giải, admin duyệt
--
-- Pre-requisite: đã có public.profiles (UUID id) và public.comay_machines (TEXT id)
-- từ supabase-comay-setup.sql.
-- ============================================================================

-- ============================================================================
-- 1. tournaments
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.tournaments (
    id                  TEXT PRIMARY KEY,
    title               TEXT NOT NULL,
    description         TEXT,                                  -- mô tả / rules tự do
    status              TEXT NOT NULL DEFAULT 'draft'
                        CHECK (status IN ('draft', 'open', 'ongoing', 'closed')),
    leaderboard_metric  TEXT NOT NULL DEFAULT 'pnl_pct'
                        CHECK (leaderboard_metric IN ('pnl_pct', 'win_rate', 'volume')),
    -- Ràng buộc đăng ký (rules có kiểm). NULL = không ràng buộc.
    required_currency   TEXT CHECK (required_currency IN ('USD', 'USC')),
    min_capital         NUMERIC,                               -- canonical USD
    max_capital         NUMERIC,                               -- canonical USD
    start_date          TIMESTAMPTZ,
    end_date            TIMESTAMPTZ,
    created_by          UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tournaments_status
    ON public.tournaments (status, created_at DESC);

-- ============================================================================
-- 2. tournament_registrations
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.tournament_registrations (
    id                TEXT PRIMARY KEY,
    tournament_id     TEXT NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
    user_id           UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    machine_id        TEXT NOT NULL REFERENCES public.comay_machines(id) ON DELETE CASCADE,
    status            TEXT NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending', 'approved', 'rejected')),
    -- Snapshot lúc duyệt → mốc tính điểm leaderboard
    baseline_balance  NUMERIC,                                 -- canonical USD
    baseline_at       TIMESTAMPTZ,
    approved_by       UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    reject_reason     TEXT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (tournament_id, user_id)                            -- 1 máy/khách/giải
);

CREATE INDEX IF NOT EXISTS idx_treg_tournament_status
    ON public.tournament_registrations (tournament_id, status);
CREATE INDEX IF NOT EXISTS idx_treg_machine
    ON public.tournament_registrations (machine_id);
CREATE INDEX IF NOT EXISTS idx_treg_user
    ON public.tournament_registrations (user_id);

-- ============================================================================
-- Row Level Security — MVP permissive (giống các bảng comay hiện tại).
-- Thao tác ghi admin đi qua server action service-role; siết is_admin() sau nếu cần.
-- ============================================================================
ALTER TABLE public.tournaments              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_registrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_all_tournaments" ON public.tournaments;
DROP POLICY IF EXISTS "allow_all_tournament_registrations" ON public.tournament_registrations;

CREATE POLICY "allow_all_tournaments" ON public.tournaments
    FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_tournament_registrations" ON public.tournament_registrations
    FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- ============================================================================
-- Verify:
-- SELECT table_name FROM information_schema.tables
-- WHERE table_schema='public' AND table_name LIKE 'tournament%' ORDER BY table_name;
-- ============================================================================
