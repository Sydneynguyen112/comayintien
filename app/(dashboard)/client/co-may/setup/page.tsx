"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCurrentUser } from "@/lib/auth";
import { getMachinesByUser } from "@/lib/co-may/mock-data";
import { getSetup, hasCompletedSetup } from "@/lib/co-may/setup-store";
import { SetupWizard, type WizardMode } from "@/components/co-may/setup/setup-wizard";

function SetupPageInner() {
  const user = useCurrentUser("student");
  const router = useRouter();
  const sp = useSearchParams();
  const mode: WizardMode = sp.get("mode") === "allocate" ? "allocate" : "initial";

  useEffect(() => {
    if (!user) return;
    if (mode === "initial" && hasCompletedSetup(user.id, user.role)) {
      router.replace("/client/co-may/tong-quan");
    }
    if (mode === "allocate" && !hasCompletedSetup(user.id, user.role)) {
      router.replace("/client/co-may/setup");
    }
  }, [user, mode, router]);

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[40vh] text-muted-foreground">
        Đang tải...
      </div>
    );
  }
  let reservePool = 0;
  if (mode === "allocate") {
    const setup = getSetup(user.id);
    const activeMachines = getMachinesByUser(user.id).filter((m) => m.status !== "closed");
    const allocated = activeMachines.reduce((s, m) => s + m.capital, 0);
    reservePool = Math.max(0, (setup?.totalCapital ?? 0) - allocated);
  }

  return <SetupWizard userId={user.id} role="client" mode={mode} reservePool={reservePool} />;
}

export default function StudentCoMaySetupPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[40vh] text-muted-foreground">
          Đang tải...
        </div>
      }
    >
      <SetupPageInner />
    </Suspense>
  );
}
