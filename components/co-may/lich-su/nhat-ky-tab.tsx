"use client";

import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TxFilters, DEFAULT_TX_FILTER, type TxFilterState } from "./tx-filters";
import { TxTable } from "./tx-table";
import { downloadCsv } from "./csv-export";
import type { Machine, MachineTransaction } from "@/lib/co-may/types";
import { formatDate } from "@/lib/utils";

const DAY_MS = 86400_000;

export function NhatKyTab({
  tx,
  machines,
  role,
}: {
  tx: MachineTransaction[];
  machines: Machine[];
  role?: string | null;
}) {
  const [filter, setFilter] = useState<TxFilterState>(DEFAULT_TX_FILTER);
  const machineNameById = useMemo(
    () => new Map(machines.map((m) => [m.id, m.name])),
    [machines],
  );

  const filtered = useMemo(() => {
    const cutoff =
      filter.dateRange === "all" ? 0 : Date.now() - Number(filter.dateRange) * DAY_MS;
    return tx
      .filter((t) => filter.machineId === "all" || t.machine_id === filter.machineId)
      .filter((t) => filter.type === "all" || t.type === filter.type)
      .filter((t) => new Date(t.created_at).getTime() >= cutoff)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }, [tx, filter]);

  function handleExport() {
    downloadCsv(
      `nhat-ky-${formatDate(new Date().toISOString()).replace(/\//g, "-")}`,
      filtered.map((t) => ({
        Ngày: formatDate(t.created_at),
        Cỗ_máy: machineNameById.get(t.machine_id) ?? "",
        Loại: t.type,
        Số_tiền: t.amount,
        Ghi_chú: t.note ?? "",
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
      <TxTable tx={filtered} machines={machines} role={role} />
    </div>
  );
}
