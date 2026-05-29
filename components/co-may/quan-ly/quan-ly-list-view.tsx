"use client";

import { useEffect, useState } from "react";
import { useCurrentUser } from "@/lib/auth";
import {
  getMachinesByUser,
  getReportsByUser,
  getTxByUser,
  getUserScope,
} from "@/lib/co-may/mock-data";
import { getSetup } from "@/lib/co-may/setup-store";
import type { CycleReport, Machine, MachineTransaction } from "@/lib/co-may/types";
import { MachineCard } from "./machine-card";
import { ClosedMachineCard } from "./closed-machine-card";
import { CreateMachineDialog } from "./create-machine-dialog";
import { MachineMt5Footer } from "./machine-mt5-footer";

type RoleSlug = "client" | "mentor" | "admin";

const SCOPE_LABEL: Record<RoleSlug, string> = {
  client: "Cỗ máy của bạn",
  mentor: "Cỗ máy của mentee",
  admin: "Tất cả cỗ máy",
};

export function QuanLyListView({ role }: { role: RoleSlug }) {
  const user = useCurrentUser(role);
  const [machineMap, setMachineMap] = useState<{ ownerId: string; m: Machine }[]>([]);
  const [tx, setTx] = useState<MachineTransaction[]>([]);
  const [reports, setReports] = useState<CycleReport[]>([]);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!user) return;
    const userIds = getUserScope(user.role ?? role, user.id);
    const allMachines: { ownerId: string; m: Machine }[] = [];
    const allTx: MachineTransaction[] = [];
    const allReports: CycleReport[] = [];
    for (const id of userIds) {
      for (const m of getMachinesByUser(id)) allMachines.push({ ownerId: id, m });
      allTx.push(...getTxByUser(id));
      allReports.push(...getReportsByUser(id));
    }
    setMachineMap(allMachines);
    setTx(allTx);
    setReports(allReports);
  }, [user, role, tick]);

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[40vh] text-muted-foreground text-sm">
        Đang tải...
      </div>
    );
  }

  const canCreate = role === "client";

  // Reserve pool = totalCapital - sum(active machine.capital của chính user, không phải scope)
  let reservePool: number | undefined;
  if (canCreate) {
    const setup = getSetup(user.id);
    if (setup) {
      const ownActive = getMachinesByUser(user.id).filter((m) => m.status !== "closed");
      const allocated = ownActive.reduce((s, m) => s + m.capital, 0);
      reservePool = Math.max(0, setup.totalCapital - allocated);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Cỗ Máy Chi Tiết</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {SCOPE_LABEL[role]} • {machineMap.length} cỗ máy
            {!canCreate && " • read-only"}
            {canCreate && reservePool !== undefined && ` • Vốn dự trữ: ${new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(reservePool)}`}
          </p>
        </div>
        {canCreate && (
          <CreateMachineDialog
            userId={user.id}
            reservePool={reservePool}
            onCreated={() => setTick((n) => n + 1)}
          />
        )}
      </div>

      {machineMap.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center space-y-2">
          <p className="text-sm text-muted-foreground">Chưa có cỗ máy nào.</p>
          {canCreate && (
            <p className="text-xs text-muted-foreground/70">
              Bấm &quot;Tạo cỗ máy mới&quot; ở góc phải để bắt đầu.
            </p>
          )}
        </div>
      ) : (
        (() => {
          // Mới tạo lên đầu. Sau hydrate cloud thứ tự theo DB nên phải sort lại
          // (created_at là ISO string → so sánh chuỗi = so sánh thời gian).
          const byNewest = (a: { m: Machine }, b: { m: Machine }) =>
            b.m.created_at.localeCompare(a.m.created_at);
          const active = machineMap.filter(({ m }) => m.status !== "closed").sort(byNewest);
          const closed = machineMap.filter(({ m }) => m.status === "closed").sort(byNewest);
          const reportByMachineId = new Map<string, CycleReport>();
          for (const r of reports) {
            const prev = reportByMachineId.get(r.machine_id);
            if (!prev || r.created_at > prev.created_at) {
              reportByMachineId.set(r.machine_id, r);
            }
          }
          return (
            <div className="space-y-8">
              <section>
                <h3 className="text-sm uppercase tracking-widest text-muted-foreground mb-3">
                  Đang hoạt động · {active.length}
                </h3>
                {active.length === 0 ? (
                  <p className="text-sm italic text-muted-foreground py-4">
                    Không có cỗ máy nào đang hoạt động.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {active.map(({ ownerId, m }) => (
                      <div key={m.id} className="space-y-2">
                        <MachineCard
                          machine={m}
                          tx={tx.filter((t) => t.machine_id === m.id)}
                          detailHref={`/${role}/co-may/quan-ly/${m.id}?owner=${ownerId}`}
                          role={role}
                        />
                        <MachineMt5Footer
                          machineId={m.id}
                          machineName={m.name}
                          userId={ownerId}
                          canLink={role === "client" && ownerId === user.id}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {closed.length > 0 && (
                <section>
                  <h3 className="text-sm uppercase tracking-widest text-muted-foreground mb-3">
                    Đã đóng · {closed.length}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {closed.map(({ ownerId, m }) => {
                      const report = reportByMachineId.get(m.id);
                      if (report) {
                        return (
                          <ClosedMachineCard
                            key={m.id}
                            report={report}
                            detailHref={`/${role}/co-may/bao-cao/${report.id}?owner=${ownerId}`}
                          />
                        );
                      }
                      // Fallback: cỗ máy đóng nhưng không có report (data legacy) → dùng MachineCard
                      return (
                        <MachineCard
                          key={m.id}
                          machine={m}
                          tx={tx.filter((t) => t.machine_id === m.id)}
                          detailHref={`/${role}/co-may/quan-ly/${m.id}?owner=${ownerId}`}
                          role={role}
                        />
                      );
                    })}
                  </div>
                </section>
              )}
            </div>
          );
        })()
      )}
    </div>
  );
}
