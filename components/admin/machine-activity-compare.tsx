"use client";

// Admin view: 2 danh sách side-by-side cho 1 cỗ máy:
//   - Trái: Khách tự log (comay_transactions) — trade win/loss, withdraw, anchor change
//   - Phải: MT5 thực tế (mt5_trades + mt5_transactions)
// Top: stats summary + gap analysis
// Mục đích: admin so sánh nhanh khách khai báo vs sự thật MT5.

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Anchor,
  ArrowDownToLine,
  ArrowUpFromLine,
  Check,
  RefreshCcw,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

interface ManualTx {
  id: string;
  type: string;          // trade_win | trade_loss | withdraw | anchor_change
  amount: number;
  note: string | null;
  created_at: string;
}

interface Mt5Trade {
  ticket: number;
  symbol: string | null;
  type: string | null;   // buy | sell
  volume: number | null;
  profit: number | null;
  swap: number | null;
  commission: number | null;
  time_open: string | null;
  time_close: string | null;
  is_closed: boolean;
}

interface Mt5Tx {
  ticket: number | null;
  type: string;          // deposit | withdrawal
  amount: number;
  comment: string | null;
  time: string;
}

interface Props {
  machineId: string;
  mt5AccountId: string | null;
  daysBack?: number;
}

const RANGE_OPTIONS = [
  { value: 7, label: "7 ngày" },
  { value: 30, label: "30 ngày" },
  { value: 90, label: "90 ngày" },
  { value: 365, label: "1 năm" },
  { value: 3650, label: "Tất cả" },
];

const DAY_MS = 24 * 60 * 60 * 1000;

function fmtUsd(n: number, signed = true): string {
  const sign = signed && n > 0 ? "+" : signed && n < 0 ? "-" : "";
  return `${sign}$${Math.abs(n).toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const day = `${d.getMonth() + 1}/${d.getDate()}`;
  const time = `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
  return `${day} · ${time}`;
}

