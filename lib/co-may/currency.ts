// Quy đổi & format tiền tệ cho cỗ máy.
//
// Quy ước: số liệu (capital, anchor, pnl, withdraw...) LUÔN lưu canonical theo USD.
// USC là TÀI KHOẢN CENT — chỉ khác cách hiển thị/nhập liệu, không đổi storage.
// Nhờ vậy reserve pool và KPI tổng (đều tính USD) không cần quy đổi ở mọi nơi.

import type { CurrencyUnit } from "./types";

export const USC_PER_USD = 100;

export const UNIT_LABEL: Record<CurrencyUnit, string> = {
  USD: "USD",
  USC: "USC",
};

export const UNIT_SYMBOL: Record<CurrencyUnit, string> = {
  USD: "$",
  USC: "¢",
};

/** Chuẩn hoá: undefined → "USD". */
export function resolveUnit(unit?: CurrencyUnit): CurrencyUnit {
  return unit === "USC" ? "USC" : "USD";
}

/** USD canonical → giá trị hiển thị theo đơn vị. */
export function toDisplay(usdAmount: number, unit?: CurrencyUnit): number {
  return resolveUnit(unit) === "USC" ? usdAmount * USC_PER_USD : usdAmount;
}

/** Giá trị người dùng nhập (theo đơn vị) → USD canonical để lưu. */
export function toUSD(displayAmount: number, unit?: CurrencyUnit): number {
  if (!Number.isFinite(displayAmount)) return 0;
  // Giữ 2 chữ số thập phân THEO ĐƠN VỊ HIỂN THỊ trước khi quy về USD canonical:
  //   USD: 2 dp = $0.01   |   cent: 2 dp = 0.01¢ = $0.0001
  // Nhờ vậy PNL 78.85¢ không bị làm tròn thành 79¢, và $45.67 không thành $46.
  const rounded = Math.round(displayAmount * 100) / 100;
  return resolveUnit(unit) === "USC" ? rounded / USC_PER_USD : rounded;
}

// Hiển thị tới 2 chữ số thập phân. minimumFractionDigits = 0 để số tròn vẫn gọn
// (vd "$1,000", "2,000 ¢") — chỉ hiện thập phân khi có phần lẻ (PNL, số dư lẻ).
const usdFmt = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const uscFmt = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

/** Format 1 số tiền USD canonical sang chuỗi hiển thị theo đơn vị của cỗ máy. */
export function formatMoney(usdAmount: number, unit?: CurrencyUnit): string {
  if (resolveUnit(unit) === "USC") {
    return `${uscFmt.format(usdAmount * USC_PER_USD)} ¢`;
  }
  return usdFmt.format(usdAmount);
}
