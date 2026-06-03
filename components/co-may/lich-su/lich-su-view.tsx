"use client";

import { useMemo } from "react";
import { useCurrentUser } from "@/lib/auth";
import {
  getMachinesForScope,
  getReportsForScope,
  getTxForScope,
  getUserScope,
} from "@/lib/co-may/mock-data";
import { ActionLogView } from "./action-log-view";

type RoleSlug = "client" | "mentor" | "admin";

const SCOPE_LABEL: Record<RoleSlug, string> = {
  client: "Lịch sử của bạn",
  mentor: "Lịch sử các mentee",
  admin: "Lịch sử toàn hệ thống",
};

export function LichSuView({ role }: { role: RoleSlug }) {
  const user = useCurrentUser(role);

  const data = useMemo(() => {
    if (!user) return null;
    // Scope theo role của TRANG (prop `role`), không theo role hồ sơ.
    const userIds = getUserScope(role, user.id);
    return {
      machines: getMachinesForScope(userIds),
      tx: getTxForScope(userIds),
      reports: getReportsForScope(userIds),
    };
  }, [user, role]);

  if (!user || !data) {
    return (
      <div className="flex items-center justify-center min-h-[40vh] text-muted-foreground text-sm">
        Đang tải lịch sử...
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Nhật ký hoạt động</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          {SCOPE_LABEL[role]} • {data.machines.length} cỗ máy
        </p>
      </div>

      <ActionLogView
        tx={data.tx}
        machines={data.machines}
        reports={data.reports}
        role={role}
      />
    </div>
  );
}
