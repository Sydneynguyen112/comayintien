"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/lib/auth";
import { invalidateLocalCache } from "@/lib/co-may/mock-data";
import { hydrateFromCloud } from "@/lib/co-may/cloud-sync";
import { getAccessStatus, touchLastSeen } from "@/lib/access-status";
import { CoMayShell } from "@/components/co-may/co-may-shell";

export default function MentorCoMayLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const user = useCurrentUser("mentor");
  const [hydrated, setHydrated] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const status = await getAccessStatus(user.id, "comay");
      if (cancelled) return;
      if (status !== "approved") {
        router.replace("/pending");
        return;
      }
      await hydrateFromCloud(user.id);
      invalidateLocalCache(user.id);
      touchLastSeen(user.id, "comay");
      if (!cancelled) setHydrated(user.id);
    })();
    return () => {
      cancelled = true;
    };
  }, [user, router]);

  if (!user || hydrated !== user.id) {
    return (
      <div className="flex items-center justify-center min-h-[40vh] text-muted-foreground">
        Đang tải...
      </div>
    );
  }
  return <CoMayShell role="mentor">{children}</CoMayShell>;
}
