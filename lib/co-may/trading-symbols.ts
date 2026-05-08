// Danh sách instruments giao dịch — HFM (HF Markets) Forex + top 5 crypto.
// Reference: https://www.hfm.com/sc/en/products/forex
//
// Group:
//   - Major: 7 cặp USD chính
//   - Minor: cross pairs (không có USD)
//   - Exotic: USD vs đồng tiền mới nổi
//   - Crypto: top 5 theo volume (BTC, ETH, BNB, XRP, SOL) vs USD
//   - Metals: kim loại quý (XAU/XAG)

export interface TradingSymbol {
  code: string;
  group: "Major" | "Minor" | "Exotic" | "Crypto" | "Metals";
}

export const TRADING_SYMBOLS: TradingSymbol[] = [
  // Major pairs
  { code: "EURUSD", group: "Major" },
  { code: "USDJPY", group: "Major" },
  { code: "GBPUSD", group: "Major" },
  { code: "USDCHF", group: "Major" },
  { code: "AUDUSD", group: "Major" },
  { code: "USDCAD", group: "Major" },
  { code: "NZDUSD", group: "Major" },

  // Minor / cross pairs
  { code: "EURGBP", group: "Minor" },
  { code: "EURJPY", group: "Minor" },
  { code: "EURCHF", group: "Minor" },
  { code: "EURAUD", group: "Minor" },
  { code: "EURCAD", group: "Minor" },
  { code: "EURNZD", group: "Minor" },
  { code: "GBPJPY", group: "Minor" },
  { code: "GBPCHF", group: "Minor" },
  { code: "GBPAUD", group: "Minor" },
  { code: "GBPCAD", group: "Minor" },
  { code: "GBPNZD", group: "Minor" },
  { code: "AUDJPY", group: "Minor" },
  { code: "AUDCHF", group: "Minor" },
  { code: "AUDCAD", group: "Minor" },
  { code: "AUDNZD", group: "Minor" },
  { code: "NZDJPY", group: "Minor" },
  { code: "NZDCHF", group: "Minor" },
  { code: "NZDCAD", group: "Minor" },
  { code: "CADJPY", group: "Minor" },
  { code: "CADCHF", group: "Minor" },
  { code: "CHFJPY", group: "Minor" },

  // Exotic pairs (HFM offers)
  { code: "USDSGD", group: "Exotic" },
  { code: "USDHKD", group: "Exotic" },
  { code: "USDMXN", group: "Exotic" },
  { code: "USDZAR", group: "Exotic" },
  { code: "USDTRY", group: "Exotic" },
  { code: "USDPLN", group: "Exotic" },
  { code: "USDNOK", group: "Exotic" },
  { code: "USDSEK", group: "Exotic" },
  { code: "USDDKK", group: "Exotic" },
  { code: "USDHUF", group: "Exotic" },
  { code: "USDCZK", group: "Exotic" },
  { code: "USDCNH", group: "Exotic" },
  { code: "USDTHB", group: "Exotic" },
  { code: "USDRUB", group: "Exotic" },
  { code: "EURTRY", group: "Exotic" },
  { code: "EURZAR", group: "Exotic" },
  { code: "EURPLN", group: "Exotic" },
  { code: "EURNOK", group: "Exotic" },
  { code: "EURSEK", group: "Exotic" },
  { code: "EURDKK", group: "Exotic" },
  { code: "EURHUF", group: "Exotic" },
  { code: "EURCZK", group: "Exotic" },
  { code: "GBPNOK", group: "Exotic" },
  { code: "GBPSEK", group: "Exotic" },
  { code: "GBPTRY", group: "Exotic" },
  { code: "ZARJPY", group: "Exotic" },

  // Metals
  { code: "XAUUSD", group: "Metals" },
  { code: "XAGUSD", group: "Metals" },
  { code: "XAUEUR", group: "Metals" },
  { code: "XAGEUR", group: "Metals" },

  // Top 5 crypto vs USD
  { code: "BTCUSD", group: "Crypto" },
  { code: "ETHUSD", group: "Crypto" },
  { code: "BNBUSD", group: "Crypto" },
  { code: "XRPUSD", group: "Crypto" },
  { code: "SOLUSD", group: "Crypto" },
];

export function filterSymbols(query: string, limit = 30): TradingSymbol[] {
  const q = query.trim().toUpperCase();
  if (!q) return TRADING_SYMBOLS.slice(0, limit);
  return TRADING_SYMBOLS.filter((s) => s.code.includes(q)).slice(0, limit);
}
