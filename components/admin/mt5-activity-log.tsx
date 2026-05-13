"use client";

// Admin view: hoạt động MT5 theo ngày — trades + deposits/withdrawals từ MT5 thật,
// so sánh với comay_transactions (manual log của khách) để detect gap.

import { useEffect, useState } from "react";
import { ChevronDown, ChevronRight, RefreshCcw, TrendingDown, TrendingUp } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

interface Mt5TradeRow {
  ticket: number;
  symbol: string | null;
  type: string | null;
  volume: number | null;
  price_open: number | null;
  price_close: number | null;
  profit: number | null;
  swap: number | null;
  commission: number | null;
  time_open: string | null;
  time_close: string | null;
  is_closed: boolean;
}

interface Mt5TransactionRow {
  ticket: number | null;
  type: string;
  amount: number;
  comment: string | null;
  time: string;
  is_rule_violation: boolean;
}

interface ManualTxRow {
  id: string;
  type: string;
  amount: number;
  note: string | null;
  created_at: string;
}

interface DailyBucket {
  date: string;                          // YYYY-MM-DD
  trades: Mt5TradeRow[];
  txs: Mt5TransactionRow[];
  manualTxs: ManualTxRow[];
  mt5Pnl: number;
  manualPnl: number;
  hasDeposit: boolean;
}

interface Props {
  mt5AccountId: string;
  machineId?: string;                    // optional: nếu absent thì không fetch manual log
  daysBack?: number;                     // default 30
}

const DAY_MS = 24 * 60 * 60 * 1000;

function dayKey(iso: string): string {
  return iso.slice(0, 10);              // YYYY-MM-DD theo timezone của ISO string
}

