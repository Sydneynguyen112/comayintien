// Per-user feature-flag store. Mock layer: localStorage persist + module-level cache + subscribe.
// Replace with Supabase `user_features` table khi wire backend (see follow-up plan).
//
// Default policy: empty set → admin phải bật từng quyền cho học viên.
// Admin role có override luôn TRUE để demo / không khoá chính họ.

import { Coins, type LucideIcon } from "lucide-react";

export type FeatureId = "money_machine";

export interface FeatureDefinition {
  id: FeatureId;
  label: string;
  description: string;
  icon: LucideIcon;
  /** Plan add-on price (VND/month). Hiển thị trong admin UI để biết quyền nào trả phí. */
  priceVndMonthly?: number;
}

export const FEATURES: FeatureDefinition[] = [
  {
    id: "money_machine",
    label: "Cỗ Máy Trading",
    description:
      "Module quản trị kỷ luật rút tiền — KPI, matrix hiệu suất, anchor, withdraw celebration, báo cáo chu kỳ.",
    icon: Coins,
    priceVndMonthly: 1_990_000,
  },
];

export const FEATURE_BY_ID: Record<FeatureId, FeatureDefinition> = Object.fromEntries(
  FEATURES.map((f) => [f.id, f]),
) as Record<FeatureId, FeatureDefinition>;

const STORAGE_KEY = "rova_user_features_v1";

type Store = Record<string, FeatureId[]>;

let cache: Store | null = null;
const listeners = new Set<() => void>();

function isBrowser() {
  return typeof window !== "undefined";
}

function load(): Store {
  if (cache) return cache;
  if (!isBrowser()) {
    cache = {};
    return cache;
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    cache = raw ? (JSON.parse(raw) as Store) : {};
  } catch {
    cache = {};
  }
  return cache;
}

function persist() {
  if (!isBrowser() || !cache) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
  } catch {
    // quota / private mode — non-fatal
  }
}

function notify() {
  for (const fn of listeners) fn();
}

export function getUserFeatures(userId: string): FeatureId[] {
  const store = load();
  return store[userId] ?? [];
}

export function hasFeature(userId: string, feature: FeatureId, role?: string | null): boolean {
  // Admin override — không bao giờ tự khoá quyền của admin.
  if (role === "admin" || userId.startsWith("u-admin")) return true;
  return getUserFeatures(userId).includes(feature);
}

export function setFeature(userId: string, feature: FeatureId, enabled: boolean): void {
  const store = load();
  const current = new Set(store[userId] ?? []);
  if (enabled) current.add(feature);
  else current.delete(feature);
  if (current.size === 0) delete store[userId];
  else store[userId] = [...current];
  persist();
  // Cloud push (fire-and-forget)
  void import("@/lib/co-may/cloud-sync").then(({ cloudPush }) =>
    cloudPush.feature(userId, feature, enabled),
  );
  notify();
}

/** Subscribe để re-render khi store thay đổi. Trả về unsubscribe fn. */
export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
