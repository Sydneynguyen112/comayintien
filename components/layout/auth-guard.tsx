"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getStoredUserId } from "@/lib/auth";

/**
 * Mounted ở dashboard layout — kiểm tra Supabase session + localStorage.
 * Nếu cả 2 đều không có → redirect về /sign-in.
 * Render null, chỉ side effect.
 */
export function AuthGuard() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (cancelled) return;
      if (user?.email) return;
      const storedId = getStoredUserId();
      if (storedId) {
        // Verify stored ID còn tồn tại
        const { data } = await supabase
          .from("profiles")
          .select("id")
          .eq("id", storedId)
          .maybeSingle();
        if (data) return;
      }
      // Không có auth — redirect /sign-in (kèm next param để quay lại sau khi login)
      const next = encodeURIComponent(pathname || "/");
      router.replace(`/sign-in?next=${next}`);
    })();
    return () => {
      cancelled = true;
    };
  }, [pathname, router]);

  return null;
}
