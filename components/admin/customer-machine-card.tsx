"use client";

import { Activity, Anchor, ArrowDown, ArrowUp, CheckCircle2, Clock, Coins, TrendingUp, Wallet, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Mt5LinkDialog } from "./mt5-link-dialog";

export interface MachineLite {
  id: string;
  name: string;
  capital: number;
  current_anchor: number;
  status: string;
  method: string | null;
  created_at: string;
  cycle_started_at: string | null;
}

export interface MachineTx {
  id: string;
  machine_id: string;
  type: string;
  amount: number;
  note: string | null;
  created_at: string;
}

export interface Mt5Info {
  accountId: string;
  login: string;
  server: string;
  status: string;                // pending | active | error | disabled
  lastSyncedAt: string | null;
  lastError: string | null;
}

interface Props {
  machine: MachineLite;
  transactions: MachineTx[];
  userId: string;                // cần cho dialog gán link
  mt5?: Mt5Info | null;          // null/undefined = chưa link MT5
  onMt5Changed?: () => void;     // callback refresh page sau khi link
}

const statusStyles: Record<string, string> = {
  active: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  paused: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
  closed: "bg-muted text-muted-foreground border-border",
};

const statusLabels: Record<string, string> = {
  active: "Đang chạy",
  paused: "Tạm dừng",
  closed: "Đã đóng",
};

