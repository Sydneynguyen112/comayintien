// Onboarding setup state cho Cỗ Máy. Mỗi user phải hoàn tất wizard 3-bước trước
// khi xem Phòng điều hành. Mock layer: localStorage. Sẽ thay bằng Supabase
// `user_setup` table khi wire backend.

import { addMachine } from "./mock-data";
import { cloudPush } from "./cloud-sync";

export type StrategyId = "concentrated" | "balanced" | "diversified" | "later";

export interface SetupConfig {
  totalCapital: number;
  strategy: StrategyId;
  allocations: { name: string; capital: number; anchor_milestones?: number[] }[];
  completedAt: string;
  /** Tổng tiền đã nạp lại từ dòng tiền đã rút — trừ vào khi hiển thị `Dòng tiền đã rút`. */
  injectedFromWithdrawn?: number;
}

const STORAGE_KEY = "rova_comay_setup_v1";
const cache = new Map<string, SetupConfig>();
const listeners = new Set<() => void>();

function isBrowser() {
  return typeof window !== "undefined";
}

function loadAll(): Record<string, SetupConfig> {
  if (!isBrowser()) return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, SetupConfig>) : {};
  } catch {
    return {};
  }
}

function persistAll(all: Record<string, SetupConfig>) {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {
    /* quota / private mode */
  }
}

function notify() {
  for (const fn of listeners) fn();
}

export function getSetup(userId: string): SetupConfig | null {
  if (cache.has(userId)) return cache.get(userId)!;
  const all = loadAll();
  if (all[userId]) {
    cache.set(userId, all[userId]);
    return all[userId];
  }
  return null;
}

export function hasCompletedSetup(userId: string, role?: string | null): boolean {
  // Admin/mentor không cần setup — họ chỉ xem dữ liệu, không phải trader.
  if (role === "admin" || role === "mentor") return true;
  return getSetup(userId) !== null;
}

export function saveSetup(
  userId: string,
  config: Omit<SetupConfig, "completedAt">,
): SetupConfig {
  const full: SetupConfig = { ...config, completedAt: new Date().toISOString() };
  const all = loadAll();
  all[userId] = full;
  persistAll(all);
  cache.set(userId, full);

  // Sinh machines theo phân bổ — chỉ tạo nếu user chưa có (tránh duplicate khi
  // user reset setup nhiều lần). addMachine tự gọi cloudPush.
  for (const a of config.allocations) {
    addMachine(userId, {
      name: a.name,
      capital: a.capital,
      current_anchor: a.capital, // anchor khởi đầu = vốn ban đầu
      anchor_milestones: a.anchor_milestones,
    });
  }

  cloudPush.setup(userId, full);
  notify();
  return full;
}

export function resetSetup(userId: string): void {
  const all = loadAll();
  delete all[userId];
  persistAll(all);
  cache.delete(userId);
  notify();
}

/** Cộng/trừ vào tổng vốn doanh chủ (vd: khi đóng cỗ máy → cộng balance). */
export function adjustTotalCapital(userId: string, delta: number): void {
  const all = loadAll();
  const current = all[userId];
  if (!current) return;
  const updated: SetupConfig = { ...current, totalCapital: current.totalCapital + delta };
  all[userId] = updated;
  persistAll(all);
  cache.set(userId, updated);
  cloudPush.setup(userId, updated);
  notify();
}

/** Ghi nhận tiền nạp lại từ dòng tiền đã rút — giảm display `Dòng tiền đã rút`. */
export function addInjectedFromWithdrawn(userId: string, amount: number): void {
  if (amount <= 0) return;
  const all = loadAll();
  const current = all[userId];
  if (!current) return;
  const updated: SetupConfig = {
    ...current,
    injectedFromWithdrawn: (current.injectedFromWithdrawn ?? 0) + amount,
  };
  all[userId] = updated;
  persistAll(all);
  cache.set(userId, updated);
  cloudPush.setup(userId, updated);
  notify();
}

/** Phân bổ thêm machines từ phần vốn dự trữ — không reset setup. */
export function allocateMore(
  userId: string,
  newAllocations: { name: string; capital: number }[],
): void {
  for (const a of newAllocations) {
    if (a.capital <= 0 || !a.name.trim()) continue;
    addMachine(userId, {
      name: a.name,
      capital: a.capital,
      current_anchor: a.capital,
    });
  }
  notify();
}

export function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// ── Strategy catalog (consumed bởi setup-wizard step 2) ──
export const STRATEGIES: Array<{
  id: StrategyId;
  number: string;
  title: string;
  desc: string;
  machineCount: number;
}> = [
  {
    id: "concentrated",
    number: "01",
    title: "Tập trung",
    desc: "Một cỗ máy duy nhất với 100% vốn. Phù hợp người mới.",
    machineCount: 1,
  },
  {
    id: "balanced",
    number: "02",
    title: "Cân bằng",
    desc: "Hai cỗ máy, 60/40. Bắt đầu đa dạng hoá.",
    machineCount: 2,
  },
  {
    id: "diversified",
    number: "03",
    title: "Đa dạng",
    desc: "Ba cỗ máy. Phù hợp doanh chủ có kinh nghiệm.",
    machineCount: 3,
  },
  {
    id: "later",
    number: "—",
    title: "Để sau",
    desc: "Chỉ thiết lập vốn. Tự tạo cỗ máy sau.",
    machineCount: 0,
  },
];

export const QUICK_CAPITAL_CHIPS = [500, 1000, 3000, 5000, 10000];
