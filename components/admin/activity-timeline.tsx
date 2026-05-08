"use client";

import { useEffect, useState } from "react";
import { LogIn, MousePointerClick, Coins, Activity } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

interface EventRow {
  id: string;
  type: string;
  path: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

const eventConfig: Record<string, { icon: typeof Activity; label: string; tone: string }> = {
  login: { icon: LogIn, label: "Đăng nhập", tone: "text-emerald-500" },
  page_view: { icon: MousePointerClick, label: "Xem trang", tone: "text-blue-500" },
  machine_open: { icon: Coins, label: "Mở cỗ máy", tone: "text-gold" },
  machine_action: { icon: Coins, label: "Thao tác cỗ máy", tone: "text-amber-500" },
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "vừa xong";
  if (min < 60) return `${min}p trước`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h trước`;
  const day = Math.floor(hr / 24);
  return `${day} ngày trước`;
}

interface Props {
  userId: string;
  limit?: number;
}

export function ActivityTimeline({ userId, limit = 30 }: Props) {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("activity_events")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(limit);
      setEvents((data ?? []) as EventRow[]);
      setLoading(false);
    })();
  }, [userId, limit]);

  if (loading) {
    return <p className="text-sm text-muted-foreground py-4 text-center">Đang tải...</p>;
  }
  if (events.length === 0) {
    return <p className="text-sm text-muted-foreground py-6 text-center">Chưa có hoạt động.</p>;
  }

  return (
    <div className="space-y-1.5 max-h-96 overflow-y-auto pr-1">
      {events.map((e) => {
        const cfg = eventConfig[e.type] ?? { icon: Activity, label: e.type, tone: "text-foreground" };
        const Icon = cfg.icon;
        return (
          <div
            key={e.id}
            className="flex items-start gap-2.5 px-2 py-2 rounded-lg hover:bg-muted/40 transition-colors"
          >
            <Icon className={cn("h-3.5 w-3.5 mt-0.5 shrink-0", cfg.tone)} />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-foreground">
                {cfg.label}
                {e.path && <span className="text-muted-foreground font-normal ml-1.5 text-xs">{e.path}</span>}
              </div>
              <div className="text-[11px] text-muted-foreground">{timeAgo(e.created_at)}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
