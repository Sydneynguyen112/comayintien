"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ensureProfile } from "@/lib/auth";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState("Đang xác thực...");

  useEffect(() => {
    async function handle() {
      try {
        const result = await ensureProfile();

        if (!result) {
          setStatus("Không thể xác thực. Đang chuyển hướng...");
          setTimeout(() => router.push("/sign-in"), 2000);
          return;
        }

        const { profile, isNewUser } = result;
        setStatus(`Xin chào ${profile.full_name}! Đang chuyển hướng...`);

        // User mới luôn vào /pending vì status='pending', admin duyệt sau
        if (isNewUser) {
          router.push("/pending");
          return;
        }
        if (profile.role === "admin" || profile.role === "super_admin")
          router.push("/admin/crm");
        else if (profile.role === "mentor") router.push("/mentor/co-may/tong-quan");
        else router.push("/client/co-may/tong-quan");
      } catch {
        setStatus("Có lỗi xảy ra. Đang chuyển hướng...");
        setTimeout(() => router.push("/sign-in"), 2000);
      }
    }

    handle();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-muted-foreground">{status}</p>
      </div>
    </div>
  );
}
