"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Wallet,
  TrendingUp,
  Coins,
  Activity,
  ArrowUpRight,
  RefreshCw,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useCurrentUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import {
  getMachineById,
  getTxByMachine,
  getUserScope,
  recordTransaction,
  updateMachine,
} from "@/lib/co-may/mock-data";
import { fireworksGrand, FIREWORK_GRAND_DURATION } from "@/lib/co-may/celebrate";
import { cn } from "@/lib/utils";
import type { Machine, MachineTransaction } from "@/lib/co-may/types";
import { MachineAnchorStrip } from "./machine-anchor-strip";
import { MachineBalanceBreakdown } from "./machine-balance-breakdown";
import { MachineEquityCurve } from "./machine-equity-curve";
import { TradeJournal } from "./trade-journal";
import { WithdrawJournal } from "./withdraw-journal";
import { WithdrawDialog } from "./withdraw-dialog";

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const DAY_MS = 86400_000;

type RoleSlug = "client" | "mentor" | "admin";

const SIGNAL_LABEL: Record<string, string> = {
  self: "Tự sản xuất",
  imported: "Nhập tín hiệu",
  both: "Cả hai",
};

export function MachineDetailView({
  role,
  machineId,
  ownerId,
}: {
  role: RoleSlug;
  machineId: string;
  ownerId?: string;
}) {
  const user = useCurrentUser(role);
  const [tick, setTick] = useState(0);
  const refresh = () => setTick((n) => n + 1);

  // Withdraw dialog state — shared by anchor strip + withdraw journal
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [withdrawPreset, setWithdrawPreset] = useState({ amount: 0, anchor: 0 });
  function openWithdraw(amount: number, anchor: number) {
    setWithdrawPreset({ amount, anchor });
    setWithdrawOpen(true);
  }

  // Lift-anchor celebration state
  const [liftCelebrate, setLiftCelebrate] = useState<{
    amount: number;
    fromAnchor: number;
    toAnchor: number;
  } | null>(null);
  const liftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Hold-capital celebration (Giữ vốn — kỷ luật chờ)
  const [holdCelebrate, setHoldCelebrate] = useState<{
    overflow: number;
    target: number;
  } | null>(null);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (liftTimerRef.current) clearTimeout(liftTimerRef.current);
      if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    };
  }, []);

  const resolved = useMemo<{
    machine: Machine;
    tx: MachineTransaction[];
    resolvedOwner: string;
  } | null>(() => {
    if (!user) return null;
    const scope = getUserScope(user.role ?? role, user.id);
    const candidates = ownerId && scope.includes(ownerId) ? [ownerId] : [user.id, ...scope];
    for (const id of candidates) {
      const m = getMachineById(id, machineId);
      if (m) return { machine: m, tx: getTxByMachine(id, machineId), resolvedOwner: id };
    }
    return null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, role, machineId, ownerId, tick]);

  if (!user) return <div className="text-sm text-muted-foreground">Đang tải...</div>;

  if (!resolved) {
    return (
      <div className="space-y-4">
        <Link
          href={`/${role}/co-may/quan-ly`}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Quay lại danh sách
        </Link>
        <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          Không tìm thấy cỗ máy này hoặc bạn không có quyền truy cập.
        </div>
      </div>
    );
  }

  const { machine, tx, resolvedOwner } = resolved;
  const cycleStartTs = new Date(machine.cycle_started_at ?? machine.created_at).getTime();

  const allTrades = tx.filter((t) => t.type === "trade_win" || t.type === "trade_loss");
  const totalPnl = allTrades.reduce((s, t) => s + t.amount, 0);
  const allWithdraws = tx.filter((t) => t.type === "withdraw");
  const withdrawnAbs = -allWithdraws.reduce((s, t) => s + t.amount, 0);
  const balance = machine.capital + totalPnl - withdrawnAbs;
  const wins = allTrades.filter((t) => t.type === "trade_win").length;
  const wr = allTrades.length > 0 ? Math.round((wins / allTrades.length) * 100) : 0;
  const days = Math.max(1, Math.floor((Date.now() - cycleStartTs) / DAY_MS));

  const readOnly = role !== "client" || resolvedOwner !== user.id;

  return (
    <div className="space-y-5">
      {/* Header */}
      <header className="space-y-3">
        <Link
          href={`/${role}/co-may/quan-ly`}
          className="inline-flex items-center gap-1.5 text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3" />
          Cỗ máy / {machine.name}
        </Link>

        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl md:text-3xl font-bold text-foreground gold-gradient-text">
                {machine.name}
              </h1>
              <span className="rounded-md bg-foreground text-background px-2.5 py-1 text-xs font-semibold tabular-nums uppercase tracking-widest">
                {days} ngày
              </span>
              {machine.capital > 0 && (
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-bold tabular-nums uppercase tracking-widest border",
                    totalPnl > 0
                      ? "border-[#3B6C4F]/40 bg-[#3B6C4F]/10 text-[#3B6C4F] dark:text-[#5C9C75]"
                      : totalPnl < 0
                        ? "border-foreground/30 bg-foreground/5 text-foreground"
                        : "border-border bg-muted/30 text-muted-foreground",
                  )}
                  title={`PNL ${usd.format(totalPnl)} / Vốn ${usd.format(machine.capital)}`}
                >
                  <TrendingUp className={cn("h-3 w-3", totalPnl < 0 && "rotate-180")} />
                  {totalPnl > 0 ? "+" : ""}
                  {((totalPnl / machine.capital) * 100).toFixed(1)}%
                </span>
              )}
            </div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground mt-1">
              {machine.method ?? "—"} · {SIGNAL_LABEL[machine.signal_source ?? "self"] ?? "—"} · {allTrades.length} lệnh
            </p>
          </div>

          {!readOnly && machine.status !== "closed" && (
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={`/${role}/co-may/quan-ly/${machineId}/dong-chu-ky?owner=${resolvedOwner}`}
              >
                <Button variant="anchor" size="default">
                  <RefreshCw className="h-3.5 w-3.5" />
                  Đóng chu kỳ và lập báo cáo
                </Button>
              </Link>
            </div>
          )}
        </div>
      </header>

      {/* 4 KPI top */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-border rounded-2xl overflow-hidden border border-border">
        <KpiTile
          dark
          label="Đã rút"
          value={usd.format(withdrawnAbs)}
          hint="Tiền thật về tài khoản"
          icon={Wallet}
        />
        <KpiTile label="Số dư hiện tại" value={usd.format(balance)} icon={Coins} />
        <KpiTile label="Vốn gốc" value={usd.format(machine.capital)} icon={Coins} />
        <KpiTile
          label="PNL"
          value={`${totalPnl >= 0 ? "+" : ""}${usd.format(totalPnl)}`}
          hint={`${allTrades.length} lệnh · WR ${wr}%`}
          icon={TrendingUp}
          tone={totalPnl > 0 ? "profit" : totalPnl < 0 ? "loss" : "neutral"}
        />
      </div>

      {/* Anchor strip */}
      <MachineAnchorStrip
        milestones={machine.anchor_milestones ?? []}
        currentAnchor={machine.current_anchor}
        balance={balance}
        readOnly={readOnly}
        tradeCount={allTrades.length}
        persistKey={machineId}
        onEditMilestones={(next) => {
          updateMachine(resolvedOwner, machineId, { anchor_milestones: next });
          refresh();
        }}
        onWithdraw={openWithdraw}
        onLiftAnchor={(amount, toAnchor) => {
          const fromAnchor = machine.current_anchor;
          recordTransaction(resolvedOwner, machineId, {
            type: "withdraw",
            amount: -amount,
            note: `Rút ${usd.format(amount)} về mốc ${usd.format(toAnchor)}`,
          });
          // Tách hoạt động nâng neo thành tx riêng để filter "Hạ/Nâng neo" truy xuất được.
          recordTransaction(resolvedOwner, machineId, {
            type: "anchor_change",
            amount: toAnchor - fromAnchor,
            note: `Nâng neo từ ${usd.format(fromAnchor)} lên ${usd.format(toAnchor)}`,
          });
          updateMachine(resolvedOwner, machineId, { current_anchor: toAnchor });
          refresh();
          fireworksGrand();
          setLiftCelebrate({ amount, fromAnchor, toAnchor });
          if (liftTimerRef.current) clearTimeout(liftTimerRef.current);
          liftTimerRef.current = setTimeout(() => {
            setLiftCelebrate(null);
            liftTimerRef.current = null;
          }, FIREWORK_GRAND_DURATION);
        }}
        onLowerAnchor={(newAnchor) => {
          const oldAnchor = machine.current_anchor;
          updateMachine(resolvedOwner, machineId, { current_anchor: newAnchor });
          recordTransaction(resolvedOwner, machineId, {
            type: "anchor_change",
            amount: newAnchor - oldAnchor,
            note: `Hạ neo từ ${usd.format(oldAnchor)} xuống ${usd.format(newAnchor)}`,
          });
          refresh();
        }}
        onHold={(overflow, target) => {
          setHoldCelebrate({ overflow, target });
          if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
          holdTimerRef.current = setTimeout(() => {
            setHoldCelebrate(null);
            holdTimerRef.current = null;
          }, 4000);
        }}
      />

      {/* Equity curve + Balance breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <MachineEquityCurve
            capital={machine.capital}
            tx={tx}
            milestones={machine.anchor_milestones}
          />
        </div>
        <MachineBalanceBreakdown
          capital={machine.capital}
          totalPnl={totalPnl}
          totalWithdrawn={withdrawnAbs}
        />
      </div>

      {/* Trade journal */}
      <TradeJournal
        ownerId={resolvedOwner}
        machineId={machineId}
        tx={tx}
        onChange={refresh}
        readOnly={readOnly}
      />

      {/* Withdraw journal */}
      <WithdrawJournal tx={tx} />

      {/* Shared withdraw dialog (with fireworks) */}
      <WithdrawDialog
        open={withdrawOpen}
        onOpenChange={setWithdrawOpen}
        ownerId={resolvedOwner}
        machineId={machineId}
        presetAmount={withdrawPreset.amount}
        currentAnchor={withdrawPreset.anchor || machine.current_anchor}
        onSuccess={refresh}
      />

      {/* GIỮ VỐN encouragement popup */}
      <AnimatePresence>
        {holdCelebrate && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", duration: 0.4 }}
            className="fixed inset-0 z-[55] flex items-center justify-center pointer-events-none px-4"
          >
            <div className="bg-card border-2 border-dashed border-primary/60 rounded-3xl px-10 py-7 shadow-2xl text-center space-y-3 max-w-md">
              <div className="text-[11px] font-bold uppercase tracking-[0.25em] text-primary">
                Giữ vốn · kỷ luật chờ
              </div>
              <h3 className="text-2xl md:text-3xl font-bold text-foreground leading-tight">
                Chưa rút lúc này
              </h3>
              <p className="text-base md:text-lg text-foreground/85">
                Để dành{" "}
                <span className="font-bold text-[#3B6C4F] dark:text-[#5C9C75] tabular-nums">
                  {usd.format(holdCelebrate.overflow)}
                </span>{" "}
                — nhắm mốc{" "}
                <span className="font-bold text-primary tabular-nums">
                  {usd.format(holdCelebrate.target)}
                </span>
              </p>
              <div className="border-t border-dashed border-border pt-3">
                <p className="text-sm md:text-base italic text-foreground/80 leading-relaxed">
                  &ldquo;Người giàu kiên nhẫn hơn thị trường.&rdquo;
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* NÂNG NEO grand celebration */}
      <AnimatePresence>
        {liftCelebrate && (
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.92 }}
            transition={{ type: "spring", duration: 0.5 }}
            className="fixed inset-0 z-[60] flex items-center justify-center pointer-events-none px-4"
          >
            <div className="bg-card border-2 border-primary rounded-3xl px-12 py-8 shadow-2xl gold-glow text-center space-y-4 max-w-lg">
              <div className="flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-[0.25em] text-primary">
                <ArrowUpRight className="h-4 w-4" />
                Nâng neo thành công
              </div>
              <h3 className="text-3xl md:text-4xl font-bold text-foreground leading-tight">
                Cỗ máy lên bậc thang mới
              </h3>
              <div className="flex items-center justify-center gap-3 text-2xl md:text-3xl font-bold tabular-nums">
                <span className="text-muted-foreground/60 line-through">
                  {usd.format(liftCelebrate.fromAnchor)}
                </span>
                <ArrowUpRight className="h-6 w-6 text-primary" />
                <span className="text-primary gold-gradient-text">
                  {usd.format(liftCelebrate.toAnchor)}
                </span>
              </div>
              <p className="text-base text-muted-foreground">
                Đã rút{" "}
                <strong className="text-[#3B6C4F] dark:text-[#5C9C75]">
                  {usd.format(liftCelebrate.amount)}
                </strong>{" "}
                — phần lãi này không thể mất nữa.
              </p>
              <div className="border-t border-dashed border-border pt-4 space-y-1">
                <p className="text-base md:text-lg italic text-foreground/90 leading-relaxed">
                  &ldquo;Mỗi lần nâng neo là một bậc thang xây bằng kỷ luật.&rdquo;
                </p>
                <p className="text-sm text-muted-foreground">
                  Doanh chủ đã chứng minh hệ thống vận hành — và biết khi nào thì chốt.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────

function KpiTile({
  label,
  value,
  hint,
  icon: Icon,
  dark,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: typeof Wallet;
  dark?: boolean;
  tone?: "profit" | "loss" | "neutral";
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
          "flex items-center gap-1.5 uppercase tracking-widest font-medium text-xs",
          dark ? "text-background/60" : "text-muted-foreground",
        )}
      >
        <Icon size={12} />
        {label}
      </div>
      <div className={cn("text-2xl md:text-3xl font-bold tabular-nums leading-none", valueColor)}>
        {value}
      </div>
      {hint && (
        <div className={cn("text-xs", dark ? "text-background/50" : "text-muted-foreground")}>{hint}</div>
      )}
    </div>
  );
}

// Suppress unused
void Activity;
