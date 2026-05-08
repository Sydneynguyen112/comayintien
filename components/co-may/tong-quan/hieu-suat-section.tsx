"use client";

import { TrendingUp, TrendingDown, Wallet, Coins, Activity, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Machine, MachineTransaction } from "@/lib/co-may/types";
import { isSeniorMode } from "@/lib/co-may/senior-ui";

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const DAY_MS = 86400_000;
const VN_DAY_LABELS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

interface Props {
  role: "student" | "mentor" | "admin";
  machines: Machine[];
  tx: MachineTransaction[];
}

export function HieuSuatSection({ role, machines, tx }: Props) {
  const senior = isSeniorMode(role);

  return (
    <section className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <CashflowBarChart tx={tx} senior={senior} />
        </div>
        <div>
          <MachineRanking machines={machines} tx={tx} senior={senior} />
        </div>
      </div>

      <WithdrawHeatmap tx={tx} machines={machines} senior={senior} />
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────

function CashflowBarChart({ tx, senior }: { tx: MachineTransaction[]; senior: boolean }) {
  const now = new Date();
  const months: { key: string; label: string; total: number }[] = [];

  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const start = d.getTime();
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime();
    const total = tx
      .filter(
        (t) =>
          t.type === "withdraw" &&
          new Date(t.created_at).getTime() >= start &&
          new Date(t.created_at).getTime() < end,
      )
      .reduce((s, t) => s + -t.amount, 0);
    months.push({
      key: `${d.getFullYear()}-${d.getMonth()}`,
      label: `T${d.getMonth() + 1}`,
      total,
    });
  }

  const max = Math.max(1, ...months.map((m) => m.total));
  const avg = months.reduce((s, m) => s + m.total, 0) / months.length;
  const trendUp = months[months.length - 1].total >= months[0].total;

  return (
    <div className="rounded-2xl border border-border bg-card p-5 md:p-6 space-y-4">
      <div className="flex items-baseline justify-between">
        <div>
          <div className="text-xs font-semibold tabular-nums tracking-widest text-muted-foreground">§ 01 · DÒNG TIỀN</div>
          <h3 className={cn("font-semibold text-foreground mt-1", senior ? "text-xl" : "text-lg")}>
            Dòng tiền đã rút theo tháng
          </h3>
        </div>
      </div>

      <div className="grid grid-cols-6 gap-3 items-end h-32">
        {months.map((m) => {
          const h = (m.total / max) * 100;
          const isCurrent = m.key === `${now.getFullYear()}-${now.getMonth()}`;
          return (
            <div key={m.key} className="flex flex-col items-center gap-1.5 h-full justify-end">
              {m.total > 0 && (
                <span className={cn("text-[11px] font-medium tabular-nums", isCurrent ? "text-primary" : "text-muted-foreground")}>
                  {usd.format(m.total)}
                </span>
              )}
              <div
                className={cn(
                  "w-full rounded-t-md transition-all",
                  isCurrent ? "bg-primary" : "bg-foreground/20",
                )}
                style={{ height: `${Math.max(2, h)}%`, minHeight: m.total > 0 ? 8 : 2 }}
              />
            </div>
          );
        })}
      </div>
      <div className="grid grid-cols-6 gap-3 -mt-2 pt-2 border-t border-border">
        {months.map((m) => (
          <div key={m.key} className="text-center text-[11px] uppercase tracking-widest text-muted-foreground">
            {m.label}
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between border-t border-dashed border-border pt-3">
        <div>
          <div className="text-[11px] uppercase tracking-widest text-muted-foreground">Trung bình 6 tháng</div>
          <div className={cn("font-bold tabular-nums text-foreground", senior ? "text-xl" : "text-lg")}>
            {usd.format(avg)}
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-xs uppercase tracking-widest text-muted-foreground">
          Xu hướng
          {trendUp ? <TrendingUp className="h-4 w-4 text-[#5C9C75]" /> : <TrendingDown className="h-4 w-4 text-foreground" />}
        </div>
      </div>
    </div>
  );
}

function MachineRanking({
  machines,
  tx,
  senior,
}: {
  machines: Machine[];
  tx: MachineTransaction[];
  senior: boolean;
}) {
  const ranked = machines.map((m) => {
    const machineTx = tx.filter((t) => t.machine_id === m.id);
    const trades = machineTx.filter((t) => t.type === "trade_win" || t.type === "trade_loss");
    const wins = trades.filter((t) => t.type === "trade_win").length;
    const wr = trades.length > 0 ? wins / trades.length : 0;
    const pnl = trades.reduce((s, t) => s + t.amount, 0);
    const withdrawn = -machineTx.filter((t) => t.type === "withdraw").reduce((s, t) => s + t.amount, 0);
    const pct = m.capital > 0 ? (pnl / m.capital) * 100 : 0;
    return { m, trades: trades.length, wr, pnl, withdrawn, pct };
  });
  ranked.sort((a, b) => b.pnl - a.pnl);

  return (
    <div className="rounded-2xl border border-border bg-card p-5 space-y-4 h-full">
      <div>
        <div className="text-xs font-semibold tabular-nums tracking-widest text-muted-foreground">§ 02 · RANKING</div>
        <h3 className={cn("font-semibold text-foreground mt-1", senior ? "text-xl" : "text-lg")}>
          Xếp hạng cỗ máy
        </h3>
      </div>

      {ranked.length === 0 ? (
        <p className="text-sm italic text-muted-foreground">Chưa có cỗ máy để xếp hạng.</p>
      ) : (
        <ul className="divide-y divide-border -mx-5">
          {ranked.map((r, i) => (
            <li key={r.m.id} className="px-5 py-3 flex items-start gap-3">
              <span
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold tabular-nums shrink-0",
                  i === 0 ? "bg-primary text-primary-foreground" : "bg-muted text-foreground",
                )}
              >
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className={cn("font-medium text-foreground truncate", senior ? "text-base" : "text-sm")}>
                    {r.m.name}
                  </span>
                  <span
                    className={cn(
                      "font-bold tabular-nums whitespace-nowrap",
                      senior ? "text-base" : "text-sm",
                      r.pnl > 0 ? "text-[#5C9C75]" : r.pnl < 0 ? "text-foreground" : "text-muted-foreground",
                    )}
                  >
                    {r.pnl > 0 ? "+" : ""}
                    {usd.format(r.pnl)}
                  </span>
                </div>
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground tabular-nums mt-0.5">
                  {r.trades} lệnh · WR {(r.wr * 100).toFixed(0)}% · Đã rút {usd.format(r.withdrawn)}
                </div>
                {i === 0 && r.pnl > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    <Badge label="TOP" tone="success" />
                    <Badge label="CASHFLOW" tone="primary" />
                    <Badge label="KỶ LUẬT" tone="primary" />
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Badge({ label, tone }: { label: string; tone: "primary" | "success" }) {
  return (
    <span
      className={cn(
        "rounded-md px-1.5 py-0.5 text-[10px] font-bold tracking-wider",
        tone === "success" ? "bg-[#3B6C4F] text-white" : "bg-primary text-primary-foreground",
      )}
    >
      {label}
    </span>
  );
}

function WithdrawHeatmap({
  tx,
  machines,
  senior,
}: {
  tx: MachineTransaction[];
  machines: Machine[];
  senior: boolean;
}) {
  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();

  const machineNameById = new Map(machines.map((m) => [m.id, m.name]));

  // Aggregate withdraws per day per machine in current month
  // Map<day, Map<machineId, amount>>
  const byDay = new Map<number, Map<string, number>>();
  let totalDays = 0;
  let totalAmount = 0;
  for (const t of tx) {
    if (t.type !== "withdraw") continue;
    const d = new Date(t.created_at);
    if (d.getFullYear() !== year || d.getMonth() !== month) continue;
    const day = d.getDate();
    if (!byDay.has(day)) {
      byDay.set(day, new Map());
      totalDays++;
    }
    const dayMap = byDay.get(day)!;
    dayMap.set(t.machine_id, (dayMap.get(t.machine_id) ?? 0) + -t.amount);
    totalAmount += -t.amount;
  }

  function dayTotal(day: number): number {
    const m = byDay.get(day);
    if (!m) return 0;
    let s = 0;
    for (const v of m.values()) s += v;
    return s;
  }

  function dayBreakdown(day: number): string {
    const m = byDay.get(day);
    if (!m || m.size === 0) return `Ngày ${day} - không rút`;
    const lines = [`Ngày ${day}/${month + 1}: ${usd.format(dayTotal(day))}`];
    for (const [mid, amt] of m.entries()) {
      lines.push(`• ${machineNameById.get(mid) ?? mid}: ${usd.format(amt)}`);
    }
    return lines.join("\n");
  }

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstWeekday = new Date(year, month, 1).getDay(); // 0=CN
  // Convert to Mon-first index: T2=0...CN=6
  const startCol = firstWeekday === 0 ? 6 : firstWeekday - 1;

  const cells: { day: number | null; amount: number; breakdown: { machineId: string; name: string; amount: number }[] }[] = [];
  for (let i = 0; i < startCol; i++) cells.push({ day: null, amount: 0, breakdown: [] });
  for (let d = 1; d <= daysInMonth; d++) {
    const dayMap = byDay.get(d);
    const breakdown = dayMap
      ? Array.from(dayMap.entries()).map(([mid, amt]) => ({
          machineId: mid,
          name: machineNameById.get(mid) ?? mid,
          amount: amt,
        }))
      : [];
    cells.push({ day: d, amount: dayTotal(d), breakdown });
  }

  const maxAmount = Math.max(0, ...Array.from(byDay.keys()).map((d) => dayTotal(d)));

  return (
    <div className="rounded-2xl border border-border bg-card p-5 md:p-6 space-y-4">
      <div className="flex items-baseline justify-between flex-wrap gap-2">
        <div>
          <div className="text-xs font-semibold tabular-nums tracking-widest text-muted-foreground">§ 03 · TẦN SUẤT</div>
          <h3 className={cn("font-semibold text-foreground mt-1", senior ? "text-xl" : "text-lg")}>
            Heatmap rút tiền tháng này
          </h3>
        </div>
        <div className="text-xs text-muted-foreground tabular-nums">
          Tháng {month + 1} năm {year} · {totalDays} ngày · {usd.format(totalAmount)}
        </div>
      </div>

      <div>
        <div className="grid grid-cols-7 gap-1 text-[11px] uppercase tracking-widest text-muted-foreground mb-1.5">
          {["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((d) => (
            <div key={d} className="text-center">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((c, i) => {
            if (c.day === null) return <div key={i} />;
            const intensity = maxAmount > 0 ? c.amount / maxAmount : 0;
            const hasData = c.amount > 0;
            return (
              <div
                key={i}
                className={cn(
                  "aspect-square rounded-md border border-border/60 flex flex-col p-1.5 text-[10px] tabular-nums transition-colors overflow-hidden",
                  !hasData && "bg-muted/20 text-muted-foreground/60",
                  hasData && "text-foreground",
                )}
                style={
                  hasData
                    ? { backgroundColor: `rgba(205, 156, 32, ${0.18 + intensity * 0.55})` }
                    : undefined
                }
                title={dayBreakdown(c.day)}
              >
                <div className="flex items-center justify-between text-[10px]">
                  <span className="font-semibold">{c.day}</span>
                  {hasData && (
                    <span className="font-bold text-[#3B6C4F] dark:text-[#5C9C75] tabular-nums">
                      {usd.format(c.amount)}
                    </span>
                  )}
                </div>
                {hasData && (
                  <div className="mt-1 space-y-0.5 overflow-hidden">
                    {c.breakdown.slice(0, 3).map((b) => (
                      <div
                        key={b.machineId}
                        className="text-[9px] truncate text-foreground/80 leading-tight"
                        title={b.name}
                      >
                        {b.name}: {usd.format(b.amount)}
                      </div>
                    ))}
                    {c.breakdown.length > 3 && (
                      <div className="text-[9px] text-muted-foreground italic">
                        +{c.breakdown.length - 3} cỗ máy
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Reused KpiTile + SectionHeader (small inline copies — rất ít, không đáng EXTRACT)

function KpiTile({
  label,
  value,
  hint,
  icon: Icon,
  dark,
  senior,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: typeof Wallet;
  dark?: boolean;
  senior: boolean;
}) {
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
          dark ? "text-primary" : "text-foreground",
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

// Suppress unused import warning for VN_DAY_LABELS (reserved for later i18n)
void VN_DAY_LABELS;
