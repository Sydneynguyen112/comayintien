// Helpers hiển thị cho Giải đấu (dùng chung admin + client).

import { formatMoney } from "./currency";
import type { LeaderboardMetric, Tournament, TournamentStatus } from "./types";

export const TOURNAMENT_STATUS_LABEL: Record<TournamentStatus, string> = {
  draft: "Nháp",
  open: "Mở đăng ký",
  ongoing: "Đang diễn ra",
  closed: "Đã kết thúc",
};

export const TOURNAMENT_STATUS_TONE: Record<TournamentStatus, string> = {
  draft: "text-muted-foreground border-border bg-muted",
  open: "text-emerald-500 border-emerald-500/30 bg-emerald-500/10",
  ongoing: "text-amber-500 border-amber-500/30 bg-amber-500/10",
  closed: "text-muted-foreground border-border bg-muted/40",
};

export const METRIC_LABEL: Record<LeaderboardMetric, string> = {
  pnl_pct: "% tăng trưởng",
  win_rate: "Tỷ lệ thắng",
  volume: "Volume giao dịch",
};

/** Khoảng vốn yêu cầu, hiển thị theo đơn vị của giải. "" nếu không ràng buộc. */
export function formatCapitalRange(t: Tournament): string {
  const unit = t.required_currency ?? "USD";
  const hasMin = t.min_capital != null;
  const hasMax = t.max_capital != null;
  if (!hasMin && !hasMax) return "Không giới hạn";
  if (hasMin && hasMax) return `${formatMoney(t.min_capital!, unit)} – ${formatMoney(t.max_capital!, unit)}`;
  if (hasMin) return `≥ ${formatMoney(t.min_capital!, unit)}`;
  return `≤ ${formatMoney(t.max_capital!, unit)}`;
}

export function formatDateRange(t: Tournament): string {
  const fmt = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString("vi-VN") : null);
  const s = fmt(t.start_date);
  const e = fmt(t.end_date);
  if (s && e) return `${s} → ${e}`;
  if (s) return `Từ ${s}`;
  if (e) return `Đến ${e}`;
  return "Chưa đặt lịch";
}

export function currencyLabel(c?: string | null): string {
  if (c === "USC") return "Tài khoản cent (¢)";
  if (c === "USD") return "Tài khoản USD ($)";
  return "Mọi loại tài khoản";
}
