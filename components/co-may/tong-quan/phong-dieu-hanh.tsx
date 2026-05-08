"use client";

import Link from "next/link";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Coins,
  ArrowUpRight,
  Plus,
  RotateCcw,
  Anchor,
  ChevronRight,
  Activity,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn, formatRelativeTime } from "@/lib/utils";
import type { Machine, MachineTransaction, TransactionType } from "@/lib/co-may/types";
import { isSeniorMode } from "@/lib/co-may/senior-ui";
import { MachineCard } from "@/components/co-may/quan-ly/machine-card";
import { recordTransaction } from "@/lib/co-may/mock-data";
import { Sparkles, Target } from "lucide-react";
import { useState } from "react";
import { WithdrawDialog } from "@/components/co-may/quan-ly/withdraw-dialog";
import { HieuSuatSection } from "./hieu-suat-section";

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

interface Props {
  role: "client" | "mentor" | "admin";
  userId: string;
  totalCapitalSetup: number;
  /** Tiền đã nạp lại từ pool đã rút — trừ vào display "Dòng tiền đã rút". */
  injectedFromWithdrawn?: number;
  machines: Machine[];
  tx: MachineTransaction[];
  onReset?: () => void;
  /** Trigger khi action commit (rút nhanh) → parent bump tick re-render. */
  onChange?: () => void;
}

