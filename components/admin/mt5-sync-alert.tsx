"use client";

// Cảnh báo Admin khi tiến trình đồng bộ MT5 (sync_daemon / EA) ngừng cập nhật.
// Tín hiệu "daemon còn sống" = last_synced_at MỚI NHẤT trên toàn bộ tài khoản
// (daemon quét theo lô nên mọi account update gần cùng lúc). Nếu mốc này cũ hơn
// ngưỡng → banner đỏ/vàng để admin biết phải kiểm tra VPS, không phải đợi phát hiện thủ công.

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Clock, RefreshCcw } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

// Daemon poll ~5 phút/lần → >10' là chậm, >30' gần như chắc chắn đã dừng.
const WARN_MIN = 10;
const CRIT_MIN = 30;
const POLL_MS = 60_000;

interface AccRow {
  status: string;
  last_synced_at: string | null;
}

function minutesSince(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
}

function humanSince(iso: string): string {
  const m = minutesSince(iso);
  if (m < 1) return "vừa xong";
  if (m < 60) return `${m} phút trước`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} giờ trước`;
  return `${Math.floor(h / 24)} ngày trước`;
}

function absVN(iso: string): string {
  return new Date(iso).toLocaleString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
  });
}

export function Mt5SyncAlert({ hideWhenOk = false }: { hideWhenOk?: boolean } = {}) {
  const [rows, setRows] = useState<AccRow[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    const { data } = await supabase.from("mt5_accounts").select("status, last_synced_at");
    setRows((data ?? []) as AccRow[]);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, POLL_MS);
    return () => clearInterval(t);
  }, [load]);

  if (!rows) return null; // chưa load xong — không chớp banner

  // Bỏ qua account đã tắt; đếm theo trạng thái.
  const live = rows.filter((r) => r.status !== "disabled");
  const counts = {
    active: live.filter((r) => r.status === "active").length,
    error: live.filter((r) => r.status === "error").length,
    pending: live.filter((r) => r.status === "pending").length,
  };

  // Mốc sync mới nhất (account nào đó đã từng sync).
  const synced = live
    .map((r) => r.last_synced_at)
    .filter((s): s is string => !!s)
    .sort((a, b) => b.localeCompare(a));
  const freshest = synced[0] ?? null;

  // Chưa từng có account nào sync → trạng thái trung tính.
  if (!freshest) {
    if (live.length === 0) return null; // không có account nào → không cần cảnh báo
    return (
      <Banner
        tone="warn"
        icon={Clock}
        title="MT5 chưa từng đồng bộ"
        detail={`${live.length} tài khoản đang chờ — kiểm tra sync_daemon trên VPS đã chạy chưa.`}
        counts={counts}
        onRefresh={load}
        refreshing={refreshing}
      />
    );
  }

  const mins = minutesSince(freshest);
  const tone = mins > CRIT_MIN ? "crit" : mins > WARN_MIN ? "warn" : "ok";

  if (tone === "ok") {
    if (hideWhenOk) return null; // dùng cho banner toàn cục — chỉ hiện khi có vấn đề
    return (
      <Banner
        tone="ok"
        icon={CheckCircle2}
        title="MT5 đang đồng bộ bình thường"
        detail={`Cập nhật ${humanSince(freshest)} (${absVN(freshest)}).`}
        counts={counts}
        onRefresh={load}
        refreshing={refreshing}
      />
    );
  }

  return (
    <Banner
      tone={tone}
      icon={AlertTriangle}
      title={
        tone === "crit"
          ? "MT5 đã NGỪNG đồng bộ"
          : "MT5 đồng bộ chậm bất thường"
      }
      detail={
        tone === "crit"
          ? `Lần sync cuối ${humanSince(freshest)} (${absVN(freshest)}). Tiến trình sync_daemon trên VPS có thể đã dừng — kiểm tra VPS còn bật, tiến trình còn chạy, MT5 còn login broker.`
          : `Lần sync cuối ${humanSince(freshest)} (${absVN(freshest)}). Theo dõi — nếu vượt ${CRIT_MIN} phút thì daemon nhiều khả năng đã dừng.`
      }
      counts={counts}
      onRefresh={load}
      refreshing={refreshing}
    />
  );
}

const TONE_CLS: Record<string, string> = {
  ok: "border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300",
  warn: "border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-300",
  crit: "border-red-500/50 bg-red-500/10 text-red-800 dark:text-red-300",
};

function Banner({
  tone,
  icon: Icon,
  title,
  detail,
  counts,
  onRefresh,
  refreshing,
}: {
  tone: "ok" | "warn" | "crit";
  icon: typeof AlertTriangle;
  title: string;
  detail: string;
  counts: { active: number; error: number; pending: number };
  onRefresh: () => void;
  refreshing: boolean;
}) {
  return (
    <div className={cn("rounded-xl border px-4 py-3 flex items-start gap-3", TONE_CLS[tone])}>
      <Icon className={cn("h-5 w-5 shrink-0 mt-0.5", tone === "crit" && "animate-pulse")} />
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold text-sm">{title}</span>
          <span className="text-[11px] opacity-80 tabular-nums">
            {counts.active} đang sync · {counts.error} lỗi · {counts.pending} chờ
          </span>
        </div>
        <p className="text-xs leading-snug opacity-90">{detail}</p>
      </div>
      <button
        type="button"
        onClick={onRefresh}
        disabled={refreshing}
        className="text-[11px] inline-flex items-center gap-1 opacity-70 hover:opacity-100 disabled:opacity-40 shrink-0"
        title="Kiểm tra lại"
      >
        <RefreshCcw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
      </button>
    </div>
  );
}