function formatUsd(n: number) {
  return `$${n.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
}

function daysBetween(a: string, b: string): number {
  return Math.abs(new Date(a).getTime() - new Date(b).getTime()) / (1000 * 60 * 60 * 24);
}

function daysSince(iso: string | null): number | null {
  if (!iso) return null;
  return Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Card hiển thị toàn bộ chỉ số 1 cỗ máy: vốn, anchor, PnL, withdraw stats,
 * idle days, lịch sử nâng/hạ neo.
 */
export function CustomerMachineCard({ machine, transactions, userId, mt5, onMt5Changed }: Props) {
  const machineTx = transactions
    .filter((t) => t.machine_id === machine.id)
    .sort((a, b) => a.created_at.localeCompare(b.created_at));

  const wins = machineTx.filter((t) => t.type === "trade_win");
  const losses = machineTx.filter((t) => t.type === "trade_loss");
  const withdraws = machineTx.filter((t) => t.type === "withdraw");
  const anchorChanges = machineTx.filter((t) => t.type === "anchor_change");

  const totalWin = wins.reduce((s, t) => s + (t.amount || 0), 0);
  const totalLoss = losses.reduce((s, t) => s + Math.abs(t.amount || 0), 0);
  const pnl = totalWin - totalLoss;
  const totalWithdrawn = withdraws.reduce((s, t) => s + Math.abs(t.amount || 0), 0);
  const balance = machine.capital + pnl - totalWithdrawn;

  // Khoảng cách TB giữa các lần rút (ngày)
  let avgWithdrawGap: number | null = null;
  if (withdraws.length >= 2) {
    const gaps: number[] = [];
    for (let i = 1; i < withdraws.length; i++) {
      gaps.push(daysBetween(withdraws[i - 1].created_at, withdraws[i].created_at));
    }
    avgWithdrawGap = gaps.reduce((s, g) => s + g, 0) / gaps.length;
  }
  const lastWithdraw = withdraws[withdraws.length - 1];
  const idleDays = lastWithdraw ? daysSince(lastWithdraw.created_at) : daysSince(machine.cycle_started_at);

  const tradeCount = wins.length + losses.length;
  const winRate = tradeCount > 0 ? (wins.length / tradeCount) * 100 : 0;

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-semibold text-foreground truncate">{machine.name}</div>
          <div className="text-xs text-muted-foreground">
            {machine.method || "—"}
            {machine.cycle_started_at && (
              <> · cycle {daysSince(machine.cycle_started_at)} ngày</>
            )}
          </div>
        </div>
        <Badge variant="outline" className={cn("text-xs shrink-0", statusStyles[machine.status] ?? "bg-muted")}>
          {statusLabels[machine.status] ?? machine.status}
        </Badge>
      </div>

      {/* Capital row */}
      <div className="grid grid-cols-2 gap-2 text-sm">
        <Stat icon={Coins} label="Vốn gốc" value={formatUsd(machine.capital)} tone="text-foreground" />
        <Stat icon={Anchor} label="Anchor" value={formatUsd(machine.current_anchor)} tone="text-gold" />
        <Stat
          icon={TrendingUp}
          label="PnL"
          value={`${pnl >= 0 ? "+" : ""}${formatUsd(pnl)}`}
          tone={pnl >= 0 ? "text-emerald-500" : "text-red-500"}
        />
        <Stat icon={Wallet} label="Số dư" value={formatUsd(balance)} tone="text-foreground" />
      </div>

      {/* Withdraw stats */}
      <div className="border-t border-border pt-3 space-y-1.5 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Số lần rút</span>
          <span className="font-semibold text-foreground tabular-nums">{withdraws.length}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Tổng đã rút</span>
          <span className="font-semibold text-emerald-500 tabular-nums">{formatUsd(totalWithdrawn)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Khoảng cách TB</span>
          <span className="font-medium text-foreground tabular-nums">
            {avgWithdrawGap === null ? "—" : `${avgWithdrawGap.toFixed(1)} ngày`}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Chưa rút</span>
          <span className={cn(
            "font-medium tabular-nums",
            idleDays === null ? "text-muted-foreground" : idleDays > 14 ? "text-amber-500" : "text-foreground",
          )}>
            {idleDays === null ? "—" : `${idleDays} ngày`}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Lệnh thắng/thua</span>
          <span className="font-medium text-foreground tabular-nums">
            {wins.length}/{losses.length}
            {tradeCount > 0 && <span className="text-muted-foreground ml-1.5">· WR {winRate.toFixed(0)}%</span>}
          </span>
        </div>
      </div>

      {/* MT5 monitoring */}
      <div className="border-t border-border pt-3">
        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
          <Activity className="h-3 w-3" /> MT5 Giám sát
        </div>
        {mt5 ? (
          <Mt5StatusBlock mt5={mt5} />
        ) : (
          <Mt5LinkDialog
            userId={userId}
            machineId={machine.id}
            machineName={machine.name}
            onLinked={onMt5Changed}
          />
        )}
      </div>

      {/* Anchor history */}
      {anchorChanges.length > 0 && (
        <div className="border-t border-border pt-3">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
            Lịch sử neo · {anchorChanges.length} lần
          </div>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {[...anchorChanges].reverse().slice(0, 8).map((c) => {
              const isUp = (c.note ?? "").toLowerCase().includes("nâng");
              const isDown = (c.note ?? "").toLowerCase().includes("hạ");
              const Icon = isUp ? ArrowUp : isDown ? ArrowDown : Anchor;
              const tone = isUp ? "text-emerald-500" : isDown ? "text-amber-500" : "text-muted-foreground";
              const days = daysSince(c.created_at);
              return (
                <div key={c.id} className="flex items-start gap-2 text-xs">
                  <Icon className={cn("h-3 w-3 mt-0.5 shrink-0", tone)} />
                  <div className="flex-1 min-w-0">
                    <div className="text-foreground truncate">{c.note || "Đổi neo"}</div>
                    <div className="text-[10px] text-muted-foreground">
                      {days === 0 ? "Hôm nay" : `${days} ngày trước`}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

const mt5StatusStyles: Record<string, { icon: typeof CheckCircle2; tone: string; label: string }> = {
  active:   { icon: CheckCircle2, tone: "text-emerald-500",      label: "Đang sync" },
  pending:  { icon: Clock,        tone: "text-amber-500",        label: "Chờ sync lần đầu" },
  error:    { icon: XCircle,      tone: "text-red-500",          label: "Lỗi" },
  disabled: { icon: XCircle,      tone: "text-muted-foreground", label: "Tạm tắt" },
};

function Mt5StatusBlock({ mt5 }: { mt5: Mt5Info }) {
  const s = mt5StatusStyles[mt5.status] ?? mt5StatusStyles.pending;
  const Icon = s.icon;
  const lastSynced = mt5.lastSyncedAt ? daysSince(mt5.lastSyncedAt) : null;

  return (
    <div className="space-y-1.5 text-xs">
      <div className="flex items-center gap-1.5">
        <Icon className={cn("h-3.5 w-3.5", s.tone)} />
        <span className={cn("font-semibold", s.tone)}>{s.label}</span>
      </div>
      <div className="text-muted-foreground tabular-nums">
        Login <span className="text-foreground font-medium">{mt5.login}</span>
        {" · "}
        <span className="text-foreground">{mt5.server}</span>
      </div>
      <div className="text-muted-foreground">
        Sync cuối:{" "}
        <span className="text-foreground tabular-nums">
          {lastSynced === null ? "—" : lastSynced === 0 ? "Hôm nay" : `${lastSynced} ngày trước`}
        </span>
      </div>
      {mt5.lastError && (
        <div className="rounded border border-red-500/30 bg-red-500/5 px-2 py-1 text-red-600 dark:text-red-400">
          {mt5.lastError.length > 100 ? mt5.lastError.slice(0, 100) + "…" : mt5.lastError}
        </div>
      )}
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Coins;
  label: string;
  value: string;
  tone: string;
}) {
  return (
    <div className="rounded-lg bg-muted/30 px-2.5 py-2">
      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground uppercase tracking-wide">
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <div className={cn("font-semibold mt-0.5 tabular-nums", tone)}>{value}</div>
    </div>
  );
}
