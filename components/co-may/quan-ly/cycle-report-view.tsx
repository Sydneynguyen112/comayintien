"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useCurrentUser } from "@/lib/auth";
import { getReportById, getUserScope } from "@/lib/co-may/mock-data";
import { cn } from "@/lib/utils";
import type { CycleReport } from "@/lib/co-may/types";
import { formatMoney } from "@/lib/co-may/currency";
import { Button } from "@/components/ui/button";

const DAY_MS = 86400_000;

const DECISION_LABEL: Record<string, string> = {
  scale: "SCALE",
  reset: "TIẾP TỤC",
  close: "ĐÓNG",
};

type RoleSlug = "client" | "mentor" | "admin";

export function CycleReportView({
  role,
  reportId,
  ownerId,
}: {
  role: RoleSlug;
  reportId: string;
  ownerId?: string;
}) {
  const user = useCurrentUser(role);

  const report = useMemo<{ r: CycleReport; resolvedOwner: string } | null>(() => {
    if (!user) return null;
    const scope = getUserScope(role, user.id);
    const candidates = ownerId && scope.includes(ownerId) ? [ownerId] : [user.id, ...scope];
    for (const id of candidates) {
      const r = getReportById(id, reportId);
      if (r) return { r, resolvedOwner: id };
    }
    return null;
  }, [user, role, reportId, ownerId]);

  if (!user) return <div className="text-sm text-muted-foreground">Đang tải...</div>;
  if (!report) {
    return (
      <div className="space-y-4">
        <Link
          href={`/${role}/co-may/quan-ly`}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Quay lại
        </Link>
        <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          Không tìm thấy báo cáo.
        </div>
      </div>
    );
  }

  const { r, resolvedOwner } = report;
  const fmt = (n: number) => formatMoney(n, r.currency_unit);
  const days = Math.max(
    1,
    Math.floor((new Date(r.end_date).getTime() - new Date(r.start_date).getTime()) / DAY_MS),
  );
  const trades = r.trade_count ?? 0;
  const wr = trades > 0 ? Math.round(((r.win_count ?? 0) / trades) * 100) : 0;
  const winSum = (r.peak_pnl ?? 0) > 0 ? r.peak_pnl ?? 0 : 0;
  // R:R approx — fallback 0 nếu thiếu dữ liệu
  const rrAvg = 0; // không lưu chi tiết wins/losses trong report → để trống nếu không có
  const startCap = r.starting_capital ?? 0;
  const growth = startCap > 0 && r.pnl ? (r.pnl / startCap) * 100 : 0;
  const ddPct = startCap > 0 ? Math.abs((r.max_drawdown ?? 0) / startCap) * 100 : 0;
  const reflection = r.reflection;
  const hasReflection = !!(
    reflection &&
    (reflection.van_hanh_dung_thiet_ke ||
      reflection.bai_hoc_lon_nhat ||
      reflection.dieu_chinh_chu_ky_tiep)
  );

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <div>
        <Link
          href={`/${role}/co-may/lich-su`}
          className="inline-flex items-center gap-1.5 text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3" />
          Báo cáo / {r.machine_name ?? "Cỗ máy"}
        </Link>
        <div className="flex items-start justify-between flex-wrap gap-3 mt-2">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold">
              <span className="text-foreground italic">Chu kỳ</span>{" "}
              <span className="gold-gradient-text">{r.machine_name ?? ""}</span>
            </h1>
            <p className="text-xs uppercase tracking-widest text-muted-foreground mt-1 tabular-nums">
              {formatDmy(r.start_date)} <span className="mx-1">→</span> {formatDmy(r.end_date)} ·{" "}
              {days} ngày {r.machine_method ? `· ${r.machine_method}` : ""}
            </p>
          </div>
          <span className="rounded-md bg-primary/15 border border-primary/40 px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-primary tabular-nums">
            Quyết định: {DECISION_LABEL[r.decision] ?? r.decision}
          </span>
        </div>
        <div className="border-b border-border mt-3" />
      </div>

      {/* KPI grid 4x2 */}
      <div className="rounded-2xl border-2 border-border overflow-hidden">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-border">
          <Tile label="Vốn đầu" value={fmt(startCap)} />
          <Tile label="Vốn cuối" value={fmt(r.ending_balance ?? 0)} />
          <Tile label="Đã rút" value={fmt(r.withdrawn ?? 0)} />
          <Tile
            dark
            label="Tăng trưởng"
            value={`${growth >= 0 ? "+" : ""}${growth.toFixed(1)}%`}
            tone={growth > 0 ? "profit" : growth < 0 ? "loss" : undefined}
          />
          <Tile label="Lệnh" value={String(trades)} />
          <Tile label="Winrate" value={`${wr}%`} />
          <Tile label="R:R" value={rrAvg > 0 ? rrAvg.toFixed(2) : "—"} />
          <Tile
            label="Max drawdown"
            value={`${(r.max_drawdown ?? 0) <= 0 ? "" : "+"}${fmt(r.max_drawdown ?? 0)} (${ddPct.toFixed(1)}%)`}
          />
        </div>
      </div>

      {/* Scorecard + Reflection */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <section className="rounded-2xl border-2 border-border bg-card p-5 space-y-3">
          <h3 className="text-base md:text-lg font-bold italic text-foreground">
            Scorecard <span className="gold-gradient-text not-italic">4 lens</span>
          </h3>
          <div className="border-t border-dashed border-border pt-3 flex justify-center">
            {r.scorecard ? (
              <RadarSvg sc={r.scorecard} />
            ) : (
              <span className="text-sm italic text-muted-foreground">Không có scorecard.</span>
            )}
          </div>
        </section>

        <section className="md:col-span-2 rounded-2xl border-2 border-border bg-card p-5 space-y-3">
          <h3 className="text-base md:text-lg font-bold italic text-foreground">Phản tư</h3>
          <div className="border-t border-dashed border-border pt-3 space-y-4">
            {!hasReflection ? (
              <p className="text-sm italic text-muted-foreground">Không có ghi chú phản tư.</p>
            ) : (
              <>
                <ReflectItem q="Cỗ máy có vận hành đúng thiết kế?" a={reflection?.van_hanh_dung_thiet_ke} />
                <ReflectItem q="Bài học lớn nhất?" a={reflection?.bai_hoc_lon_nhat} />
                <ReflectItem q="Điều chỉnh cho chu kỳ tiếp?" a={reflection?.dieu_chinh_chu_ky_tiep} />
              </>
            )}
          </div>
        </section>
      </div>

      <div className="flex items-center gap-2 flex-wrap pt-2">
        {r.next_machine_id ? (
          <Link
            href={`/${role}/co-may/quan-ly/${r.next_machine_id}?owner=${resolvedOwner}`}
          >
            <Button variant="outline">
              Về cỗ máy <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        ) : null}
        <Link href={`/${role}/co-may/quan-ly`}>
          <Button variant="outline">
            <ArrowLeft className="h-3.5 w-3.5" /> Danh sách
          </Button>
        </Link>
      </div>
    </div>
  );
}

