"use client";

// Admin chi tiết giải: thông tin + sửa, duyệt đăng ký, leaderboard.

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Trophy } from "lucide-react";
import { useCurrentUser } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getTournament, computeLeaderboard } from "@/lib/co-may/tournament-data";
import {
  METRIC_LABEL,
  TOURNAMENT_STATUS_LABEL,
  TOURNAMENT_STATUS_TONE,
  currencyLabel,
  formatCapitalRange,
  formatDateRange,
} from "@/lib/co-may/tournament-format";
import { TournamentFormDialog } from "@/components/admin/giai-dau/tournament-form-dialog";
import { RegistrationApprovalList } from "@/components/admin/giai-dau/registration-approval-list";
import { LeaderboardTable } from "@/components/co-may/giai-dau/leaderboard-table";
import type { LeaderboardEntry, Tournament } from "@/lib/co-may/types";

export default function AdminTournamentDetail() {
  const admin = useCurrentUser("admin");
  const params = useParams();
  const tournamentId = String(params.tournamentId);
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [board, setBoard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const t = await getTournament(tournamentId);
    setTournament(t);
    setBoard(t ? await computeLeaderboard(t) : []);
    setLoading(false);
  }, [tournamentId]);

  useEffect(() => {
    load();
  }, [load]);

  if (!admin || loading) {
    return <div className="flex items-center justify-center min-h-[40vh] text-muted-foreground">Đang tải...</div>;
  }
  if (!tournament) {
    return (
      <div className="space-y-4">
        <Link href="/admin/giai-dau" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> Quay lại
        </Link>
        <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">Không tìm thấy giải đấu.</div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <Link href="/admin/giai-dau" className="inline-flex items-center gap-1.5 text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3 w-3" /> Giải đấu
      </Link>

      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold gold-gradient-text flex items-center gap-2">
            <Trophy className="h-6 w-6 text-primary" /> {tournament.title}
          </h1>
          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
            <Badge variant="outline" className={cn("text-[10px]", TOURNAMENT_STATUS_TONE[tournament.status])}>
              {TOURNAMENT_STATUS_LABEL[tournament.status]}
            </Badge>
            <span>Xếp hạng: <span className="text-foreground">{METRIC_LABEL[tournament.leaderboard_metric]}</span></span>
            <span>{currencyLabel(tournament.required_currency)}</span>
            <span>Vốn: <span className="text-foreground">{formatCapitalRange(tournament)}</span></span>
            <span>{formatDateRange(tournament)}</span>
          </div>
        </div>
        <TournamentFormDialog tournament={tournament} onSaved={load} />
      </div>

      {tournament.description && (
        <div className="rounded-xl border border-border bg-card/50 p-4 text-sm text-foreground/90 whitespace-pre-wrap">
          {tournament.description}
        </div>
      )}

      <section className="space-y-2">
        <h3 className="text-sm uppercase tracking-widest text-muted-foreground">Đăng ký tham gia</h3>
        <RegistrationApprovalList tournamentId={tournament.id} adminId={admin.id} onChanged={load} />
      </section>

      <section className="space-y-2">
        <h3 className="text-sm uppercase tracking-widest text-muted-foreground">Bảng xếp hạng</h3>
        <LeaderboardTable entries={board} metric={tournament.leaderboard_metric} />
      </section>
    </div>
  );
}
