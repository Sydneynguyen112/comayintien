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
