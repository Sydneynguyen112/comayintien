"use client";

import { useMemo, useState } from "react";
import {
  Anchor,
  Coins,
  Download,
  PowerOff,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { CurrencyUnit, CycleReport, Machine, MachineTransaction } from "@/lib/co-may/types";
import { formatMoney } from "@/lib/co-may/currency";
import { TxFilters, DEFAULT_TX_FILTER, type TxFilterState } from "./tx-filters";
import { downloadCsv } from "./csv-export";

const DAY_MS = 86400_000;

type ActionType =
  | "open"
  | "close"
  | "trade_win"
  | "trade_loss"
  | "withdraw"
  | "anchor_change";

interface ActionRow {
  id: string;
  timestamp: string;
  machineId: string;
  machineName: string;
  type: ActionType;
  description: string;
  amount?: number;
  newAnchor?: number;
  startingCapital?: number;
  endingBalance?: number;
  /** Đơn vị hiển thị của cỗ máy (USD/USC) để format giá trị đúng. */
  unit?: CurrencyUnit;
  /** ms từ lúc cỗ máy được mở (cycle_started_at) tới timestamp này. */
  elapsedMs?: number;
}

const ACTION_META: Record<
  ActionType,
  { label: string; icon: React.ElementType; tone: "profit" | "loss" | "primary" | "neutral" }
> = {
  open: { label: "Mở cỗ máy", icon: Sparkles, tone: "primary" },
  close: { label: "Đóng cỗ máy", icon: PowerOff, tone: "neutral" },
  trade_win: { label: "Lệnh thắng", icon: TrendingUp, tone: "profit" },
  trade_loss: { label: "Lệnh thua", icon: TrendingDown, tone: "loss" },
  withdraw: { label: "Rút tiền", icon: Wallet, tone: "primary" },
  anchor_change: { label: "Đổi neo", icon: Anchor, tone: "neutral" },
};

export function ActionLogView({
  tx,
  machines,
  reports,
  role: _role,
}: {
  tx: MachineTransaction[];
  machines: Machine[];
  reports: CycleReport[];
  role?: string | null;
}) {
  const [filter, setFilter] = useState<TxFilterState>(DEFAULT_TX_FILTER);

  const machineNameById = useMemo(
    () => new Map(machines.map((m) => [m.id, m.name])),
    [machines],
  );
  const machineUnitById = useMemo(
    () => new Map(machines.map((m) => [m.id, m.currency_unit])),
    [machines],
  );
  const machineCycleStart = useMemo(() => {
    const map = new Map<string, number>();
    for (const m of machines) {
      const start = new Date(m.cycle_started_at ?? m.created_at).getTime();
      map.set(m.id, start);
    }
    return map;
  }, [machines]);

  const reportByMachineId = useMemo(() => {
    const map = new Map<string, CycleReport>();
    for (const r of reports) {
      const prev = map.get(r.machine_id);
      if (!prev || r.created_at > prev.created_at) map.set(r.machine_id, r);
    }
    return map;
  }, [reports]);

  // Build unified action stream
  const actions = useMemo<ActionRow[]>(() => {
    const rows: ActionRow[] = [];
    // Open events từ machines
    for (const m of machines) {
      const openTs = m.cycle_started_at ?? m.created_at;
      rows.push({
        id: `open-${m.id}`,
        timestamp: openTs,
        machineId: m.id,
        machineName: m.name,
        type: "open",
        description: `Khởi tạo với vốn ${formatMoney(m.capital, m.currency_unit)}`,
        startingCapital: m.capital,
        unit: m.currency_unit,
        elapsedMs: 0,
      });
    }
    // Close events từ reports (ưu tiên report) + closed machines without report
    for (const m of machines) {
      if (m.status !== "closed") continue;
      const r = reportByMachineId.get(m.id);
      const ts = r?.end_date ?? m.updated_at;
      const cycleStart = machineCycleStart.get(m.id) ?? new Date(ts).getTime();
      const ending = r?.ending_balance ?? m.capital;
      const decisionLabel = r?.decision
        ? r.decision === "scale"
          ? "Scale"
          : r.decision === "reset"
            ? "Tiếp tục"
            : "Đóng"
        : "Đóng";
      rows.push({
        id: `close-${m.id}`,
        timestamp: ts,
        machineId: m.id,
        machineName: m.name,
        type: "close",
        description: `Quyết định: ${decisionLabel} · Số dư hiện tại: ${formatMoney(ending, m.currency_unit)}`,
        endingBalance: ending,
        unit: m.currency_unit,
        elapsedMs: Math.max(0, new Date(ts).getTime() - cycleStart),
      });
    }
    // Tx events
    for (const t of tx) {
      const cycleStart = machineCycleStart.get(t.machine_id) ?? new Date(t.created_at).getTime();
      const elapsed = Math.max(0, new Date(t.created_at).getTime() - cycleStart);
      const type: ActionType = t.type;
      let description = t.note?.trim() || "";
      if (!description) {
        if (type === "trade_win" || type === "trade_loss") {
          description = [t.symbol, t.entry_reason, t.exit_reason].filter(Boolean).join(" · ") || "—";
        } else {
          description = "—";
        }
      }
      const row: ActionRow = {
        id: t.id,
        timestamp: t.created_at,
        machineId: t.machine_id,
        machineName: machineNameById.get(t.machine_id) ?? "—",
        type,
        description,
        amount: type === "anchor_change" ? undefined : t.amount,
        newAnchor: type === "anchor_change" ? extractNewAnchor(t.note) : undefined,
        unit: machineUnitById.get(t.machine_id),
        elapsedMs: elapsed,
      };
      rows.push(row);
    }
    return rows.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  }, [tx, machines, machineNameById, machineUnitById, machineCycleStart, reportByMachineId]);

  const filtered = useMemo(() => {
    const cutoff = filter.dateRange === "all" ? 0 : Date.now() - Number(filter.dateRange) * DAY_MS;
    return actions
      .filter((a) => filter.machineId === "all" || a.machineId === filter.machineId)
      .filter((a) => filter.type === "all" || a.type === filter.type)
      .filter((a) => new Date(a.timestamp).getTime() >= cutoff);
  }, [actions, filter]);

  function handleExport() {
    downloadCsv(
      `nhat-ky-hanh-dong-${formatDateOnly(new Date().toISOString()).replace(/\//g, "-")}`,
      filtered.map((a) => ({
        Ngày: formatDateOnly(a.timestamp),
        Giờ: formatHM(a.timestamp),
        Cỗ_máy: a.machineName,
        Loại: ACTION_META[a.type].label,
        Mô_tả: a.description,
        Giá_trị:
          a.type === "open"
            ? a.startingCapital
            : a.type === "close"
              ? a.endingBalance
              : a.type === "anchor_change"
                ? a.newAnchor
                : a.amount,
      })),
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <TxFilters filter={filter} onChange={setFilter} machines={machines} />
        <Button
          variant="outline"
          size="sm"
          onClick={handleExport}
          disabled={filtered.length === 0}
        >
          <Download className="h-3.5 w-3.5" />
          Xuất CSV ({filtered.length})
        </Button>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          Không có hành động nào khớp filter.
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr className="text-left uppercase tracking-wider text-muted-foreground text-[11px]">
                  <Th>Ngày</Th>
                  <Th>Giờ</Th>
                  <Th>Loại</Th>
                  <Th>Cỗ máy</Th>
                  <Th>Mô tả</Th>
                  <Th align="right">Giá trị</Th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((a) => {
                  const meta = ACTION_META[a.type];
                  const Icon = meta.icon;
                  return (
                    <tr
                      key={a.id}
                      className="border-t border-border hover:bg-muted/15 transition-colors"
                    >
                      <Td className="text-muted-foreground tabular-nums whitespace-nowrap">
                        {formatDateOnly(a.timestamp)}
                      </Td>
                      <Td className="text-muted-foreground tabular-nums whitespace-nowrap">
                        {formatHM(a.timestamp)}
                      </Td>
                      <Td className="whitespace-nowrap">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1.5 text-xs font-semibold",
                            meta.tone === "profit" && "text-[#3B6C4F] dark:text-[#5C9C75]",
                            meta.tone === "loss" && "text-foreground",
                            meta.tone === "primary" && "text-primary",
                            meta.tone === "neutral" && "text-muted-foreground",
                          )}
                        >
                          <Icon className="h-3 w-3" />
                          {meta.label}
                        </span>
                      </Td>
                      <Td className="text-foreground max-w-[180px] truncate">{a.machineName}</Td>
                      <Td className="text-muted-foreground max-w-[280px] truncate">
                        {a.description}
                      </Td>
                      <Td align="right" className="tabular-nums whitespace-nowrap">
                        {renderValue(a)}
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function renderValue(a: ActionRow) {
  const money = (n: number) => formatMoney(n, a.unit);
  if (a.type === "open") {
    return <span className="text-foreground font-semibold">{money(a.startingCapital ?? 0)}</span>;
  }
  if (a.type === "close") {
    return (
      <span className="text-foreground font-semibold">{money(a.endingBalance ?? 0)}</span>
    );
  }
  if (a.type === "anchor_change") {
    return (
      <span className="text-primary font-semibold">
        {a.newAnchor !== undefined ? money(a.newAnchor) : "—"}
      </span>
    );
  }
  if (a.type === "withdraw") {
    return (
      <span className="text-[#3B6C4F] dark:text-[#5C9C75] font-semibold">
        {money(a.amount ?? 0)}
      </span>
    );
  }
  if (a.type === "trade_win") {
    return (
      <span className="text-[#3B6C4F] dark:text-[#5C9C75] font-semibold">
        +{money(a.amount ?? 0)}
      </span>
    );
  }
  if (a.type === "trade_loss") {
    return <span className="text-foreground font-semibold">{money(a.amount ?? 0)}</span>;
  }
  return <Coins className="inline h-3 w-3 text-muted-foreground" />;
}

function Th({ children, align }: { children: React.ReactNode; align?: "right" }) {
  return (
    <th
      className={cn(
        "px-4 py-2 font-medium whitespace-nowrap",
        align === "right" && "text-right",
      )}
    >
      {children}
    </th>
  );
}
function Td({
  children,
  align,
  className,
}: {
  children: React.ReactNode;
  align?: "right";
  className?: string;
}) {
  return (
    <td
      className={cn(
        "px-4 py-2.5",
        align === "right" && "text-right",
        className,
      )}
    >
      {children}
    </td>
  );
}

function formatDateOnly(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}
function formatHM(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function extractNewAnchor(note: string | null): number | undefined {
  if (!note) return undefined;
  // Match cuối: "Hạ neo từ $A xuống $B" → B; "Nâng neo lên $X" → X
  const matches = note.match(/\$([\d,.]+)/g);
  if (!matches || matches.length === 0) return undefined;
  const last = matches[matches.length - 1];
  const num = Number(last.replace(/[$,]/g, ""));
  return Number.isFinite(num) ? num : undefined;
}
