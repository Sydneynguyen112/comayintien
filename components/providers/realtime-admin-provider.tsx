"use client";

import { useEffect, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

/**
 * Single channel sub cho admin dashboard.
 * Listen INSERT trên events + UPDATE trên apps_access → invalidate React Query keys
 * thay vì refetch lung tung mọi component.
 *
 * Limit Supabase Realtime free plan: ~200 concurrent. Chỉ subscribe khi mount,
 * pause khi tab inactive (visibility API) để tiết kiệm slot.
 */
export function RealtimeAdminProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  useEffect(() => {
    let isMounted = true;
    const channel = supabase
      .channel("admin-live")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "events" },
        () => {
          if (!isMounted) return;
          // Invalidate tất cả overview/KPI queries
          queryClient.invalidateQueries({ queryKey: ["admin", "overview"] });
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "apps_access" },
        () => {
          if (!isMounted) return;
          queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
          queryClient.invalidateQueries({ queryKey: ["admin", "overview"] });
        },
      )
      .subscribe();

    // Pause khi tab ẩn để tiết kiệm connection (Supabase Realtime auto-detach)
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        queryClient.invalidateQueries({ queryKey: ["admin"] });
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      isMounted = false;
      document.removeEventListener("visibilitychange", onVisibilityChange);
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return <>{children}</>;
}
