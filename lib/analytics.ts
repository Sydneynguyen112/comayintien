"use client";

import { supabase } from "@/lib/supabase";
import { getStoredUserId } from "@/lib/auth";

const SESSION_KEY = "rova_session_id";
const LAST_ACTIVITY_KEY = "rova_last_activity";
const SESSION_STARTED_KEY = "rova_session_started_at";
const SESSION_IDLE_MS = 30 * 60 * 1000;

function getSessionId(): string {
  if (typeof window === "undefined") return "";
  const now = Date.now();
  const last = parseInt(localStorage.getItem(LAST_ACTIVITY_KEY) || "0");
  let sid = localStorage.getItem(SESSION_KEY);
  if (!sid || now - last > SESSION_IDLE_MS) {
    sid = `${now}-${Math.random().toString(36).slice(2, 9)}`;
    localStorage.setItem(SESSION_KEY, sid);
  }
  localStorage.setItem(LAST_ACTIVITY_KEY, now.toString());
  return sid;
}

/**
 * Track cardinal domain action. Fire-and-forget, swallow lỗi để không break UX.
 * Pass userId explicit khi gọi trong code không có context auth (vd background sync).
 */
export async function trackEvent(
  eventName: string,
  properties: Record<string, unknown> = {},
  explicitUserId?: string,
) {
  try {
    const userId = explicitUserId ?? getStoredUserId();
    if (!userId) return;
    await supabase.from("events").insert({
      user_id: userId,
      event_name: eventName,
      properties,
      session_id: getSessionId(),
    });
  } catch {
    // swallow
  }
}

/**
 * Track session_start nếu user idle >30 phút hoặc lần đầu trong session.
 * Gọi từ dashboard root effect mỗi navigation.
 */
export function maybeTrackSessionStart(userId: string) {
  if (typeof window === "undefined") return;
  const now = Date.now();
  const lastActivity = parseInt(localStorage.getItem(LAST_ACTIVITY_KEY) || "0");
  const sessionStarted = parseInt(localStorage.getItem(SESSION_STARTED_KEY) || "0");
  const isNewSession = !sessionStarted || now - lastActivity > SESSION_IDLE_MS;
  if (isNewSession) {
    localStorage.setItem(SESSION_STARTED_KEY, String(now));
    trackEvent(Events.SESSION_START, {}, userId);
  }
  localStorage.setItem(LAST_ACTIVITY_KEY, String(now));
}

export const Events = {
  USER_SIGNUP: "user_signup",
  USER_LOGIN: "user_login",
  SESSION_START: "session_start",
  TRADING_ACCOUNT_CREATED: "trading_account_created",
  TRADE_LOGGED: "trade_logged",
  TRADE_EDITED: "trade_edited",
  TRADE_DELETED: "trade_deleted",
  WITHDRAWAL_LOGGED: "withdrawal_logged",
  PAGE_VIEW: "page_view",
} as const;
