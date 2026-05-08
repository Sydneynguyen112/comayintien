"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useCurrentUser } from "@/lib/auth";
import { trackEvent } from "@/lib/activity-tracker";

/**
 * Mounted ở dashboard layout — track mỗi navigation thành 1 page_view event.
 * Render null, chỉ side effect.
 */
export function ActivityTracker() {
  const pathname = usePathname();
  const user = useCurrentUser(null);
  const lastTracked = useRef<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const key = `${user.id}|${pathname}`;
    // Avoid double-fire khi user object update (re-render) cùng path
    if (lastTracked.current === key) return;
    lastTracked.current = key;
    trackEvent(user.id, "page_view", pathname);
  }, [pathname, user]);

  return null;
}
