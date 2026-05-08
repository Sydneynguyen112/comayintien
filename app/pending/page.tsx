"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Clock, LogOut, Mail } from "lucide-react";
import { useCurrentUser, signOut } from "@/lib/auth";
import { getAccessStatus } from "@/lib/access-status";
import { Button } from "@/components/ui/button";

export default function PendingPage() {
  const router = useRouter();
  const user = useCurrentUser("student");
  const [status, setStatus] = useState<"loading" | "pending" | "approved" | "locked">("loading");

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const s = await getAccessStatus(user.id, "comay");
      if (cancelled) return;
      // Admin role bypass — không bao giờ pending
      if (user.role === "admin" || user.role === "super_admin") {
        router.replace("/admin/crm");
        return;
      }
      if (s === "approved") {
        router.replace(user.role === "mentor" ? "/mentor/co-may/tong-quan" : "/student/co-may/tong-quan");
        return;
      }
      setStatus(s === "locked" ? "locked" : "pending");
    })();
    return () => {
      cancelled = true;
    };
  }, [user, router]);

  const handleSignOut = async () => {
    await signOut();
    router.push("/sign-in");
  };

  if (!user || status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen text-muted-foreground">
        Đang tải...
      </div>
    );
  }

  const isLocked = status === "locked";

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-card border border-border rounded-2xl p-8 text-center space-y-5 shadow-lg">
        <div className="mx-auto w-16 h-16 rounded-full bg-gold/15 flex items-center justify-center">
          <Clock className="h-8 w-8 text-gold" />
        </div>

        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {isLocked ? "Tài khoản đã bị khoá" : "Đang chờ duyệt"}
          </h1>
          <p className="mt-2 text-muted-foreground text-sm leading-relaxed">
            {isLocked
              ? "Quyền truy cập Cỗ Máy In Tiền của bạn đã bị admin thu hồi. Liên hệ admin nếu cần hỗ trợ."
              : "Tài khoản của bạn đã được tạo. Admin sẽ review và mở quyền truy cập Cỗ Máy In Tiền trong thời gian sớm nhất."}
          </p>
        </div>

        <div className="bg-muted/40 rounded-xl p-4 text-sm space-y-1 text-left">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Mail className="h-3.5 w-3.5" />
            <span className="text-xs uppercase tracking-wide font-medium">Email</span>
          </div>
          <div className="font-medium text-foreground break-all">{user.email}</div>
        </div>

        {!isLocked && (
          <p className="text-xs text-muted-foreground">
            Bạn sẽ nhận được thông báo qua email khi admin duyệt.
          </p>
        )}

        <div className="flex flex-col gap-2 pt-2">
          <Button
            variant="outline"
            onClick={handleSignOut}
            className="w-full"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Đăng xuất
          </Button>
          <Link href="/sign-in" className="text-xs text-muted-foreground hover:text-gold transition-colors">
            Đăng nhập tài khoản khác
          </Link>
        </div>
      </div>
    </div>
  );
}