function Tile({
  label,
  value,
  tone,
  dark,
}: {
  label: string;
  value: string;
  tone?: "profit" | "loss";
  dark?: boolean;
}) {
  return (
    <div
      className={cn(
        "p-4 md:p-5 space-y-1.5",
        dark ? "bg-foreground text-background" : "bg-card",
      )}
    >
      <div
        className={cn(
          "text-[10px] font-bold uppercase tracking-widest",
          dark ? "text-background/60" : "text-muted-foreground",
        )}
      >
        {label}
      </div>
      <div
        className={cn(
          "text-xl md:text-2xl font-bold tabular-nums",
          tone === "profit" && (dark ? "text-[#5C9C75]" : "text-[#3B6C4F] dark:text-[#5C9C75]"),
          tone === "loss" && "text-foreground",
          !tone && (dark ? "text-background" : "text-foreground"),
        )}
      >
        {value}
      </div>
    </div>
  );
}

function ReflectItem({ q, a }: { q: string; a?: string }) {
  if (!a || !a.trim()) return null;
  return (
    <div className="space-y-1">
      <p className="text-xs uppercase tracking-widest text-muted-foreground">{q}</p>
      <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">{a}</p>
    </div>
  );
}

function RadarSvg({ sc }: { sc: NonNullable<CycleReport["scorecard"]> }) {
  const max = 10;
  const cx = 100;
  const cy = 100;
  const radius = 80;
  const axes = [
    { label: "Kỷ luật", value: sc.ky_luat, x: cx, y: cy - radius },
    { label: "Thực thi", value: sc.thuc_thi, x: cx + radius, y: cy },
    { label: "Rủi ro", value: sc.rui_ro, x: cx, y: cy + radius },
    { label: "Học hỏi", value: sc.hoc_hoi, x: cx - radius, y: cy },
  ];
  const points = axes
    .map((a) => {
      const r = (a.value / max) * radius;
      const dx = (a.x - cx) * (r / radius);
      const dy = (a.y - cy) * (r / radius);
      return `${cx + dx},${cy + dy}`;
    })
    .join(" ");
  return (
    <svg
      viewBox="-40 -30 280 260"
      className="w-full max-w-[300px] h-auto overflow-visible"
    >
      {[0.25, 0.5, 0.75, 1].map((r, i) => (
        <polygon
          key={i}
          points={[
            `${cx},${cy - radius * r}`,
            `${cx + radius * r},${cy}`,
            `${cx},${cy + radius * r}`,
            `${cx - radius * r},${cy}`,
          ].join(" ")}
          fill="none"
          stroke="currentColor"
          strokeOpacity={i === 3 ? 0.25 : 0.12}
          strokeDasharray={i === 3 ? "none" : "2 3"}
        />
      ))}
      {axes.map((a) => (
        <line
          key={a.label}
          x1={cx}
          y1={cy}
          x2={a.x}
          y2={a.y}
          stroke="currentColor"
          strokeOpacity={0.18}
          strokeDasharray="2 3"
        />
      ))}
      <polygon points={points} fill="#CD9C20" fillOpacity={0.25} stroke="#CD9C20" strokeWidth={1.5} />
      {axes.map((a) => {
        const dx = (a.x - cx) * 1.22;
        const dy = (a.y - cy) * 1.28;
        return (
          <g key={a.label} transform={`translate(${cx + dx} ${cy + dy})`}>
            <text
              textAnchor="middle"
              className="text-[9px] font-bold uppercase tracking-widest fill-muted-foreground"
              y={-3}
            >
              {a.label}
            </text>
            <text
              textAnchor="middle"
              className="text-[10px] font-bold tabular-nums fill-foreground"
              y={10}
            >
              {a.value}
              <tspan className="fill-muted-foreground">/10</tspan>
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function formatDmy(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}