function formatUsd(n: number): string {
  const sign = n >= 0 ? "+" : "";
  return `${sign}$${Math.abs(n).toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
}

function formatTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
}

export function Mt5ActivityLog({ mt5AccountId, machineId, daysBack = 30 }: Props) {
  const [loading, setLoading] = useState(true);
  const [buckets, setBuckets] = useState<DailyBucket[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      const since = new Date(Date.now() - daysBack * DAY_MS).toISOString();

      // 2 query MT5 song song (cùng shape, Promise.all OK)
      const [tradesRes, txsRes] = await Promise.all([
        supabase
          .from("mt5_trades")
          .select("ticket, symbol, type, volume, price_open, price_close, profit, swap, commission, time_open, time_close, is_closed")
          .eq("mt5_account_id", mt5AccountId)
          .or(`time_close.gte.${since},time_open.gte.${since}`)
          .order("time_close", { ascending: false, nullsFirst: false }),
        supabase
          .from("mt5_transactions")
          .select("ticket, type, amount, comment, time, is_rule_violation")
          .eq("mt5_account_id", mt5AccountId)
          .gte("time", since)
          .order("time", { ascending: false }),
      ]);

      // Manual log (Co Máy) chỉ fetch khi caller pass machineId (vd customer detail page),
      // standalone admin/mt5 page không cần
      let manuals: ManualTxRow[] = [];
      if (machineId) {
        const manualRes = await supabase
          .from("comay_transactions")
          .select("id, type, amount, note, created_at")
          .eq("machine_id", machineId)
          .gte("created_at", since)
          .order("created_at", { ascending: false });
        manuals = (manualRes.data ?? []) as ManualTxRow[];
      }

      if (!mounted) return;

      const trades = (tradesRes.data ?? []) as Mt5TradeRow[];
      const txs = (txsRes.data ?? []) as Mt5TransactionRow[];

      // Bucket theo ngày
      const map = new Map<string, DailyBucket>();
      const getBucket = (date: string): DailyBucket => {
        let b = map.get(date);
        if (!b) {
          b = { date, trades: [], txs: [], manualTxs: [], mt5Pnl: 0, manualPnl: 0, hasDeposit: false };
          map.set(date, b);
        }
        return b;
      };

      for (const t of trades) {
        const ref = t.time_close ?? t.time_open;
        if (!ref) continue;
        const b = getBucket(dayKey(ref));
        b.trades.push(t);
        if (t.is_closed) b.mt5Pnl += (t.profit ?? 0) + (t.swap ?? 0) + (t.commission ?? 0);
      }
      for (const x of txs) {
        const b = getBucket(dayKey(x.time));
        b.txs.push(x);
        if (x.type === "deposit") b.hasDeposit = true;
      }
      for (const m of manuals) {
        const b = getBucket(dayKey(m.created_at));
        b.manualTxs.push(m);
        // Co Máy: amount > 0 = win, amount < 0 = loss (theo convention comay_transactions)
        if (m.type === "trade_win") b.manualPnl += m.amount;
        else if (m.type === "trade_loss") b.manualPnl -= Math.abs(m.amount);
      }

      const sorted = Array.from(map.values()).sort((a, b) => b.date.localeCompare(a.date));
      setBuckets(sorted);
      setLoading(false);
    }
    load();
    return () => {
      mounted = false;
    };
  }, [mt5AccountId, machineId, daysBack, reloadKey]);

  function toggle(date: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(date)) next.delete(date);
      else next.add(date);
      return next;
    });
  }

  if (loading) {
    return (
      <div className="text-xs text-muted-foreground py-3 text-center">Đang tải log MT5...</div>
    );
  }

  if (buckets.length === 0) {
    return (
      <div className="text-xs text-muted-foreground py-3 text-center italic">
        Chưa có hoạt động MT5 nào trong {daysBack} ngày. Đợi sync chạy lần đầu (mỗi 5 phút).
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="text-[10px] text-muted-foreground uppercase tracking-wide">
          {buckets.length} ngày có hoạt động · {daysBack} ngày qua
        </div>
        <button
          type="button"
          onClick={() => setReloadKey((k) => k + 1)}
          className="text-[10px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
        >
          <RefreshCcw className="h-3 w-3" /> Reload
        </button>
      </div>

      <div className="space-y-1">
        {buckets.map((b) => {
          const isOpen = expanded.has(b.date);
          const mt5TradeCount = b.trades.filter((t) => t.is_closed).length;
          const manualTradeCount = b.manualTxs.filter((m) => m.type === "trade_win" || m.type === "trade_loss").length;
          const gap = mt5TradeCount - manualTradeCount;
          const pnlGap = b.mt5Pnl - b.manualPnl;

          return (
            <div key={b.date} className="rounded-lg border border-border bg-card overflow-hidden">
              <button
                type="button"
                onClick={() => toggle(b.date)}
                className="w-full px-3 py-2 flex items-center gap-2 hover:bg-muted/30 transition-colors text-left"
              >
                {isOpen ? <ChevronDown className="h-3.5 w-3.5 shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 shrink-0" />}
                <div className="text-xs font-semibold tabular-nums w-20 shrink-0">{b.date}</div>
                <div className="flex-1 grid grid-cols-4 gap-2 text-[11px]">
                  <Stat
                    label="MT5 trades"
                    value={`${mt5TradeCount}`}
                    sub={mt5TradeCount > 0 ? formatUsd(b.mt5Pnl) : undefined}
                    tone={b.mt5Pnl >= 0 ? "text-emerald-500" : "text-red-500"}
                  />
                  <Stat
                    label="Khách log"
                    value={`${manualTradeCount}`}
                    sub={manualTradeCount > 0 ? formatUsd(b.manualPnl) : undefined}
                    tone={b.manualPnl >= 0 ? "text-emerald-500" : "text-red-500"}
                  />
                  <Stat
                    label="Gap (trades)"
                    value={gap === 0 ? "✓ 0" : gap > 0 ? `+${gap}` : `${gap}`}
                    tone={gap === 0 ? "text-emerald-500" : Math.abs(gap) > 2 ? "text-red-500" : "text-amber-500"}
                  />
                  <Stat
                    label="Nạp/Rút"
                    value={`${b.txs.length}`}
                    sub={b.hasDeposit ? "⚠ deposit" : undefined}
                    tone={b.hasDeposit ? "text-red-500" : "text-muted-foreground"}
                  />
                </div>
              </button>

              {isOpen && (
                <div className="border-t border-border bg-muted/20 px-3 py-2 space-y-3">
                  {b.trades.length > 0 && <TradesList trades={b.trades} />}
                  {b.txs.length > 0 && <TxList txs={b.txs} />}
                  {b.manualTxs.length > 0 && <ManualList items={b.manualTxs} />}
                  {gap !== 0 && (
                    <div className="text-[11px] text-amber-600 dark:text-amber-400 italic">
                      Khách log thiếu/lệch {Math.abs(gap)} lệnh
                      {Math.abs(pnlGap) > 1 && ` · PnL lệch ${formatUsd(pnlGap)}`}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Stat({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone: string }) {
  return (
    <div className="min-w-0">
      <div className="text-[9px] text-muted-foreground uppercase tracking-wide truncate">{label}</div>
      <div className={cn("font-semibold tabular-nums", tone)}>{value}</div>
      {sub && <div className="text-[9px] text-muted-foreground tabular-nums truncate">{sub}</div>}
    </div>
  );
}

function TradesList({ trades }: { trades: Mt5TradeRow[] }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Trades MT5</div>
      <div className="space-y-0.5">
        {trades.map((t) => {
          const isBuy = t.type === "buy";
          const pnl = (t.profit ?? 0) + (t.swap ?? 0) + (t.commission ?? 0);
          const Icon = isBuy ? TrendingUp : TrendingDown;
          return (
            <div key={t.ticket} className="flex items-center gap-2 text-[11px] tabular-nums">
              <Icon className={cn("h-3 w-3 shrink-0", isBuy ? "text-emerald-500" : "text-red-500")} />
              <div className="w-12 text-muted-foreground">#{t.ticket}</div>
              <div className="w-16 font-medium">{t.symbol ?? "—"}</div>
              <div className="w-12">{t.volume?.toFixed(2)} lot</div>
              <div className="w-20 text-muted-foreground text-[10px]">
                {t.is_closed ? `${formatTime(t.time_open)} → ${formatTime(t.time_close)}` : `${formatTime(t.time_open)} open`}
              </div>
              <div className="flex-1 text-right">
                {t.is_closed ? (
                  <span className={cn("font-semibold", pnl >= 0 ? "text-emerald-500" : "text-red-500")}>
                    {formatUsd(pnl)}
                  </span>
                ) : (
                  <span className="text-muted-foreground italic">Đang mở</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TxList({ txs }: { txs: Mt5TransactionRow[] }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Nạp / Rút</div>
      <div className="space-y-0.5">
        {txs.map((x, i) => {
          const isDeposit = x.type === "deposit";
          return (
            <div key={`${x.ticket}-${i}`} className="flex items-center gap-2 text-[11px] tabular-nums">
              <div className={cn("font-medium w-20", isDeposit ? "text-red-500" : "text-emerald-500")}>
                {isDeposit ? "↓ Nạp" : "↑ Rút"}
              </div>
              <div className="w-20 text-muted-foreground text-[10px]">{formatTime(x.time)}</div>
              <div className="flex-1 truncate text-muted-foreground italic">{x.comment ?? ""}</div>
              <div className={cn("font-semibold", isDeposit ? "text-red-500" : "text-emerald-500")}>
                {isDeposit ? "+" : "-"}${x.amount.toLocaleString("en-US")}
                {x.is_rule_violation && <span className="ml-1 text-red-500">⚠</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ManualList({ items }: { items: ManualTxRow[] }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Khách tự log (Co Máy)</div>
      <div className="space-y-0.5">
        {items.map((m) => {
          const isWin = m.type === "trade_win";
          const isLoss = m.type === "trade_loss";
          const tone = isWin ? "text-emerald-500" : isLoss ? "text-red-500" : "text-muted-foreground";
          return (
            <div key={m.id} className="flex items-center gap-2 text-[11px] tabular-nums">
              <div className={cn("font-medium w-20", tone)}>
                {isWin ? "✓ Win" : isLoss ? "✗ Loss" : m.type}
              </div>
              <div className="w-20 text-muted-foreground text-[10px]">{formatTime(m.created_at)}</div>
              <div className="flex-1 truncate text-muted-foreground italic">{m.note ?? ""}</div>
              <div className={cn("font-semibold", tone)}>
                {isWin ? "+" : "-"}${Math.abs(m.amount).toLocaleString("en-US")}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
