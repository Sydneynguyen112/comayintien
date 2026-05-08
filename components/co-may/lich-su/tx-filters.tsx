"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Machine } from "@/lib/co-may/types";

export type DateRange = "7" | "30" | "90" | "all";

export type ActionFilterType =
  | "all"
  | "open"
  | "close"
  | "trade_win"
  | "trade_loss"
  | "withdraw"
  | "anchor_change";

const DATE_OPTIONS: { value: DateRange; label: string }[] = [
  { value: "7", label: "7 ngày" },
  { value: "30", label: "30 ngày" },
  { value: "90", label: "90 ngày" },
  { value: "all", label: "Tất cả" },
];

const TYPE_OPTIONS: { value: ActionFilterType; label: string }[] = [
  { value: "all", label: "Tất cả loại" },
  { value: "open", label: "Mở cỗ máy" },
  { value: "close", label: "Đóng cỗ máy" },
  { value: "trade_win", label: "Lệnh thắng" },
  { value: "trade_loss", label: "Lệnh thua" },
  { value: "withdraw", label: "Rút tiền" },
  { value: "anchor_change", label: "Hạ/Nâng neo" },
];

export interface TxFilterState {
  machineId: string | "all";
  dateRange: DateRange;
  type: ActionFilterType;
}

export const DEFAULT_TX_FILTER: TxFilterState = {
  machineId: "all",
  dateRange: "30",
  type: "all",
};

export function TxFilters({
  filter,
  onChange,
  machines,
}: {
  filter: TxFilterState;
  onChange: (next: TxFilterState) => void;
  machines: Machine[];
}) {
  const hasActiveFilter =
    filter.machineId !== "all" || filter.dateRange !== "30" || filter.type !== "all";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        value={filter.machineId}
        onChange={(e) => onChange({ ...filter, machineId: e.target.value })}
        className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 outline-none"
      >
        <option value="all">Tất cả cỗ máy</option>
        {machines.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name}
          </option>
        ))}
      </select>

      <select
        value={filter.dateRange}
        onChange={(e) => onChange({ ...filter, dateRange: e.target.value as DateRange })}
        className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 outline-none"
      >
        {DATE_OPTIONS.map((d) => (
          <option key={d.value} value={d.value}>
            {d.label}
          </option>
        ))}
      </select>

      <select
        value={filter.type}
        onChange={(e) => onChange({ ...filter, type: e.target.value as TxFilterState["type"] })}
        className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 outline-none"
      >
        {TYPE_OPTIONS.map((t) => (
          <option key={t.value} value={t.value}>
            {t.label}
          </option>
        ))}
      </select>

      {hasActiveFilter && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onChange(DEFAULT_TX_FILTER)}
        >
          <X className="h-3 w-3" />
          Xoá filter
        </Button>
      )}
    </div>
  );
}
