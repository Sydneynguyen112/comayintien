"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Crown, ThumbsDown, ChevronRight } from "lucide-react";
import { formatDistanceToNow, parseISO } from "date-fns";
import { vi } from "date-fns/locale";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { fetchAtRiskUsers } from "@/lib/admin/retention-api";
import { fetchTopHabitUsers } from "@/lib/admin/engagement-api";
import { fetchNpsResponses } from "@/lib/admin/voc-api";

const reasonShort: Record<string, string> = {
  frequency_drop: "Giảm tần suất",
  silent_active_user: "Im lặng",
  low_activation: "Chưa activate",
};

export function PriorityCustomerLists() {
  const atRiskQ = useQuery({
    queryKey: ["admin", "priority", "at-risk"],
    queryFn: fetchAtRiskUsers,
  });
  const powerQ = useQuery({
    queryKey: ["admin", "priority", "power"],
    queryFn: () => fetchTopHabitUsers(5),
  });
  const npsQ = useQuery({
    queryKey: ["admin", "priority", "detractors"],
    queryFn: () => fetchNpsResponses(20),
  });

  const detractors = (npsQ.data ?? []).filter((r) => r.score <= 6).slice(0, 5);
  const atRiskTop = (atRiskQ.data ?? []).slice(0, 5);
  const powerTop = (powerQ.data ?? []).slice(0, 5);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
      {/* At-Risk Top 5 */}
      <Card className="border-amber-500/30">
        <CardContent className="pt-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <h3 className="text-sm font-semibold text-foreground">At-risk · cần liên hệ</h3>
            </div>
            <Link
              href="/admin/khach-hang"
              className="text-[11px] text-gold hover:underline flex items-center gap-0.5"
            >
              Xem tất cả <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
          {atRiskQ.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-10 rounded bg-muted/30 animate-pulse" />
              ))}
            </div>
          ) : atRiskTop.length === 0 ? (
            <p className="text-xs text-muted-foreground py-6 text-center">
              🎉 Không có user at-risk
            </p>
          ) : (
            <div className="space-y-1.5">
              {atRiskTop.map((u) => (
                <Link
                  key={u.user_id}
                  href={`/admin/khach-hang/${u.user_id}`}
                  className="flex items-start gap-2 p-2 rounded-lg hover:bg-amber-500/5 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-foreground truncate">{u.full_name}</div>
                    <div className="flex flex-wrap items-center gap-1 mt-0.5">
                      {u.risk_reasons.slice(0, 2).map((r) => (
                        <Badge key={r} variant="outline" className="text-[10px] bg-amber-500/10 text-amber-600 border-amber-500/30">
                          {reasonShort[r] ?? r}
                        </Badge>
                      ))}
                      <span className="text-[10px] text-muted-foreground">· {u.days_inactive}d im lặng</span>
                    </div>
                  </div>
                  {u.last_action_at && (
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[9px] shrink-0">
                      ✓ logged
                    </Badge>
                  )}
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Power Users Top 5 */}
      <Card className="border-gold/30">
        <CardContent className="pt-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Crown className="h-4 w-4 text-gold" />
              <h3 className="text-sm font-semibold text-foreground">Top user · nuôi dưỡng</h3>
            </div>
          </div>
          {powerQ.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-10 rounded bg-muted/30 animate-pulse" />
              ))}
            </div>
          ) : powerTop.length === 0 ? (
            <p className="text-xs text-muted-foreground py-6 text-center">
              Chưa có user nào có habit score.
            </p>
          ) : (
            <div className="space-y-1.5">
              {powerTop.map((u, i) => (
                <Link
                  key={u.user_id}
                  href={`/admin/khach-hang/${u.user_id}`}
                  className="flex items-center gap-2 p-2 rounded-lg hover:bg-gold/5 transition-colors"
                >
                  <span className={cn(
                    "text-xs font-bold w-5 text-center shrink-0",
                    i === 0 ? "text-gold" : i < 3 ? "text-foreground" : "text-muted-foreground",
                  )}>
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-foreground truncate">{u.full_name}</div>
                    <div className="text-[10px] text-muted-foreground truncate">{u.email}</div>
                  </div>
                  <div className="text-sm font-bold text-gold tabular-nums shrink-0">
                    {Number(u.total_score).toFixed(0)}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detractors Top 5 */}
      <Card className="border-red-500/30">
        <CardContent className="pt-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <ThumbsDown className="h-4 w-4 text-red-500" />
              <h3 className="text-sm font-semibold text-foreground">Detractor mới · follow up</h3>
            </div>
            <Link
              href="/admin/crm/voc"
              className="text-[11px] text-gold hover:underline flex items-center gap-0.5"
            >
              Xem VOC <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
          {npsQ.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-10 rounded bg-muted/30 animate-pulse" />
              ))}
            </div>
          ) : detractors.length === 0 ? (
            <p className="text-xs text-muted-foreground py-6 text-center">
              Chưa có detractor (NPS ≤ 6).
            </p>
          ) : (
            <div className="space-y-1.5">
              {detractors.map((r) => (
                <Link
                  key={r.id}
                  href={`/admin/khach-hang/${r.user_id}`}
                  className="flex items-start gap-2 p-2 rounded-lg hover:bg-red-500/5 transition-colors"
                >
                  <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/30 text-[10px] font-bold shrink-0">
                    {r.score}/10
                  </Badge>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-foreground truncate">{r.full_name}</div>
                    {r.reason && (
                      <div className="text-[11px] text-muted-foreground italic line-clamp-1">
                        &ldquo;{r.reason}&rdquo;
                      </div>
                    )}
                    <div className="text-[10px] text-muted-foreground">
                      {formatDistanceToNow(parseISO(r.created_at), { addSuffix: true, locale: vi })}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
