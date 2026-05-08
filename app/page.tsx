"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getStoredUserId } from "@/lib/auth";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        // Look up profile để biết role → redirect đúng dashboard
        const { data } = await supabase
          .from("profiles")
          .select("role")
          .eq("email", user.email)
          .single();
        const role = (data?.role as string | undefined) ?? "student";
        if (role === "admin" || role === "super_admin") router.replace("/admin/crm");
        else if (role === "mentor") router.replace("/mentor/co-may/tong-quan");
        else router.replace("/client/co-may/tong-quan");
        return;
      }
      const storedId = getStoredUserId();
      if (storedId) {
        const { data } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", storedId)
          .maybeSingle();
        if (data) {
          const role = data.role as string;
          if (role === "admin" || role === "super_admin") router.replace("/admin/crm");
          else if (role === "mentor") router.replace("/mentor/co-may/tong-quan");
          else router.replace("/client/co-may/tong-quan");
          return;
        }
      }
      router.replace("/sign-in");
    })();
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen text-muted-foreground">
      Đang tải...
    </div>
  );
}
