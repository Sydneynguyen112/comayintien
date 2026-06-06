"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/lib/auth";
import { touchLastSeen } from "@/lib/access-status";
import { CoMayShell } from "@/components/co-may/co-may-shell";
import { RealtimeAdminProvider } from "@/components/providers/realtime-admin-provider";
import { Mt5SyncAlert } from "@/components/admin/mt5-sync-alert";

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
      <CoMayShell role="admin">
        {/* Cảnh báo toàn cục: chỉ hiện khi MT5 ngừng/chậm đồng bộ (ẩn lúc bình thường;
            empty:hidden để không chừa khoảng trống khi banner null). */}
        <div className="mb-4 empty:hidden">
          <Mt5SyncAlert hideWhenOk />
        </div>
        {children}
      </CoMayShell>
    </RealtimeAdminProvider>
  );
}
