// Chấm "sức khỏe" 1 tài khoản MT5 của khách (cho màn Admin → Sức khỏe khách hàng).
// Thuần, không I/O — nhận dữ liệu đã fetch, trả về cờ vấn đề + mức độ + số liệu đã
// quy đổi USD. Tách riêng để dễ chỉnh ngưỡng và test.
//
// Lưu ý tiền tệ: TK cent (currency='USC') có balance/equity/profit theo CENT thô
// (xem [[mt5-cent-currency]]); chia 100 để về USD canonical cho khớp capital.

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
  // comay_machines
  capitalUsd: number | null; // vốn gốc (USD canonical)
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
  drawdownPct: number | null; // (equity − vốn)/vốn × 100 (âm = đang lỗ)
  marginLevel: number | null;
  lastTradeDays: number | null;
  syncStaleMin: number | null;
}

// Ngưỡng — export để chỉnh nhanh ở 1 chỗ.
export const HEALTH_THRESHOLDS = {
  blownPct: 10, // equity ≤ 10% vốn → cháy TK
  drawdownPct: 60, // equity ≤ 60% vốn → drawdown lớn
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
  const capital = inp.capitalUsd && inp.capitalUsd > 0 ? inp.capitalUsd : null;

  const drawdownPct =
    capital != null && equityUsd != null ? ((equityUsd - capital) / capital) * 100 : null;

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

  // ── Cháy TK / Drawdown lớn (loại trừ nhau: cháy thì không gắn thêm drawdown) ──
  if (capital != null && equityUsd != null) {
    if (equityUsd <= capital * (T.blownPct / 100)) {
      flags.push({ key: "blown", severity: "critical", label: "Cháy TK" });
    } else if (equityUsd <= capital * (T.drawdownPct / 100)) {
      flags.push({ key: "drawdown", severity: "warning", label: "Drawdown lớn" });
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

  // ── Gồng lỗ trôi nổi lớn ──
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
    drawdownPct,
    marginLevel: inp.marginLevel,
    lastTradeDays,
    syncStaleMin,
  };
}

/** So sánh để xếp nặng-nhất-lên-đầu: severity → drawdown (lỗ sâu trước) → nhiều cờ. */
export function compareHealth(a: AccountHealth, b: AccountHealth): number {
  if (SEV_RANK[a.severity] !== SEV_RANK[b.severity]) {
    return SEV_RANK[a.severity] - SEV_RANK[b.severity];
  }
  const da = a.drawdownPct ?? 0;
  const db = b.drawdownPct ?? 0;
  if (da !== db) return da - db; // âm hơn (lỗ sâu hơn) lên trước
  return b.flags.length - a.flags.length;
}
