-- ============================================
-- ROVA LMS — Cỗ Máy In Tiền schema (MVP)
-- Chạy SAU `supabase-setup.sql` (cần bảng `profiles` đã có)
-- ============================================
-- Drop nếu chạy lại
DROP TABLE IF EXISTS comay_dismiss_state CASCADE;
DROP TABLE IF EXISTS comay_reports CASCADE;
DROP TABLE IF EXISTS comay_transactions CASCADE;
DROP TABLE IF EXISTS comay_machines CASCADE;
DROP TABLE IF EXISTS comay_setup CASCADE;
DROP TABLE IF EXISTS user_features CASCADE;

-- ============================================
-- TABLES
-- ============================================

-- Setup config (1 row / user)
CREATE TABLE comay_setup (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  total_capital NUMERIC NOT NULL DEFAULT 0,
  strategy TEXT NOT NULL DEFAULT 'concentrated',
  injected_from_withdrawn NUMERIC NOT NULL DEFAULT 0,
  completed_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Machines
CREATE TABLE comay_machines (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  capital NUMERIC NOT NULL,
  current_anchor NUMERIC NOT NULL,
  cycle_started_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','closed')),
  method TEXT,
  signal_source TEXT,
  risk_per_trade_pct NUMERIC,
  max_drawdown_pct NUMERIC,
  target_withdraw_count INT,
  target_profit NUMERIC,
  anchor_milestones NUMERIC[],
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX comay_machines_user_status_idx ON comay_machines(user_id, status);

-- Transactions (trade win/loss, withdraw, anchor_change)
CREATE TABLE comay_transactions (
  id TEXT PRIMARY KEY,
  machine_id TEXT NOT NULL REFERENCES comay_machines(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('trade_win','trade_loss','withdraw','anchor_change')),
  amount NUMERIC NOT NULL,
  note TEXT,
  direction TEXT,
  symbol TEXT,
  volume NUMERIC,
  entry_reason TEXT,
  exit_reason TEXT,
  emotion TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX comay_transactions_machine_idx ON comay_transactions(machine_id, created_at DESC);
CREATE INDEX comay_transactions_user_idx ON comay_transactions(user_id, created_at DESC);

-- Cycle reports
CREATE TABLE comay_reports (
  id TEXT PRIMARY KEY,
  machine_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  machine_name TEXT,
  machine_method TEXT,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  decision TEXT NOT NULL CHECK (decision IN ('reset','scale','close')),
  pnl NUMERIC NOT NULL,
  withdrawn NUMERIC NOT NULL,
  starting_capital NUMERIC,
  ending_balance NUMERIC,
  peak_pnl NUMERIC,
  max_drawdown NUMERIC,
  trade_count INT,
  win_count INT,
  next_machine_id TEXT,
  scorecard JSONB,
  reflection JSONB,
  meta JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX comay_reports_user_idx ON comay_reports(user_id, created_at DESC);

-- Dismiss state per machine (anchor strip / banner)
CREATE TABLE comay_dismiss_state (
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  machine_id TEXT NOT NULL,
  trade_count INT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, machine_id)
);

-- Feature entitlements (Cỗ Máy access etc.)
CREATE TABLE user_features (
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  feature TEXT NOT NULL,
  enabled_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, feature)
);

-- ============================================
-- RLS — permissive, theo pattern của supabase-setup.sql
-- (MVP demo: signIn() lưu user_id trên localStorage, app tự filter theo user_id)
-- Khi cần khoá chặt, đổi qua auth.uid()-based policy.
-- ============================================
ALTER TABLE comay_setup ENABLE ROW LEVEL SECURITY;
ALTER TABLE comay_machines ENABLE ROW LEVEL SECURITY;
ALTER TABLE comay_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE comay_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE comay_dismiss_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_features ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_all_comay_setup" ON comay_setup FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_comay_machines" ON comay_machines FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_comay_transactions" ON comay_transactions FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_comay_reports" ON comay_reports FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_comay_dismiss_state" ON comay_dismiss_state FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_user_features" ON user_features FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
