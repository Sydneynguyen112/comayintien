"use client";

import { useMemo, useState } from "react";
import type { CycleReport, Machine, MachineTransaction } from "@/lib/co-may/types";
import { ReportTable } from "./report-table";

export function BaoCaoTab({
  reports,
  machines,
  tx,
  role,
}: {
  reports: CycleReport[];
  machines: Machine[];
  tx: MachineTransaction[];
  role?: string | null;
}) {
  const [machineId, setMachineId] = useState<string | "all">("all");
  const [decision, setDecision] = useState<"all" | "reset" | "scale">("all");

  const filtered = useMemo(
    () =>
      reports
        .filter((r) => machineId === "all" || r.machine_id === machineId)
        .filter((r) => decision === "all" || r.decision === decision)
        .sort((a, b) => b.created_at.localeCompare(a.created_at)),
    [reports, machineId, decision],
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={machineId}
          onChange={(e) => setMachineId(e.target.value)}
          className="h-8 rounded-lg border border-input bg-background text-foreground px-2 text-sm focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 outline-none"
        >
          <option value="all">Tất cả cỗ máy</option>
          {machines.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
        <select
          value={decision}
          onChange={(e) => setDecision(e.target.value as typeof decision)}
          className="h-8 rounded-lg border border-input bg-background text-foreground px-2 text-sm focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 outline-none"
        >
          <option value="all">Mọi quyết định</option>
          <option value="reset">Chỉ Reset</option>
          <option value="scale">Chỉ Scale</option>
        </select>
        <span className="ml-auto text-xs text-muted-foreground">
          {filtered.length} chu kỳ
        </span>
      </div>
      <ReportTable reports={filtered} machines={machines} tx={tx} role={role} />
    </div>
  );
}
