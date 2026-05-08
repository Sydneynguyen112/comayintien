"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/lib/auth";
import {
  getMachinesForScope,
  getTxForScope,
  getUserScope,
} from "@/lib/co-may/mock-data";
import { getSetup, subscribe } from "@/lib/co-may/setup-store";
import { PhongDieuHanh } from "./phong-dieu-hanh";

type RoleSlug = "student" | "mentor" | "admin";

export function TongQuanView({ role }: { role: RoleSlug }) {
  const user = useCurrentUser(role);
  const router = useRouter();
  const [tick, setTick] = useState(0);

  useEffect(() => subscribe(() => setTick((n) => n + 1)), []);

  const data = useMemo(() => {
    if (!user) return null;
    const userIds = getUserScope(user.role ?? role, user.id);
    const machines = getMachinesForScope(userIds);
    const tx = getTxForScope(userIds);
    const setup = getSetup(user.id);
    const totalCapitalSetup =
      setup?.totalCapital ??
      // Mentor/admin không có setup riêng — fallback sum machines.capital
      machines.reduce((s, m) => s + m.capital, 0);
    const injectedFromWithdrawn = setup?.injectedFromWithdrawn ?? 0;
    return { userIds, machines, tx, totalCapitalSetup, injectedFromWithdrawn };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, role, tick]);

  if (!user || !data) {
    return (
      <div className="flex items-center justify-center min-h-[40vh] text-muted-foreground text-sm">
        Đang tải dữ liệu...
      </div>
    );
  }

  const { machines, tx, totalCapitalSetup, injectedFromWithdrawn } = data;

  return (
    <PhongDieuHanh
      role={role}
      userId={user.id}
      totalCapitalSetup={totalCapitalSetup}
      injectedFromWithdrawn={injectedFromWithdrawn}
      machines={machines}
      tx={tx}
      onReset={() => router.push(`/${role}/co-may/setup?mode=allocate`)}
      onChange={() => setTick((n) => n + 1)}
    />
  );
}
