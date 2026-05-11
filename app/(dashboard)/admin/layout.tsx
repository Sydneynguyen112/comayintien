"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/lib/auth";
import { touchLastSeen } from "@/lib/access-status";
import { CoMayShell } from "@/components/co-may/co-may-shell";
import { RealtimeAdminProvider } from "@/components/providers/realtime-admin-provider";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const user = useCurrentUser("admin");

  useEffect(() => {
    if (!user) return;
    if (user.role !== "admin" && user.role !== "super_admin") {
      router.replace("/");
      return;
    }
    touchLastSeen(user.id, "comay");
  }, [user, router]);

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[40vh] text-muted-foreground">
        Đang tải...
      </div>
    );
  }
  return (
    <RealtimeAdminProvider>
      <CoMayShell role="admin">{children}</CoMayShell>
    </RealtimeAdminProvider>
  );
}
