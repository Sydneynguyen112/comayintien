// Chấm "sức khỏe" 1 tài khoản MT5 của khách (cho màn Admin → Sức khỏe khách hàng).
// Thuần, không I/O — nhận dữ liệu đã fetch, trả về cờ vấn đề + mức độ + số liệu đã
// quy đổi USD. Tách riêng để dễ chỉnh ngưỡng và test.
//
// QUAN TRỌNG — đánh giá theo PnL THẬT, không theo equity-vs-vốn:
//   Khách có thể RÚT tiền (kể cả rút lãi) → equity tụt xuống nhưng KHÔNG phải cháy.
//   PnL = Equity hiện tại + Tiền đã RÚT − Tiền đã BỎ VÀO.
//   (Tiền bỏ vào = tổng nạp thật nếu có; nếu chưa sync nạp thì fallback vốn gốc cỗ máy.)
//
// Lưu ý tiền tệ: TK cent (currency='USC') có balance/equity/profit/nạp/rút theo CENT
// thô (xem [[mt5-cent-currency]]); chia 100 để về USD canonical.

import { USC_PER_USD } from "./currency";

export type HealthSeverity = "critical" | "warning" | "ok";

export interface HealthFlag {
  key: string;
  severity: "critical" | "warning";
  label: string; // chip ngắn hiển thị
}

export interface AccountHealthInput {
  // mt5_accounts
  status: string; // active | pending | error | disabled
  lastSyncedAt: string | null;
  // mt5_account_states (null nếu chưa từng sync)
  currency: string | null; // 'USC' | 'USD' ...
  balance: number | null;
  equity: number | null;
  marginLevel: number | null;
  profit: number | null; // floating P/L (đơn vị tài khoản)
  positionsCount: number | null;
  // mt5_transactions (tổng theo đơn vị tài khoản)
  depositsRaw: number; // tổng nạp
  withdrawalsRaw: number; // tổng rút
  // comay_machines
  capitalUsd: number | null; // vốn gốc (USD canonical) — fallback "tiền bỏ vào"
  machineCurrencyUnit: string | null; // fallback xác định cent nếu state thiếu currency
  // mt5_trades
  lastTradeAt: string | null; // max(time_close) của lệnh đã đóng
  // mốc thời gian hiện tại (ms) — truyền vào để dễ test
  nowMs: number;
}

export interface AccountHealth {
  severity: HealthSeverity;
  flags: HealthFlag[];
  // số liệu đã quy đổi USD để hiển thị
  equityUsd: number | null;
  balanceUsd: number | null;
  floatingUsd: number | null;
  depositsUsd: number;
  withdrawalsUsd: number;
  investedUsd: number | null; // tiền bỏ vào (nạp thật hoặc fallback vốn gốc)
  pnlUsd: number | null; // lãi/lỗ thật = equity + đã rút − tiền bỏ vào
  pnlPct: number | null; // pnl / tiền bỏ vào × 100 (âm = lỗ)
  marginLevel: number | null;
  lastTradeDays: number | null;
  syncStaleMin: number | null;
}

// Ngưỡng — export để chỉnh nhanh ở 1 chỗ.
export const HEALTH_THRESHOLDS = {
  blownPnlPct: -90, // PnL ≤ −90% tiền bỏ vào → cháy TK (mất gần hết)
  bigLossPnlPct: -40, // PnL ≤ −40% → lỗ nặng
  marginCallLevel: 150, // có lệnh mở & margin_level < 150% → sắp margin call
  floatingLossPct: 20, // floating P/L < −20% balance → gồng lỗ trôi nổi
  stoppedTradeDays: 7, // > 7 ngày không có lệnh đóng → ngừng trade
  staleSyncMin: 30, // > 30 phút TK này không sync → sync cũ riêng TK
};

const DAY_MS = 86_400_000;

function isCentAccount(currency: string | null, machineCurrencyUnit: string | null): boolean {
  const c = (currency ?? machineCurrencyUnit ?? "").toUpperCase();
  return c === "USC";
}

const SEV_RANK: Record<HealthSeverity, number> = { critical: 0, warning: 1, ok: 2 };

