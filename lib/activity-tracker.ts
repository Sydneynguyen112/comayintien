"use client";

import { supabase } from "./supabase";

export type ActivityType = "login" | "page_view" | "machine_open" | "machine_action";

/**
 * Fire-and-forget log activity event.
 * Không block UI, lỗi sẽ swallow để không break user flow.
 */
export async function trackEvent(
  userId: string,
  type: ActivityType,
  path?: string,
  metadata?: Record<string, unknown>,
) {
  try {
    await supabase.from("activity_events").insert({
      user_id: userId,
      type,
      path: path ?? null,
      metadata: metadata ?? null,
    });
  } catch {
    // swallow
  }
}