export function PhongDieuHanh({
  role,
  userId,
  totalCapitalSetup,
  injectedFromWithdrawn = 0,
  machines,
  tx,
  onReset,
  onChange,
}: Props) {
  void userId;
  const senior = isSeniorMode(role);

  // Loại bỏ closed machines khỏi running stats — vốn của chúng đã trả về totalCapital.
  const activeMachines = machines.filter((m) => m.status !== "closed");
  const totalAllocated = activeMachines.reduce((s, m) => s + m.capital, 0);
  const reserve = Math.max(0, totalCapitalSetup - totalAllocated);
  const trades = tx.filter((t) => t.type === "trade_win" || t.type === "trade_loss");
  const openPnl = trades.reduce((s, t) => s + t.amount, 0);
  // Tổng dòng tiền đã rút = lifetime gross — KHÔNG trừ injection (đó là metric khác,
  // phản ánh trong totalCapital tăng khi re-allocate). Giữ historical record nguyên.
  const withdrawn = -tx
    .filter((t) => t.type === "withdraw")
    .reduce((s, t) => s + t.amount, 0);
  void injectedFromWithdrawn;
  const activeCount = activeMachines.filter((m) => m.status === "active").length;
  // Vốn đang vận hành = tổng số dư hiện tại các cỗ máy active (capital + pnl - đã rút).
  const totalRunningBalance = activeMachines.reduce((s, m) => {
    const mTx = tx.filter((t) => t.machine_id === m.id);
    const mPnl = mTx
      .filter((t) => t.type === "trade_win" || t.type === "trade_loss")
      .reduce((acc, t) => acc + t.amount, 0);
    const mWithdrawn = -mTx
      .filter((t) => t.type === "withdraw")
      .reduce((acc, t) => acc + t.amount, 0);
    return s + (m.capital + mPnl - mWithdrawn);
  }, 0);

  // Month-level KPIs (gộp từ Hiệu suất section)
  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime();
  const lastMonthEnd = thisMonthStart;
  // "Cùng kỳ tháng trước" = từ đầu tháng trước → ngày tương ứng (cùng số ngày từ đầu tháng tới giờ)
  const dayOfMonth = now.getDate();
  const lastMonthSameRangeEnd = new Date(now.getFullYear(), now.getMonth() - 1, dayOfMonth, 23, 59, 59).getTime();

  const withdrawsThisMonth = tx
    .filter((t) => t.type === "withdraw" && new Date(t.created_at).getTime() >= thisMonthStart)
    .reduce((s, t) => s + -t.amount, 0);
  const withdrawsLastMonthSameRange = tx
    .filter(
      (t) =>
        t.type === "withdraw" &&
        new Date(t.created_at).getTime() >= lastMonthStart &&
        new Date(t.created_at).getTime() <= lastMonthSameRangeEnd &&
        new Date(t.created_at).getTime() < lastMonthEnd,
    )
    .reduce((s, t) => s + -t.amount, 0);
  const withdrawGrowthPct =
    withdrawsLastMonthSameRange > 0
      ? ((withdrawsThisMonth - withdrawsLastMonthSameRange) / withdrawsLastMonthSameRange) * 100
      : withdrawsThisMonth > 0
        ? 100
        : 0;

  // ROI tháng này = PnL tháng / vốn đang vận hành
  const pnlThisMonth = tx
    .filter(
      (t) =>
        (t.type === "trade_win" || t.type === "trade_loss") &&
        new Date(t.created_at).getTime() >= thisMonthStart,
    )
    .reduce((s, t) => s + t.amount, 0);
  const roiThisMonthPct = totalAllocated > 0 ? (pnlThisMonth / totalAllocated) * 100 : 0;

  // Số ngày có rút tiền / tổng ngày trong tháng
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const withdrawDaysSet = new Set(
    tx
      .filter((t) => t.type === "withdraw" && new Date(t.created_at).getTime() >= thisMonthStart)
      .map((t) => new Date(t.created_at).toISOString().slice(0, 10)),
  );
  const withdrawDaysCount = withdrawDaysSet.size;

  function handleReset() {
    onReset?.();
  }

  const featured = [...activeMachines]
    .sort((a, b) => {
      const pnlA = pnlForMachine(a, tx);
      const pnlB = pnlForMachine(b, tx);
      return pnlB - pnlA;
    })
    .slice(0, 2);

  function isMachineDismissed(machineId: string, tradeCount: number): boolean {
    if (typeof window === "undefined") return false;
    const stored = window.localStorage.getItem(`co-may-anchor-dismiss-${machineId}`);
    return stored !== null && Number(stored) === tradeCount;
  }

  // Tính alert: cỗ máy có overflow lớn nhất, chưa dismiss → 1 banner top.
  const overflowAlerts = activeMachines
    .map((m) => {
      const mTx = tx.filter((t) => t.machine_id === m.id);
      const mTrades = mTx.filter((t) => t.type === "trade_win" || t.type === "trade_loss");
      const mPnl = mTrades.reduce((s, t) => s + t.amount, 0);
      const mWithdrawn = -mTx.filter((t) => t.type === "withdraw").reduce((s, t) => s + t.amount, 0);
      const balance = m.capital + mPnl - mWithdrawn;
      return {
        machine: m,
        balance,
        overflow: balance - m.current_anchor,
        tradeCount: mTrades.length,
      };
    })
    .filter((a) => a.overflow > 0 && !isMachineDismissed(a.machine.id, a.tradeCount))
    .sort((a, b) => b.overflow - a.overflow);

  const topOverflow = overflowAlerts[0];

  function dismissMachine(machineId: string, tradeCount: number) {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(`co-may-anchor-dismiss-${machineId}`, String(tradeCount));
  }

  // Mốc nhắm tới = milestone cao hơn current anchor liền kề (theo sorted desc).
  function nextHigherMilestone(machine: Machine): number | null {
    const ms = (machine.anchor_milestones ?? []).slice().sort((a, b) => b - a);
    const idx = ms.findIndex((m) => m === machine.current_anchor);
    const realIdx = idx === -1 ? ms.findIndex((m) => m <= machine.current_anchor) : idx;
    if (realIdx <= 0) return null;
    return ms[realIdx - 1];
  }

  function handleQuickWithdraw(args: { machine: Machine; amount: number; toAnchor: number }) {
    if (args.amount <= 0) return;
    recordTransaction(args.machine.user_id, args.machine.id, {
      type: "withdraw",
      amount: -args.amount,
      note: `Rút ${usd.format(args.amount)} về mốc ${usd.format(args.toAnchor)}`,
    });
    // Sau khi rút, dismiss banner cho phiên trade hiện tại — không hiện lại đến khi có lệnh mới.
    const machineTrades = tx
      .filter((t) => t.machine_id === args.machine.id)
      .filter((t) => t.type === "trade_win" || t.type === "trade_loss");
    dismissMachine(args.machine.id, machineTrades.length);
    onChange?.();
  }

  function handleHold(machine: Machine, machineTx: MachineTransaction[]) {
    const tradeCount = machineTx.filter(
      (t) => t.type === "trade_win" || t.type === "trade_loss",
    ).length;
    dismissMachine(machine.id, tradeCount);
    onChange?.();
  }

  function handleDailyWithdrawSuccess() {
    // Dismiss banner cho machine vừa rút — kể cả rút partial.
    if (dailyMachine) {
      const machineTrades = tx
        .filter((t) => t.machine_id === dailyMachine.id)
        .filter((t) => t.type === "trade_win" || t.type === "trade_loss");
      dismissMachine(dailyMachine.id, machineTrades.length);
    }
    onChange?.();
  }

  // Withdraw dialog state cho action "Rút hằng ngày" từ banner
  const [dailyOpen, setDailyOpen] = useState(false);
  const [dailyMachine, setDailyMachine] = useState<Machine | null>(null);
  function openDailyWithdraw(machine: Machine) {
    setDailyMachine(machine);
    setDailyOpen(true);
  }

  return (
    <section className="space-y-6">
      <SectionHeader
        eyebrow="§ Tổng quan vận hành"
        title="Phòng điều hành"
        subtitle="Toàn cảnh danh mục cỗ máy và dòng tiền đã rút về đời thực."
        senior={senior}
      />

      {/* Banner: top overflow alert — kêu user act ngay */}
      {topOverflow && (() => {
        const target = nextHigherMilestone(topOverflow.machine);
        const machineTx = tx.filter((t) => t.machine_id === topOverflow.machine.id);
        return (
          <div className="rounded-2xl border-2 border-[#3B6C4F] bg-[#3B6C4F]/8 p-5 space-y-3">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-[#3B6C4F]/20 p-2 shrink-0">
                <Sparkles className="h-4 w-4 text-[#3B6C4F] dark:text-[#5C9C75]" />
              </div>
              <div className="space-y-0.5">
                <p className="text-sm md:text-base leading-relaxed">
                  <strong className="text-foreground">&ldquo;{topOverflow.machine.name}&rdquo;</strong>
                  : mốc hiện tại{" "}
                  <span className="font-bold tabular-nums">
                    {usd.format(topOverflow.machine.current_anchor)}
                  </span>
                  {target !== null && (
                    <>
                      , mốc nhắm tới{" "}
                      <span className="font-bold text-primary tabular-nums">
                        {usd.format(target)}
                      </span>
                    </>
                  )}
                  . PnL{" "}
                  <span className="font-bold text-[#3B6C4F] dark:text-[#5C9C75] tabular-nums">
                    +{usd.format(topOverflow.overflow)}
                  </span>{" "}
                  vượt mốc hiện tại, doanh chủ cần quyết định ngay để giữ kỷ luật.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {target !== null && (
                <>
                  <Button
                    variant="outline"
                    size={senior ? "default" : "sm"}
                    onClick={() => handleHold(topOverflow.machine, machineTx)}
                  >
                    <Target className="h-3.5 w-3.5" />
                    Giữ vốn — quay về mốc {usd.format(target)}
                  </Button>
                  <Button
                    variant="outline"
                    size={senior ? "default" : "sm"}
                    onClick={() => openDailyWithdraw(topOverflow.machine)}
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    Rút tiền hằng ngày
                  </Button>
                </>
              )}
              <Button
                variant="anchor"
                size={senior ? "default" : "sm"}
                onClick={() =>
                  handleQuickWithdraw({
                    machine: topOverflow.machine,
                    amount: topOverflow.overflow,
                    toAnchor: topOverflow.machine.current_anchor,
                  })
                }
              >
                <Sparkles className="h-3.5 w-3.5" />
                Rút {usd.format(topOverflow.overflow)}
              </Button>
            </div>
          </div>
        );
      })()}

      {/* Row 1: 4 KPI tổng — dòng tiền đã rút (dark) + vốn vận hành + PnL hiện tại + cỗ máy active */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-border rounded-2xl overflow-hidden border border-border">
        <KpiTile
          dark
          label="Tổng dòng tiền đã rút"
          value={usd.format(withdrawn)}
          hint="Tiền thật về tài khoản"
          icon={Wallet}
          senior={senior}
        />
        <KpiTile
          label="Vốn đang vận hành"
          value={usd.format(totalRunningBalance)}
          icon={Coins}
          senior={senior}
        />
        <KpiTile
          label="PNL hiện tại"
          value={`${openPnl >= 0 ? "+" : ""}${usd.format(openPnl)}`}
          tone={openPnl > 0 ? "profit" : openPnl < 0 ? "loss" : "neutral"}
          icon={openPnl >= 0 ? TrendingUp : TrendingDown}
          senior={senior}
        />
        <KpiTile
          label="Cỗ máy đang hoạt động"
          value={`${activeCount}`}
          icon={Coins}
          senior={senior}
        />
      </div>

      {/* Row 2: 4 KPI tháng — dòng tiền tháng + ROI + tăng trưởng vs cùng kỳ + ngày có rút */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-border rounded-2xl overflow-hidden border border-border">
        <KpiTile
          dark
          label="Dòng tiền rút tháng này"
          value={usd.format(withdrawsThisMonth)}
          hint={`Tháng ${now.getMonth() + 1}`}
          icon={Wallet}
          senior={senior}
        />
        <KpiTile
          label="ROI tháng này"
          value={`${roiThisMonthPct >= 0 ? "+" : ""}${roiThisMonthPct.toFixed(1)}%`}
          hint={`PnL ${pnlThisMonth >= 0 ? "+" : ""}${usd.format(pnlThisMonth)} / vốn ${usd.format(totalAllocated)}`}
          tone={roiThisMonthPct > 0 ? "profit" : roiThisMonthPct < 0 ? "loss" : "neutral"}
          icon={roiThisMonthPct >= 0 ? TrendingUp : TrendingDown}
          senior={senior}
        />
        <KpiTile
          label="Tăng trưởng vs cùng kỳ"
          value={`${withdrawGrowthPct >= 0 ? "+" : ""}${withdrawGrowthPct.toFixed(1)}%`}
          hint={`Tháng trước: ${usd.format(withdrawsLastMonthSameRange)}`}
          tone={withdrawGrowthPct > 0 ? "profit" : withdrawGrowthPct < 0 ? "loss" : "neutral"}
          icon={withdrawGrowthPct >= 0 ? TrendingUp : TrendingDown}
          senior={senior}
        />
        <KpiTile
          label="Ngày có rút / Tổng ngày"
          value={`${withdrawDaysCount} / ${daysInMonth}`}
          hint={`${Math.round((withdrawDaysCount / daysInMonth) * 100)}% ngày trong tháng`}
          icon={Activity}
          senior={senior}
        />
      </div>

      {/* 3 secondary KPI on dashed line — invariant: tổng vốn = phân bổ + dự trữ */}
      <div className="rounded-2xl border-2 border-dashed border-border px-5 py-4 grid grid-cols-2 md:grid-cols-4 gap-4 items-center">
        <SecondaryStat label="Tổng vốn doanh chủ" value={usd.format(Math.max(totalCapitalSetup, totalAllocated + reserve))} senior={senior} />
        <SecondaryStat label="Vốn đã phân bổ" value={usd.format(totalAllocated)} senior={senior} />
        <SecondaryStat label="Vốn dự trữ" value={usd.format(reserve)} senior={senior} />
        {role === "client" && (
          <div className="flex md:justify-end">
            <Button
              variant="outline"
              size={senior ? "default" : "sm"}
              onClick={handleReset}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Hoạch định lại
            </Button>
          </div>
        )}
      </div>

      {/* Empty state khi chưa có cỗ máy nào — giữ lại để onboarding học viên mới */}
      {featured.length === 0 && <EmptyMachineState role={role} senior={senior} />}

      {/* § 01 Hiệu suất — gộp từ tab riêng vào tổng quan */}
      <div className="space-y-3">
        <SubSectionHeader number="01" label="Hiệu suất" senior={senior} />
        <HieuSuatSection role={role} machines={machines} tx={tx} />
      </div>

      {/* Daily withdraw dialog — fired từ banner */}
      {dailyMachine && (
        <WithdrawDialog
          open={dailyOpen}
          onOpenChange={setDailyOpen}
          ownerId={dailyMachine.user_id}
          machineId={dailyMachine.id}
          presetAmount={0}
          currentAnchor={dailyMachine.current_anchor}
          onSuccess={handleDailyWithdrawSuccess}
        />
      )}
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────

function pnlForMachine(m: Machine, tx: MachineTransaction[]): number {
  const cycleStart = new Date(m.cycle_started_at ?? m.created_at).getTime();
  return tx
    .filter((t) => t.machine_id === m.id && new Date(t.created_at).getTime() >= cycleStart)
    .filter((t) => t.type === "trade_win" || t.type === "trade_loss")
    .reduce((s, t) => s + t.amount, 0);
}

function SectionHeader({
  eyebrow,
  title,
  subtitle,
  senior,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  senior: boolean;
}) {
  return (
    <header className="space-y-1">
      <div className="text-xs font-semibold uppercase tracking-widest text-primary">{eyebrow}</div>
      <h2 className={cn("font-bold text-foreground leading-tight", senior ? "text-3xl md:text-4xl" : "text-2xl md:text-3xl")}>
        {title}
      </h2>
      <p className={cn("text-muted-foreground", senior ? "text-base" : "text-sm")}>{subtitle}</p>
    </header>
  );
}

function SubSectionHeader({
  number,
  label,
  actionHref,
  actionText,
  senior,
}: {
  number: string;
  label: string;
  actionHref?: string;
  actionText?: string;
  senior: boolean;
}) {
  return (
    <div className="flex items-end justify-between gap-3 border-b border-border pb-2">
      <div className="flex items-baseline gap-2">
        <span className="text-xs font-semibold tabular-nums tracking-widest text-muted-foreground">§ {number}</span>
        <h3 className={cn("font-semibold text-foreground", senior ? "text-xl" : "text-lg")}>{label}</h3>
      </div>
      {actionHref && actionText && (
        <Link
          href={actionHref}
          className={cn(
            "inline-flex items-center gap-1 font-medium text-primary hover:underline whitespace-nowrap",
            senior ? "text-sm" : "text-xs",
          )}
        >
          {actionText} <ArrowUpRight className={senior ? "h-3.5 w-3.5" : "h-3 w-3"} />
        </Link>
      )}
    </div>
  );
}

function KpiTile({
  label,
  value,
  hint,
  icon: Icon,
  dark,
  tone,
  senior,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: typeof Wallet;
  dark?: boolean;
  tone?: "profit" | "loss" | "neutral";
  senior: boolean;
}) {
  const valueColor =
    tone === "profit"
      ? "text-[#5C9C75]"
      : tone === "loss"
        ? "text-foreground"
        : dark
          ? "text-primary"
          : "text-foreground";
  return (
    <div
      className={cn(
        "p-4 md:p-5 flex flex-col gap-2",
        dark ? "bg-foreground text-background" : "bg-card",
      )}
    >
      <div
        className={cn(
          "flex items-center gap-1.5 uppercase tracking-widest font-medium",
          senior ? "text-xs" : "text-[11px]",
          dark ? "text-background/60" : "text-muted-foreground",
        )}
      >
        <Icon size={senior ? 14 : 12} />
        {label}
      </div>
      <div
        className={cn(
          "font-bold tabular-nums leading-none",
          senior ? "text-2xl md:text-3xl" : "text-xl md:text-2xl",
          valueColor,
        )}
      >
        {value}
      </div>
      {hint && (
        <div
          className={cn(
            senior ? "text-xs" : "text-[11px]",
            dark ? "text-background/50" : "text-muted-foreground",
          )}
        >
          {hint}
        </div>
      )}
    </div>
  );
}

function SecondaryStat({ label, value, senior }: { label: string; value: string; senior: boolean }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className={cn("uppercase tracking-widest text-muted-foreground", senior ? "text-xs" : "text-[11px]")}>
        {label}
      </span>
      <span className={cn("font-bold tabular-nums text-foreground", senior ? "text-2xl" : "text-xl")}>
        {value}
      </span>
    </div>
  );
}

function EmptyMachineState({ role, senior }: { role: string; senior: boolean }) {
  return (
    <div className="rounded-2xl border-2 border-dashed border-border px-6 py-10 text-center space-y-4">
      <p className="text-base italic text-foreground/80">
        <strong>&ldquo;</strong>Mọi doanh chủ đều bắt đầu với một cỗ máy đầu tiên.
      </p>
      <p className="text-xs uppercase tracking-widest text-muted-foreground">— ROVA Trading Academy</p>
      <p className={cn(senior ? "text-base" : "text-sm", "text-muted-foreground")}>
        Hãy khởi tạo cỗ máy đầu tiên để biến vốn thành dòng tiền.
      </p>
      <Link href={`/${role}/co-may/quan-ly`}>
        <Button variant="default" size={senior ? "lg" : "default"}>
          <Plus className="h-4 w-4" />
          Khởi tạo cỗ máy đầu tiên
        </Button>
      </Link>
    </div>
  );
}

function FeaturedMachineCard({
  machine,
  tx,
  role,
  senior,
}: {
  machine: Machine;
  tx: MachineTransaction[];
  role: string;
  senior: boolean;
}) {
  const cycleStart = new Date(machine.cycle_started_at ?? machine.created_at).getTime();
  const machineTx = tx.filter((t) => t.machine_id === machine.id);
  const inCycle = machineTx.filter((t) => new Date(t.created_at).getTime() >= cycleStart);
  const trades = inCycle.filter((t) => t.type === "trade_win" || t.type === "trade_loss");
  const pnl = trades.reduce((s, t) => s + t.amount, 0);
  const withdraws = inCycle
    .filter((t) => t.type === "withdraw")
    .reduce((s, t) => s + t.amount, 0);
  const balance = machine.capital + pnl + withdraws;
  const days = Math.max(1, Math.floor((Date.now() - cycleStart) / 86400_000));
  const pnlPct = machine.capital > 0 ? (pnl / machine.capital) * 100 : 0;
  const anchorRatio = Math.max(0, Math.min(1, balance / Math.max(1, machine.current_anchor)));

  return (
    <Link
      href={`/${role}/co-may/quan-ly/${machine.id}?owner=${machine.user_id}`}
      className="group block rounded-2xl border border-border bg-card hover:border-primary/40 hover:shadow-sm transition-all p-5 space-y-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h4 className={cn("font-semibold text-foreground", senior ? "text-lg" : "text-base")}>
            {machine.name}
            {pnlPct !== 0 && (
              <span
                className={cn(
                  "ml-2 text-sm font-medium tabular-nums",
                  pnlPct > 0 ? "text-[#5C9C75]" : "text-foreground",
                )}
              >
                {pnlPct > 0 ? "+" : ""}
                {pnlPct.toFixed(1)}%
              </span>
            )}
          </h4>
          <p className="text-xs text-muted-foreground mt-0.5 uppercase tracking-wider">
            3-box method · Thủ công
          </p>
        </div>
        <span className="rounded-md bg-foreground text-background px-2 py-0.5 text-xs font-semibold tabular-nums whitespace-nowrap">
          {days} ngày
        </span>
      </div>

      <div className="border-t border-dashed border-border pt-3 grid grid-cols-2 gap-y-2 text-sm">
        <Stat label="Vốn gốc" value={usd.format(machine.capital)} senior={senior} />
        <Stat
          label="PnL"
          value={`${pnl >= 0 ? "+" : ""}${usd.format(pnl)}`}
          tone={pnl > 0 ? "profit" : pnl < 0 ? "loss" : undefined}
          senior={senior}
        />
        <Stat label="Đã rút" value={usd.format(-withdraws)} senior={senior} />
        <Stat label="Số dư hiện tại" value={usd.format(balance)} senior={senior} />
      </div>

      {/* Anchor mock-bar */}
      <div className="rounded-lg bg-muted/30 px-3 py-2.5">
        <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5">
          <span className="flex items-center gap-1">
            <Anchor className="h-3 w-3 text-primary" />
            Mốc neo
          </span>
          <span className="tabular-nums">
            Hiện tại: {usd.format(balance)} · Số dư: <strong className="text-foreground">{usd.format(balance)}</strong>
          </span>
        </div>
        <div className="relative h-2 rounded-full bg-border overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 bg-primary transition-all"
            style={{ width: `${anchorRatio * 100}%` }}
          />
        </div>
      </div>
    </Link>
  );
}

function Stat({
  label,
  value,
  tone,
  senior,
}: {
  label: string;
  value: string;
  tone?: "profit" | "loss";
  senior: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-dashed border-border/50 py-1 last:border-0">
      <span className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</span>
      <span
        className={cn(
          "font-semibold tabular-nums",
          senior ? "text-base" : "text-sm",
          tone === "profit" && "text-[#5C9C75]",
          tone === "loss" && "text-foreground",
          !tone && "text-foreground",
        )}
      >
        {value}
      </span>
    </div>
  );
}

const TYPE_LABEL: Record<TransactionType, string> = {
  trade_win: "Lệnh thắng",
  trade_loss: "Lệnh thua",
  withdraw: "Rút phần dư",
  anchor_change: "Đổi anchor",
};

function ActivityRow({
  tx,
  machines,
  senior,
}: {
  tx: MachineTransaction;
  machines: Machine[];
  senior: boolean;
}) {
  const machine = machines.find((m) => m.id === tx.machine_id);
  const tone = tx.type === "withdraw" || tx.amount > 0 ? "profit" : tx.amount < 0 ? "loss" : undefined;

  return (
    <li className={cn("grid grid-cols-[120px_1fr_auto] items-center gap-4", senior ? "px-5 py-4" : "px-4 py-3")}>
      <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">
        {TYPE_LABEL[tx.type]}
      </span>
      <div className="min-w-0">
        <div className={cn("font-medium text-foreground truncate", senior ? "text-base" : "text-sm")}>
          {machine?.name ?? tx.machine_id}
        </div>
        {tx.note && (
          <div className={cn("italic text-muted-foreground/70 truncate", senior ? "text-sm" : "text-xs")}>
            {tx.note}
          </div>
        )}
      </div>
      <div className="text-right space-y-0.5">
        <div
          className={cn(
            "font-semibold tabular-nums whitespace-nowrap",
            senior ? "text-base" : "text-sm",
            tone === "profit" && "text-[#5C9C75]",
            tone === "loss" && "text-foreground",
          )}
        >
          {tx.amount > 0 ? "+" : ""}
          {usd.format(tx.amount)}
        </div>
        <div className="text-[11px] text-muted-foreground tabular-nums">
          {formatRelativeTime(tx.created_at)}
        </div>
      </div>
    </li>
  );
}
