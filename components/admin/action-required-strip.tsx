"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, UserPlus, ThumbsDown, ListPlus } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { fetchOverviewKpis } from "@/lib/admin/overview-api";
import { fetchChurnSnapshot } from "@/lib/admin/retention-api";
import { fetchNpsResponses } from "@/lib/admin/voc-api";

async function fetchPendingCount(): Promise<number> {
  const { count } = await supabase
    .from("apps_access")
    .select("user_id", { count: "exact", head: true })
    .eq("app", "comay")
    .eq("status", "pending");
  return count ?? 0;
}

/**
 * 4 cards với action — admin daily nhìn cái này là biết hôm nay cần làm gì.
 * Click → navigate sang trang xử lý.
 */
export function ActionRequiredStrip() {
  const overviewQ = useQuery({
    queryKey: ["admin", "overview", "kpis"],
    queryFn: fetchOverviewKpis,
  });
  const snapshotQ = useQuery({
    queryKey: ["admin", "retention", "snapshot"],
    queryFn: fetchChurnSnapshot,
  });
  const pendingQ = useQuery({
    queryKey: ["admin", "pending-count"],
    queryFn: fetchPendingCount,
  });
  const detractorsQ = useQuery({
    queryKey: ["admin", "priority", "detractors-count"],
    queryFn: async () => {
      const responses = await fetchNpsResponses(50);
      return responses.filter((r) => r.score <= 6).length;
    },
  });

  const atRisk = overviewQ.data?.at_risk_users.current ?? 0;
  const pending = pendingQ.data ?? 0;
  const detractors = detractorsQ.data ?? 0;
  const tradesToday = overviewQ.data?.trades_today.current ?? 0;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <ActionCard
        href="/admin/khach-hang"
        icon={UserPlus}
        label="Chờ duyệt"
        value={pending}
        hint={pending > 0 ? "cần action ngay" : "đã duyệt hết"}
        loading={pendingQ.isLoading}
        urgent={pending > 0}
        tone="gold"
      />
      <ActionCard
        href="/admin/khach-hang"
        icon={AlertTriangle}
        label="At-risk users"
        value={atRisk}
        hint="im lặng ≥7 ngày"
        loading={overviewQ.isLoading}
        urgent={atRisk > 0}
        tone="amber"
      />
      <ActionCard
        href="/admin/crm/voc"
        icon={ThumbsDown}
        label="Detractors NPS"
        value={detractors}
        hint="NPS ≤ 6 · follow up"
        loading={detractorsQ.isLoading}
        urgent={detractors > 0}
        tone="red"
      />
      <ActionCard
        href="#"
        icon={ListPlus}
        label="Trades today"
        value={tradesToday}
        hint="momentum hôm nay"
        loading={overviewQ.isLoading}
        urgent={false}
        tone="emerald"
      />
    </div>
  );
}

const toneClass: Record<string, { border: string; bg: string; iconBg: string; iconText: string; value: string }> = {
  gold: { border: "border-gold/40", bg: "bg-gold/5", iconBg: "bg-gold/15", iconText: "text-gold", value: "text-gold" },
  amber: { border: "border-amber-500/40", bg: "bg-amber-500/5", iconBg: "bg-amber-500/15", iconText: "text-amber-500", value: "text-amber-500" },
  red: { border: "border-red-500/40", bg: "bg-red-500/5", iconBg: "bg-red-500/15", iconText: "text-red-500", value: "text-red-500" },
  emerald: { border: "border-emerald-500/30", bg: "bg-emerald-500/5", iconBg: "bg-emerald-500/15", iconText: "text-emerald-500", value: "text-emerald-500" },
};

function ActionCard({
  href, icon: Icon, label, value, hint, loading, urgent, tone,
}: {
  href: string;
  icon: typeof AlertTriangle;
  label: string;
  value: number;
  hint: string;
  loading: boolean;
  urgent: boolean;
  tone: "gold" | "amber" | "red" | "emerald";
}) {
  const cls = toneClass[tone];
  const inner = (
    <Card className={cn("transition-all", urgent ? `${cls.border} ${cls.bg}` : "border-border")}>
      <CardContent className="pt-4 pb-3">
        <div className="flex items-center gap-2.5">
          <div className={cn("h-9 w-9 rounded-lg flex items-center justify-center shrink-0", cls.iconBg)}>
            <Icon className={cn("h-4 w-4", cls.iconText)} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
            <div className={cn("text-2xl font-extrabold tabular-nums leading-tight", urgent ? cls.value : "text-foreground")}>
              {loading ? <span className="inline-block w-10 h-7 rounded bg-muted/40 animate-pulse" /> : value}
            </div>
            <div className="text-[10px] text-muted-foreground/80">{hint}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
  return href === "#" ? inner : <Link href={href}>{inner}</Link>;
}
