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
      // Admin/super_admin bypass access gate
      const isAdmin = user.role === "admin" || user.role === "super_admin";
      if (!isAdmin) {
        const status = await getAccessStatus(user.id, "comay");
        if (cancelled) return;
        if (status !== "approved") {
          router.replace("/pending");
          return;
        }
      }
      await hydrateFromCloud(user.id);
      invalidateLocalCache(user.id);
      touchLastSeen(user.id, "comay");
      if (!cancelled) setHydrated(user.id);
    })();
    return () => {
      cancelled = true;
    };
    // Chỉ hydrate 1 lần cho mỗi userId (xem ghi chú o client layout) — tránh
    // re-hydrate khi useCurrentUser doi reference luc auth state thay doi.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, router]);

  if (!user || hydrated !== user.id) {
    return (
      <div className="flex items-center justify-center min-h-[40vh] text-muted-foreground">
        Đang tải...
      </div>
    );
  }
  return <CoMayShell role="mentor">{children}</CoMayShell>;
}
