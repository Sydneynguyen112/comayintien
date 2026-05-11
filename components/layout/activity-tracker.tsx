"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useCurrentUser } from "@/lib/auth";
import { trackEvent } from "@/lib/activity-tracker";
import { maybeTrackSessionStart, trackEvent as trackDomainEvent, Events } from "@/lib/analytics";

/**
 * Mounted ở dashboard layout — track mỗi navigation thành 1 page_view event +
 * session_start nếu idle >30 phút.
 */
export function ActivityTracker() {
  const pathname = usePathname();
  const user = useCurrentUser(null);
  const lastTracked = useRef<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const key = `${user.id}|${pathname}`;
    if (lastTracked.current === key) return;
    lastTracked.current = key;
    // activity_events (granular)
    trackEvent(user.id, "page_view", pathname);
    // events (domain) — page_view + session_start
    trackDomainEvent(Events.PAGE_VIEW, { page_path: pathname }, user.id);
    maybeTrackSessionStart(user.id);
  }, [pathname, user]);

  return null;
}
