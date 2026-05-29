"use client";

// Admin: danh sách giải đấu + tạo/sửa/xoá. Drill vào chi tiết để duyệt đăng ký + leaderboard.

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight, Trash2, Trophy, Users } from "lucide-react";
import { useCurrentUser } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { listTournaments, countApprovedByTournament } from "@/lib/co-may/tournament-data";
import { deleteTournament } from "@/lib/co-may/tournament-actions";
import {
  METRIC_LABEL,
  TOURNAMENT_STATUS_LABEL,
  TOURNAMENT_STATUS_TONE,
  currencyLabel,
  formatCapitalRange,
  formatDateRange,
} from "@/lib/co-may/tournament-format";
import { TournamentFormDialog } from "@/components/admin/giai-dau/tournament-form-dialog";
import type { Tournament } from "@/lib/co-may/types";

export default function AdminGiaiDauPage() {
  const admin = useCurrentUser("admin");
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [list, c] = await Promise.all([listTournaments(), countApprovedByTournament()]);
    setTournaments(list);
    setCounts(c);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleDelete(t: Tournament) {
    if (!confirm(`Xoá giải "${t.title}" và toàn bộ đăng ký? Không khôi phục được.`)) return;
    const res = await deleteTournament(t.id);
    if (!res.success) {
      alert(`Xoá fail: ${res.error}`);
      return;
    }
    await loadData();
  }

  if (!admin) {
    return <div className="flex items-center justify-center min-h-[40vh] text-muted-foreground">Đang tải...</div>;
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" /> Quản lý giải đấu
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">{tournaments.length} giải đấu</p>
        </div>
        <TournamentFormDialog createdBy={admin.id} onSaved={loadData} />
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground py-10 text-center">Đang tải...</div>
      ) : tournaments.length === 0 ? (
        <Card>
          <CardContent className="pt-8 pb-8 text-center space-y-2">
            <p className="text-sm text-muted-foreground">Chưa có giải đấu nào.</p>
            <p className="text-xs text-muted-foreground/80">Bấm &ldquo;Tạo giải đấu&rdquo; để bắt đầu.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {tournaments.map((t) => (
            <Card key={t.id} className="overflow-hidden">
              <CardContent className="pt-4 pb-4 flex items-start gap-3">
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-base">{t.title}</span>
                    <Badge variant="outline" className={cn("text-[10px]", TOURNAMENT_STATUS_TONE[t.status])}>
                      {TOURNAMENT_STATUS_LABEL[t.status]}
                    </Badge>
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <Users className="h-3 w-3" /> {counts[t.id] ?? 0} tham gia
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                    <span>Xếp hạng: <span className="text-foreground">{METRIC_LABEL[t.leaderboard_metric]}</span></span>
                    <span>{currencyLabel(t.required_currency)}</span>
                    <span>Vốn: <span className="text-foreground">{formatCapitalRange(t)}</span></span>
                    <span>{formatDateRange(t)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <TournamentFormDialog tournament={t} onSaved={loadData} />
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(t)} className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                  <Link href={`/admin/giai-dau/${t.id}`}>
                    <Button variant="outline" size="sm">
                      Chi tiết <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
