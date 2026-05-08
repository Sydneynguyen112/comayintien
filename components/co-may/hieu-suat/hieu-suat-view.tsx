"use client";

import { useEffect, useMemo, useState } from "react";
import { useCurrentUser } from "@/lib/auth";
import {
  getMachinesForScope,
  getTxForScope,
  getUserScope,
} from "@/lib/co-may/mock-data";
import { subscribe } from "@/lib/co-may/setup-store";
import { HieuSuatSection } from "@/components/co-may/tong-quan/hieu-suat-section";

type RoleSlug = "client" | "mentor" | "admin";

export function HieuSuatView({ role }: { role: RoleSlug }) {
  const user = useCurrentUser(role);
  const [tick, setTick] = useState(0);
  useEffect(() => subscribe(() => setTick((n) => n + 1)), []);

  const data = useMemo(() => {
    if (!user) return null;
    const userIds = getUserScope(user.role ?? role, user.id);
    return {
      machines: getMachinesForScope(userIds),
      tx: getTxForScope(userIds),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, role, tick]);

  if (!user || !data) {
    return (
      <div className="flex items-center justify-center min-h-[40vh] text-muted-foreground text-sm">
        Đang tải dữ liệu...
      </div>
    );
  }

  return <HieuSuatSection role={role} machines={data.machines} tx={data.tx} />;
}
