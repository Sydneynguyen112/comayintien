"use client";

// Client/mentor chi tiết giải: rules + leaderboard + (client) đăng ký / trạng thái đăng ký.

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Clock, Trophy, XCircle } from "lucide-react";
import { useCurrentUser } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getTournament, computeLeaderboard, getUserRegistration } from "@/lib/co-may/tournament-data";
import {
  METRIC_LABEL,
  TOURNAMENT_STATUS_LABEL,
  TOURNAMENT_STATUS_TONE,
  currencyLabel,
  formatCapitalRange,
  formatDateRange,
} from "@/lib/co-may/tournament-format";
import { LeaderboardTable } from "./leaderboard-table";
import { RegisterDialog } from "./register-dialog";
import type { LeaderboardEntry, Tournament, TournamentRegistration } from "@/lib/co-may/types";

type RoleSlug = "client" | "mentor";

export function GiaiDauDetailView({ role, tournamentId }: { role: RoleSlug; tournamentId: string }) {
  const user = useCurrentUser(role === "client" ? "student" : "mentor");
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [board, setBoard] = useState<LeaderboardEntry[]>([]);
  const [myReg, setMyReg] = useState<TournamentRegistration | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const t = await getTournament(tournamentId);
    setTournament(t);
    if (t) {
      const [b, reg] = await Promise.all([
        computeLeaderboard(t),
        user ? getUserRegistration(t.id, user.id) : Promise.resolve(null),
      ]);
      setBoard(b);
      setMyReg(reg);
    }
    setLoading(false);
  }, [tournamentId, user]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <div className="text-sm text-muted-foreground py-10 text-center">Đang tải...</div>;

  if (!tournament) {
    return (
      <div className="space-y-4">
        <Link href={`/${role}/co-may/giai-dau`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> Quay lại
        </Link>
        <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">Không tìm thấy giải đấu.</div>
      </div>
    );
  }

  const canRegister = role === "client" && tournament.status === "open" && !myReg && !!user;

  return (
    <div className="space-y-5">
      <Link href={`/${role}/co-may/giai-dau`} className="inline-flex items-center gap-1.5 text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground">
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
            <span>{formatDateRange(tournament)}</span>
          </div>
        </div>
        {canRegister && <RegisterDialog tournament={tournament} userId={user!.id} onRegistered={load} />}
      </div>

      {/* Trạng thái đăng ký của khách */}
      {role === "client" && myReg && <MyRegistrationBanner reg={myReg} role={role} />}

      {/* Rules */}
      <section className="rounded-2xl border border-border bg-card p-5 space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Thể lệ &amp; điều kiện</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
          <RuleItem label="Loại tài khoản" value={currencyLabel(tournament.required_currency)} />
          <RuleItem label="Vốn cho phép" value={formatCapitalRange(tournament)} />
          <RuleItem label="Thời gian" value={formatDateRange(tournament)} />
        </div>
        {tournament.description && (
          <div className="pt-2 border-t border-border/60 text-sm text-foreground/90 whitespace-pre-wrap">
            {tournament.description}
          </div>
        )}
      </section>

      {/* Leaderboard */}
      <section className="space-y-2">
        <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Bảng xếp hạng</h3>
        <LeaderboardTable entries={board} metric={tournament.leaderboard_metric} />
      </section>
    </div>
  );
}

function MyRegistrationBanner({ reg, role }: { reg: TournamentRegistration; role: RoleSlug }) {
  const map = {
    pending: { icon: Clock, tone: "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400", text: "Đăng ký của bạn đang chờ admin duyệt." },
    approved: { icon: CheckCircle2, tone: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400", text: "Bạn đang tham gia giải này. Giao dịch trên cỗ máy đã đăng ký để leo hạng!" },
    rejected: { icon: XCircle, tone: "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400", text: `Đăng ký bị từ chối${reg.reject_reason ? `: ${reg.reject_reason}` : "."}` },
  } as const;
  const cfg = map[reg.status];
  const Icon = cfg.icon;
  return (
    <div className={cn("rounded-xl border px-4 py-3 text-sm flex items-start gap-2", cfg.tone)}>
      <Icon className="h-4 w-4 mt-0.5 shrink-0" />
      <div className="flex-1">
        {cfg.text}{" "}
        {reg.status === "approved" && (
          <Link href={`/${role}/co-may/quan-ly/${reg.machine_id}`} className="underline underline-offset-2">
            Mở cỗ máy
          </Link>
        )}
      </div>
    </div>
  );
}

function RuleItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-muted/20 px-3 py-2">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="font-medium text-foreground">{value}</div>
    </div>
  );
}
