"use client";

import { useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

/**
 * React Query provider — stale-while-revalidate cho mọi query trong admin.
 * Defaults:
 * - staleTime 30s: dữ liệu coi như fresh 30s, không refetch nếu chuyển tab
 * - refetchOnWindowFocus: focus lại tab → refetch (catch update từ realtime)
 * - retry 1: lỗi network 1 lần, không spam
 */
export function QueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30 * 1000,
            gcTime: 5 * 60 * 1000,
            refetchOnWindowFocus: true,
            retry: 1,
          },
        },
      }),
  );
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