export function computeAccountHealth(inp: AccountHealthInput): AccountHealth {
  const cent = isCentAccount(inp.currency, inp.machineCurrencyUnit);
  const conv = cent ? 1 / USC_PER_USD : 1;

  const equityUsd = inp.equity != null ? inp.equity * conv : null;
  const balanceUsd = inp.balance != null ? inp.balance * conv : null;
  const floatingUsd = inp.profit != null ? inp.profit * conv : null;
  const depositsUsd = inp.depositsRaw * conv;
  const withdrawalsUsd = inp.withdrawalsRaw * conv;
  const capital = inp.capitalUsd && inp.capitalUsd > 0 ? inp.capitalUsd : null;

  // Tiền đã bỏ vào: ưu tiên tổng nạp THẬT; nếu chưa sync nạp (=0) thì fallback vốn gốc.
  const investedUsd = depositsUsd > 0 ? depositsUsd : capital;

  // PnL THẬT = equity hiện tại + đã rút − tiền bỏ vào. Cộng lại đã rút để equity
  // thấp do RÚT tiền không bị hiểu nhầm thành cháy/lỗ.
  const pnlUsd =
    equityUsd != null && investedUsd != null ? equityUsd + withdrawalsUsd - investedUsd : null;
  const pnlPct =
    pnlUsd != null && investedUsd != null && investedUsd > 0 ? (pnlUsd / investedUsd) * 100 : null;

  const lastTradeDays =
    inp.lastTradeAt != null
      ? Math.floor((inp.nowMs - new Date(inp.lastTradeAt).getTime()) / DAY_MS)
      : null;

  const syncStaleMin =
    inp.lastSyncedAt != null
      ? Math.floor((inp.nowMs - new Date(inp.lastSyncedAt).getTime()) / 60_000)
      : null;

  const T = HEALTH_THRESHOLDS;
  const flags: HealthFlag[] = [];

  // ── Sync lỗi (vd sai mật khẩu) ──
  if (inp.status === "error") {
    flags.push({ key: "sync_error", severity: "critical", label: "Sync lỗi" });
  }

  // ── Cháy TK / Lỗ nặng theo PnL THẬT (loại trừ nhau) ──
  if (pnlPct != null) {
    if (pnlPct <= T.blownPnlPct) {
      flags.push({ key: "blown", severity: "critical", label: "Cháy TK" });
    } else if (pnlPct <= T.bigLossPnlPct) {
      flags.push({ key: "big_loss", severity: "warning", label: "Lỗ nặng" });
    }
  }

  // ── Sắp margin call (chỉ khi có lệnh mở) ──
  if (
    inp.positionsCount != null &&
    inp.positionsCount > 0 &&
    inp.marginLevel != null &&
    inp.marginLevel > 0 &&
    inp.marginLevel < T.marginCallLevel
  ) {
    flags.push({ key: "margin_call", severity: "critical", label: "Sắp margin call" });
  }

  // ── Gồng lỗ trôi nổi lớn (lệnh đang mở lỗ nặng) ──
  if (
    balanceUsd != null &&
    balanceUsd > 0 &&
    floatingUsd != null &&
    floatingUsd < -balanceUsd * (T.floatingLossPct / 100)
  ) {
    flags.push({ key: "floating_loss", severity: "warning", label: "Gồng lỗ" });
  }

  // ── Ngừng trade ──
  if (lastTradeDays != null && lastTradeDays > T.stoppedTradeDays) {
    flags.push({ key: "stopped", severity: "warning", label: `Ngừng trade ${lastTradeDays} ngày` });
  }

  // ── Sync cũ riêng TK (daemon vẫn chạy nhưng TK này không cập nhật) ──
  if (inp.status !== "error" && syncStaleMin != null && syncStaleMin > T.staleSyncMin) {
    const txt = syncStaleMin >= 60 ? `${Math.floor(syncStaleMin / 60)} giờ` : `${syncStaleMin} phút`;
    flags.push({ key: "stale", severity: "warning", label: `Sync cũ ${txt}` });
  }

  const severity: HealthSeverity = flags.some((f) => f.severity === "critical")
    ? "critical"
    : flags.length > 0
      ? "warning"
      : "ok";

  return {
    severity,
    flags,
    equityUsd,
    balanceUsd,
    floatingUsd,
    depositsUsd,
    withdrawalsUsd,
    investedUsd,
    pnlUsd,
    pnlPct,
    marginLevel: inp.marginLevel,
    lastTradeDays,
    syncStaleMin,
  };
}

/** So sánh để xếp nặng-nhất-lên-đầu: severity → PnL% (lỗ sâu trước) → nhiều cờ. */
export function compareHealth(a: AccountHealth, b: AccountHealth): number {
  if (SEV_RANK[a.severity] !== SEV_RANK[b.severity]) {
    return SEV_RANK[a.severity] - SEV_RANK[b.severity];
  }
  const pa = a.pnlPct ?? 0;
  const pb = b.pnlPct ?? 0;
  if (pa !== pb) return pa - pb; // âm hơn (lỗ sâu hơn) lên trước
  return b.flags.length - a.flags.length;
}
