"use client";

// Client/mentor: danh sách giải đấu (ẩn giải nháp). Bấm vào để xem chi tiết.

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight, Trophy, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { listTournaments, countApprovedByTournament } from "@/lib/co-may/tournament-data";
import {
  METRIC_LABEL,
  TOURNAMENT_STATUS_LABEL,
  TOURNAMENT_STATUS_TONE,
  currencyLabel,
  formatCapitalRange,
  formatDateRange,
} from "@/lib/co-may/tournament-format";
import type { Tournament } from "@/lib/co-may/types";

type RoleSlug = "client" | "mentor";

export function GiaiDauListView({ role }: { role: RoleSlug }) {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const [list, c] = await Promise.all([listTournaments(), countApprovedByTournament()]);
      if (!mounted) return;
      setTournaments(list.filter((t) => t.status !== "draft"));
      setCounts(c);
      setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return <div className="text-sm text-muted-foreground py-10 text-center">Đang tải giải đấu...</div>;
  }

  if (tournaments.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-10 text-center space-y-2">
        <Trophy className="h-8 w-8 text-muted-foreground/50 mx-auto" />
        <p className="text-sm text-muted-foreground">Chưa có giải đấu nào đang mở.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {tournaments.map((t) => (
        <Link key={t.id} href={`/${role}/co-may/giai-dau/${t.id}`} className="block group">
          <Card className="overflow-hidden h-full transition-colors group-hover:border-primary/40">
            <CardContent className="pt-4 pb-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold text-base flex items-center gap-2 min-w-0">
                  <Trophy className="h-4 w-4 text-primary shrink-0" />
                  <span className="truncate">{t.title}</span>
                </h3>
                <Badge variant="outline" className={cn("text-[10px] shrink-0", TOURNAMENT_STATUS_TONE[t.status])}>
                  {TOURNAMENT_STATUS_LABEL[t.status]}
                </Badge>
              </div>

              {t.description && <p className="text-xs text-muted-foreground line-clamp-2">{t.description}</p>}

              <div className="space-y-1 text-xs text-muted-foreground">
                <div>Xếp hạng: <span className="text-foreground">{METRIC_LABEL[t.leaderboard_metric]}</span></div>
                <div>{currencyLabel(t.required_currency)} · Vốn {formatCapitalRange(t)}</div>
                <div>{formatDateRange(t)}</div>
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-border/60">
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <Users className="h-3 w-3" /> {counts[t.id] ?? 0} tham gia
                </span>
                <span className="inline-flex items-center gap-0.5 text-xs text-primary font-medium">
                  Xem chi tiết <ChevronRight className="h-3.5 w-3.5" />
                </span>
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
