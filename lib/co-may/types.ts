// Cỗ Máy In Tiền — domain types
// MVP scope: mock-data only. Sẽ map 1:1 với Supabase money_machine schema khi wire backend.

export type MachineStatus = "active" | "paused" | "closed";

export type TransactionType =
  | "trade_win"
  | "trade_loss"
  | "withdraw"
  | "anchor_change";

export type CycleDecision = "reset" | "scale" | "close";

export type SignalSource = "self" | "imported" | "both";

// Đơn vị hiển thị của 1 cỗ máy. Số liệu LUÔN lưu canonical theo USD;
// USC chỉ là đơn vị hiển thị (tài khoản cent: 1 USD = 100 USC).
export type CurrencyUnit = "USD" | "USC";

export interface Machine {
  id: string;
  user_id: string;
  name: string;
  capital: number;
  current_anchor: number;
  cycle_started_at: string | null;
  status: MachineStatus;
  created_at: string;
  updated_at: string;
  // ── Cấu hình mở rộng (optional cho machines tạo từ wizard quick-allocate) ──
  // Đơn vị hiển thị; mặc định/undefined = "USD". Không đổi cách lưu trữ.
  currency_unit?: CurrencyUnit;
  method?: string;
  signal_source?: SignalSource;
  risk_per_trade_pct?: number;
  max_drawdown_pct?: number;
  target_withdraw_count?: number;
  target_profit?: number;
  anchor_milestones?: number[];
}

export type TradeDirection = "long" | "short";

export interface MachineTransaction {
  id: string;
  machine_id: string;
  user_id: string;
  type: TransactionType;
  amount: number;
  note: string | null;
  created_at: string;
  // ── Trade-specific (optional) — chỉ điền khi type = trade_win | trade_loss ──
  direction?: TradeDirection;
  symbol?: string;
  volume?: number;
  entry_reason?: string;
  exit_reason?: string;
  emotion?: string;
}

export interface CycleScorecard {
  ky_luat: number; // 0..10
  thuc_thi: number;
  rui_ro: number;
  hoc_hoi: number;
}

export interface CycleReflection {
  van_hanh_dung_thiet_ke?: string;
  bai_hoc_lon_nhat?: string;
  dieu_chinh_chu_ky_tiep?: string;
}

export interface CycleReport {
  id: string;
  machine_id: string;
  user_id: string;
  machine_name?: string;
  machine_method?: string;
  currency_unit?: CurrencyUnit;
  start_date: string;
  end_date: string;
  decision: CycleDecision;
  pnl: number;
  withdrawn: number;
  starting_capital?: number;
  ending_balance?: number;
  peak_pnl?: number;
  max_drawdown?: number;
  trade_count?: number;
  win_count?: number;
  next_machine_id?: string;
  scorecard?: CycleScorecard;
  reflection?: CycleReflection;
  meta: { cycle_started_at: string } | null;
  created_at: string;
}

export interface KpiSnapshot {
  total_capital: number;
  pnl: number;
  win_rate: number; // 0..1
  drawdown: number; // negative number, lowest equity dip
  days_active: number;
  trade_count: number;
}

// ── Giải đấu (Tournaments) ──
export type TournamentStatus = "draft" | "open" | "ongoing" | "closed";
export type LeaderboardMetric = "pnl_pct" | "win_rate" | "volume";
export type RegistrationStatus = "pending" | "approved" | "rejected";

export interface Tournament {
  id: string;
  title: string;
  description?: string | null; // mô tả / rules tự do
  status: TournamentStatus;
  leaderboard_metric: LeaderboardMetric;
  // Ràng buộc đăng ký (NULL/undefined = không ràng buộc). Vốn canonical USD.
  required_currency?: CurrencyUnit | null;
  min_capital?: number | null;
  max_capital?: number | null;
  start_date?: string | null;
  end_date?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface TournamentRegistration {
  id: string;
  tournament_id: string;
  user_id: string;
  machine_id: string;
  status: RegistrationStatus;
  baseline_balance?: number | null; // snapshot lúc duyệt (USD canonical)
  baseline_at?: string | null;
  approved_by?: string | null;
  reject_reason?: string | null;
  created_at: string;
  updated_at: string;
}

// 1 dòng leaderboard (tính động, không lưu DB)
export interface LeaderboardEntry {
  rank: number;
  registration_id: string;
  machine_id: string;
  machine_name: string;
  user_id: string;
  display_name: string;
  currency_unit: CurrencyUnit;
  pnl_pct: number;     // % tăng trưởng từ baseline
  win_rate: number;    // 0..1, trade sau baseline
  volume: number;      // tổng volume sau baseline
  trade_count: number;
  score: number;       // giá trị theo metric của giải (để sort + hiển thị)
  mt5_linked: boolean; // máy đã kết nối MT5 chưa (nguồn xếp hạng là MT5 thật)
}
