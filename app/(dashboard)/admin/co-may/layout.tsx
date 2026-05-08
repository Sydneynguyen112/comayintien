"use client";

import { useEffect, useState } from "react";
import { useCurrentUser } from "@/lib/auth";
import { invalidateLocalCache } from "@/lib/co-may/mock-data";
import { hydrateFromCloud } from "@/lib/co-may/cloud-sync";
import { CoMayShell } from "@/components/co-may/co-may-shell";

export default function AdminCoMayLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = useCurrentUser("admin");
  const [hydrated, setHydrated] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      await hydrateFromCloud(user.id);
      invalidateLocalCache(user.id);
      if (!cancelled) setHydrated(user.id);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (!user || hydrated !== user.id) {
    return (
      <div className="flex items-center justify-center min-h-[40vh] text-muted-foreground">
        Đang tải...
      </div>
    );
  }
  return <CoMayShell role="admin">{children}</CoMayShell>;
}