export function MachineActivityCompare({ machineId, mt5AccountId, daysBack: initialDays = 30 }: Props) {
  const [daysBack, setDaysBack] = useState(initialDays);
  const [loading, setLoading] = useState(true);
  const [manualTx, setManualTx] = useState<ManualTx[]>([]);
  const [mt5Trades, setMt5Trades] = useState<Mt5Trade[]>([]);
  const [mt5Tx, setMt5Tx] = useState<Mt5Tx[]>([]);
  const [reloadKey, setReloadKey] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    const since = new Date(Date.now() - daysBack * DAY_MS).toISOString();

    const manualRes = await supabase
      .from("comay_transactions")
      .select("id, type, amount, note, created_at")
      .eq("machine_id", machineId)
      .gte("created_at", since)
      .order("created_at", { ascending: false });

    let trades: Mt5Trade[] = [];
    let txs: Mt5Tx[] = [];
    if (mt5AccountId) {
      const [tRes, xRes] = await Promise.all([
        supabase
          .from("mt5_trades")
          .select("ticket, symbol, type, volume, profit, swap, commission, time_open, time_close, is_closed")
          .eq("mt5_account_id", mt5AccountId)
          .or(`time_close.gte.${since},time_open.gte.${since}`)
          .order("time_close", { ascending: false, nullsFirst: false }),
        supabase
          .from("mt5_transactions")
          .select("ticket, type, amount, comment, time")
          .eq("mt5_account_id", mt5AccountId)
          .gte("time", since)
          .order("time", { ascending: false }),
      ]);
      trades = (tRes.data ?? []) as Mt5Trade[];
      txs = (xRes.data ?? []) as Mt5Tx[];
    }

    setManualTx((manualRes.data ?? []) as ManualTx[]);
    setMt5Trades(trades);
    setMt5Tx(txs);
    setLoading(false);
  }, [machineId, mt5AccountId, daysBack]);

  useEffect(() => {
    load();
  }, [load, reloadKey]);

  const stats = useMemo(() => {
    const manualTrades = manualTx.filter((t) => t.type === "trade_win" || t.type === "trade_loss");
    const manualWithdraws = manualTx.filter((t) => t.type === "withdraw");
    const manualPnL = manualTrades.reduce(
      (s, t) => s + (t.type === "trade_win" ? t.amount : -Math.abs(t.amount)),
      0,
    );
    const manualWithdrawAmount = manualWithdraws.reduce((s, t) => s + Math.abs(t.amount), 0);

    const mt5ClosedTrades = mt5Trades.filter((t) => t.is_closed);
    const mt5OpenTrades = mt5Trades.filter((t) => !t.is_closed);
    const mt5PnL = mt5ClosedTrades.reduce(
      (s, t) => s + (t.profit ?? 0) + (t.swap ?? 0) + (t.commission ?? 0),
      0,
    );
    const mt5Deposits = mt5Tx.filter((t) => t.type === "deposit");
    const mt5Withdraws = mt5Tx.filter((t) => t.type === "withdrawal");
    const mt5DepositAmount = mt5Deposits.reduce((s, t) => s + t.amount, 0);
    const mt5WithdrawAmount = mt5Withdraws.reduce((s, t) => s + t.amount, 0);

    return {
      manualTrades,
      manualWithdraws,
      manualPnL,
      manualWithdrawAmount,
      mt5ClosedTrades,
      mt5OpenTrades,
      mt5PnL,
      mt5Deposits,
      mt5Withdraws,
      mt5DepositAmount,
      mt5WithdrawAmount,
      tradeGap: manualTrades.length - mt5ClosedTrades.length,
      pnlGap: manualPnL - mt5PnL,
      withdrawGap: manualWithdrawAmount - mt5WithdrawAmount,
    };
  }, [manualTx, mt5Trades, mt5Tx]);

  if (loading) {
    return <div className="h-48 rounded-xl bg-muted/40 animate-pulse" />;
  }

  return (
    <div className="space-y-4">
      {/* Header — range selector + reload */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <label className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">
            Khoảng thời gian:
          </label>
          <select
            value={daysBack}
            onChange={(e) => setDaysBack(Number(e.target.value))}
            className="h-8 rounded-md border border-input bg-background px-2.5 text-xs font-medium focus-visible:ring-1 focus-visible:ring-ring outline-none"
          >
            {RANGE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={() => setReloadKey((k) => k + 1)}
          className="ml-auto text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
        >
          <RefreshCcw className="h-3 w-3" /> Reload
        </button>
      </div>

      {/* Stats — 2 boxes side by side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <StatBox
          title="KHÁCH TỰ NHẬP"
          subtitle="Cỗ Máy Trading"
          accent="border-blue-500/30 bg-blue-500/5"
          titleTone="text-blue-700 dark:text-blue-300"
          stats={[
            { label: "Lệnh trade", value: `${stats.manualTrades.length}`, tone: "text-foreground" },
            {
              label: "Tổng PnL",
              value: fmtUsd(stats.manualPnL),
              tone: stats.manualPnL >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400",
            },
            { label: "Số lần rút", value: `${stats.manualWithdraws.length}`, tone: "text-foreground" },
            {
              label: "Tổng đã rút",
              value: `$${stats.manualWithdrawAmount.toLocaleString("en-US", { maximumFractionDigits: 2 })}`,
              tone: "text-emerald-600 dark:text-emerald-400",
            },
          ]}
        />
        <StatBox
          title="MT5 THỰC TẾ"
          subtitle="Investor password đọc trực tiếp từ broker"
          accent="border-amber-500/30 bg-amber-500/5"
          titleTone="text-amber-700 dark:text-amber-300"
          stats={[
            {
              label: "Lệnh đóng / Đang mở",
              value: `${stats.mt5ClosedTrades.length} / ${stats.mt5OpenTrades.length}`,
              tone: "text-foreground",
            },
            {
              label: "Tổng PnL (đã đóng)",
              value: fmtUsd(stats.mt5PnL),
              tone: stats.mt5PnL >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400",
            },
            { label: "Số lần rút", value: `${stats.mt5Withdraws.length}`, tone: "text-foreground" },
            {
              label: stats.mt5Deposits.length > 0 ? "⚠ Đã nạp (vi phạm)" : "Số lần nạp",
              value:
                stats.mt5Deposits.length > 0
                  ? `${stats.mt5Deposits.length} · $${stats.mt5DepositAmount.toLocaleString()}`
                  : "0",
              tone:
                stats.mt5Deposits.length > 0
                  ? "text-red-600 dark:text-red-400 font-bold"
                  : "text-muted-foreground",
            },
          ]}
        />
      </div>

      {/* Gap analysis bar */}
      <GapAnalysis
        tradeGap={stats.tradeGap}
        pnlGap={stats.pnlGap}
        withdrawGap={stats.withdrawGap}
        manualWithdrawAmount={stats.manualWithdrawAmount}
        mt5WithdrawAmount={stats.mt5WithdrawAmount}
        manualPnL={stats.manualPnL}
        mt5PnL={stats.mt5PnL}
        depositCount={stats.mt5Deposits.length}
        depositAmount={stats.mt5DepositAmount}
        mt5Linked={mt5AccountId !== null}
      />

      {/* 2-column lists */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Manual log */}
        <ListSection
          title="Khách tự log"
          subtitle={`${manualTx.length} hoạt động trong ${daysBack} ngày`}
          accentBorder="border-blue-500/30"
          empty="Khách chưa nhập log nào trong khoảng này."
        >
          {manualTx.map((t) => (
            <ManualRow key={t.id} item={t} />
          ))}
        </ListSection>

        {/* MT5 thực tế */}
        <ListSection
          title="MT5 thực tế"
          subtitle={
            !mt5AccountId
              ? "Chưa kết nối MT5"
              : `${mt5Trades.length} trades · ${mt5Tx.length} nạp/rút`
          }
          accentBorder="border-amber-500/30"
          empty={!mt5AccountId ? "Chưa kết nối MT5 cho cỗ máy này." : "Không có hoạt động MT5 trong khoảng này."}
        >
          {/* Sort trades + transactions by time desc combined */}
          {mt5AccountId && [...mt5Trades.map((t) => ({ kind: "trade" as const, t })), ...mt5Tx.map((x) => ({ kind: "tx" as const, x }))]
            .sort((a, b) => {
              const aTime = a.kind === "trade" ? (a.t.time_close ?? a.t.time_open ?? "") : a.x.time;
              const bTime = b.kind === "trade" ? (b.t.time_close ?? b.t.time_open ?? "") : b.x.time;
              return bTime.localeCompare(aTime);
            })
            .map((row, i) =>
              row.kind === "trade" ? <Mt5TradeRow key={`t-${row.t.ticket}`} item={row.t} /> : <Mt5TxRow key={`x-${row.x.ticket}-${i}`} item={row.x} />,
            )}
        </ListSection>
      </div>
    </div>
  );
}

// ───────── sub-components ─────────

function StatBox({
  title,
  subtitle,
  accent,
  titleTone,
  stats,
}: {
  title: string;
  subtitle: string;
  accent: string;
  titleTone: string;
  stats: Array<{ label: string; value: string; tone: string }>;
}) {
  return (
    <div className={cn("rounded-xl border p-4 space-y-3", accent)}>
      <div>
        <div className={cn("text-xs font-bold uppercase tracking-wider", titleTone)}>{title}</div>
        <div className="text-[10px] text-muted-foreground italic">{subtitle}</div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {stats.map((s, i) => (
          <div key={i}>
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{s.label}</div>
            <div className={cn("font-bold text-base tabular-nums mt-0.5", s.tone)}>{s.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function GapAnalysis(props: {
  tradeGap: number;
  pnlGap: number;
  withdrawGap: number;
  manualWithdrawAmount: number;
  mt5WithdrawAmount: number;
  manualPnL: number;
  mt5PnL: number;
  depositCount: number;
  depositAmount: number;
  mt5Linked: boolean;
}) {
  const flags: Array<{ severity: "error" | "warn" | "ok"; icon: typeof Check; text: string }> = [];

  if (!props.mt5Linked) {
    return (
      <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground italic">
        Cỗ máy chưa kết nối MT5 — không so sánh được với thực tế.
      </div>
    );
  }

  if (props.depositCount > 0) {
    flags.push({
      severity: "error",
      icon: AlertTriangle,
      text: `Khách đã NẠP $${props.depositAmount.toLocaleString()} (${props.depositCount} lần) — VI PHẠM rule "chỉ rút không nạp"`,
    });
  }
  if (Math.abs(props.tradeGap) > 0) {
    flags.push({
      severity: "warn",
      icon: AlertTriangle,
      text:
        props.tradeGap > 0
          ? `Khách log THỪA ${props.tradeGap} lệnh so với MT5 thực tế`
          : `Khách log THIẾU ${Math.abs(props.tradeGap)} lệnh so với MT5 thực tế`,
    });
  }
  if (Math.abs(props.pnlGap) > 1) {
    flags.push({
      severity: "warn",
      icon: AlertTriangle,
      text: `PnL khách log ${fmtUsd(props.manualPnL)} vs MT5 ${fmtUsd(props.mt5PnL)} → lệch ${fmtUsd(props.pnlGap)}`,
    });
  }
  if (Math.abs(props.withdrawGap) > 1) {
    flags.push({
      severity: "warn",
      icon: AlertTriangle,
      text: `Số tiền rút lệch: khách báo $${props.manualWithdrawAmount.toLocaleString()} vs MT5 $${props.mt5WithdrawAmount.toLocaleString()}`,
    });
  }

  if (flags.length === 0) {
    return (
      <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-xs flex items-center gap-2">
        <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
        <span className="text-emerald-700 dark:text-emerald-300 font-medium">
          Khách khai báo khớp với MT5 thực tế — không có gap.
        </span>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 space-y-1.5">
      <div className="text-xs font-bold uppercase tracking-wide text-amber-700 dark:text-amber-300">
        Phát hiện gap ({flags.length})
      </div>
      <div className="space-y-1">
        {flags.map((f, i) => (
          <div
            key={i}
            className={cn(
              "flex items-start gap-2 text-xs",
              f.severity === "error" ? "text-red-700 dark:text-red-300 font-medium" : "text-amber-700 dark:text-amber-300",
            )}
          >
            <f.icon className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <span>{f.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ListSection({
  title,
  subtitle,
  accentBorder,
  empty,
  children,
}: {
  title: string;
  subtitle: string;
  accentBorder: string;
  empty: string;
  children: React.ReactNode;
}) {
  const hasContent = Array.isArray(children) ? children.length > 0 : !!children;
  return (
    <div className={cn("rounded-xl border-2", accentBorder, "bg-card overflow-hidden")}>
      <div className="px-4 py-3 border-b border-border bg-muted/30">
        <div className="text-sm font-bold uppercase tracking-wide">{title}</div>
        <div className="text-[11px] text-muted-foreground">{subtitle}</div>
      </div>
      {hasContent ? (
        <div className="divide-y divide-border max-h-[400px] overflow-y-auto">{children}</div>
      ) : (
        <div className="px-4 py-8 text-center text-xs italic text-muted-foreground">{empty}</div>
      )}
    </div>
  );
}

function ManualRow({ item }: { item: ManualTx }) {
  const isWin = item.type === "trade_win";
  const isLoss = item.type === "trade_loss";
  const isWithdraw = item.type === "withdraw";
  const isAnchor = item.type === "anchor_change";

  const Icon = isWin ? Check : isLoss ? X : isWithdraw ? ArrowUpFromLine : Anchor;
  const tone = isWin
    ? "text-emerald-600 dark:text-emerald-400"
    : isLoss
      ? "text-red-600 dark:text-red-400"
      : isWithdraw
        ? "text-amber-600 dark:text-amber-400"
        : "text-muted-foreground";
  const label = isWin ? "Win" : isLoss ? "Loss" : isWithdraw ? "Rút" : "Anchor";
  const amount = isWin
    ? fmtUsd(item.amount)
    : isLoss
      ? fmtUsd(-Math.abs(item.amount))
      : isWithdraw
        ? `-$${Math.abs(item.amount).toLocaleString()}`
        : isAnchor
          ? `$${item.amount.toLocaleString()}`
          : `$${item.amount}`;

  return (
    <div className="px-3 py-2 flex items-center gap-3 hover:bg-muted/30 transition-colors">
      <Icon className={cn("h-3.5 w-3.5 shrink-0", tone)} />
      <span className={cn("w-12 text-xs font-bold", tone)}>{label}</span>
      <span className="w-24 text-[10px] text-muted-foreground tabular-nums">{fmtDate(item.created_at)}</span>
      <span className={cn("flex-1 text-right text-xs font-bold tabular-nums", tone)}>{amount}</span>
      {item.note && (
        <span className="hidden md:block flex-[2] text-[11px] text-muted-foreground italic truncate max-w-[200px]" title={item.note}>
          {item.note}
        </span>
      )}
    </div>
  );
}

function Mt5TradeRow({ item }: { item: Mt5Trade }) {
  const pnl = (item.profit ?? 0) + (item.swap ?? 0) + (item.commission ?? 0);
  const isBuy = item.type === "buy";
  const Icon = isBuy ? TrendingUp : TrendingDown;
  const tone = item.is_closed
    ? pnl >= 0
      ? "text-emerald-600 dark:text-emerald-400"
      : "text-red-600 dark:text-red-400"
    : "text-muted-foreground";

  return (
    <div className="px-3 py-2 flex items-center gap-3 hover:bg-muted/30 transition-colors">
      <Icon className={cn("h-3.5 w-3.5 shrink-0", isBuy ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400")} />
      <span className="w-16 text-xs font-bold">{item.symbol ?? "—"}</span>
      <span className="w-12 text-[11px] text-muted-foreground tabular-nums">{item.volume?.toFixed(2)} lot</span>
      <span className="w-24 text-[10px] text-muted-foreground tabular-nums">
        {fmtDate(item.time_close ?? item.time_open)}
      </span>
      <span className={cn("flex-1 text-right text-xs font-bold tabular-nums", tone)}>
        {item.is_closed ? fmtUsd(pnl) : "Đang mở"}
      </span>
    </div>
  );
}

function Mt5TxRow({ item }: { item: Mt5Tx }) {
  const isDeposit = item.type === "deposit";
  const Icon = isDeposit ? ArrowDownToLine : ArrowUpFromLine;
  const tone = isDeposit ? "text-red-600 dark:text-red-400 font-bold" : "text-emerald-600 dark:text-emerald-400";

  return (
    <div className={cn("px-3 py-2 flex items-center gap-3 hover:bg-muted/30 transition-colors", isDeposit && "bg-red-500/5")}>
      <Icon className={cn("h-3.5 w-3.5 shrink-0", tone)} />
      <span className={cn("w-16 text-xs", tone)}>{isDeposit ? "NẠP" : "RÚT"}</span>
      <span className="w-12 text-[10px] text-muted-foreground"></span>
      <span className="w-24 text-[10px] text-muted-foreground tabular-nums">{fmtDate(item.time)}</span>
      <span className={cn("flex-1 text-right text-xs font-bold tabular-nums", tone)}>
        {isDeposit ? "+" : "-"}${item.amount.toLocaleString()}
      </span>
      {isDeposit && <AlertTriangle className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />}
    </div>
  );
}
