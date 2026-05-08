"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Sparkles, X, ArrowUp } from "lucide-react";
import { useCurrentUser } from "@/lib/auth";
import {
  finalizeCycle,
  getMachineById,
  getMachinesByUser,
  getTxByMachine,
  getUserScope,
} from "@/lib/co-may/mock-data";
import { adjustTotalCapital, getSetup } from "@/lib/co-may/setup-store";
import { cn } from "@/lib/utils";
import type {
  CycleDecision,
  CycleReflection,
  CycleScorecard,
  Machine,
  MachineTransaction,
} from "@/lib/co-may/types";
import { Button } from "@/components/ui/button";

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const STEPS = [
  { idx: 1, label: "Tổng kết" },
  { idx: 2, label: "Scorecard" },
  { idx: 3, label: "Phản tư" },
  { idx: 4, label: "Quyết định" },
] as const;

type RoleSlug = "client" | "mentor" | "admin";

export function CloseCycleWizard({
  role,
  machineId,
  ownerId,
}: {
  role: RoleSlug;
  machineId: string;
  ownerId?: string;
}) {
  const user = useCurrentUser(role);
  const router = useRouter();

  const resolved = useMemo<{
    machine: Machine;
    tx: MachineTransaction[];
    resolvedOwner: string;
  } | null>(() => {
    if (!user) return null;
    const scope = getUserScope(user.role ?? role, user.id);
    const candidates = ownerId && scope.includes(ownerId) ? [ownerId] : [user.id, ...scope];
    for (const id of candidates) {
      const m = getMachineById(id, machineId);
      if (m) return { machine: m, tx: getTxByMachine(id, machineId), resolvedOwner: id };
    }
    return null;
  }, [user, role, machineId, ownerId]);

  const [step, setStep] = useState(1);
  const [scorecard, setScorecard] = useState<CycleScorecard>({
    ky_luat: 7,
    thuc_thi: 7,
    rui_ro: 7,
    hoc_hoi: 7,
  });
  const [reflection, setReflection] = useState<CycleReflection>({});
  const [decision, setDecision] = useState<CycleDecision | null>(null);
  const [scaleMode, setScaleMode] = useState<"pct" | "custom">("pct");
  const [scalePct, setScalePct] = useState(50);
  const [scaleCustom, setScaleCustom] = useState("");
  // Milestones cho cỗ máy mới (chỉ áp dụng khi scale). Auto theo newCap, user có thể edit từng giá trị.
  const [milestonesDraft, setMilestonesDraft] = useState<string[] | null>(null);
  const [milestonesDirty, setMilestonesDirty] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Compute scale capital (cần cho useEffect bên dưới — chạy trước early return để tuân Rules of Hooks)
  const machineCapital = resolved?.machine.capital ?? 0;
  const computedScaleCapital =
    scaleMode === "pct"
      ? Math.round(machineCapital * (1 + scalePct / 100))
      : Math.max(0, Math.round(Number(scaleCustom) || machineCapital));

  function generateDefaultMilestones(cap: number): string[] {
    const ratio = 0.8;
    const out: string[] = [];
    let v = cap;
    for (let i = 0; i < 5; i++) {
      out.push(String(Math.max(1, Math.round(v))));
      v *= ratio;
    }
    return out;
  }

  // Auto-regen milestones khi newCap đổi (trừ khi user đã chỉnh tay).
  // PHẢI gọi trước mọi early return để giữ thứ tự hook.
  useEffect(() => {
    if (decision !== "scale") return;
    if (milestonesDirty) return;
    setMilestonesDraft(generateDefaultMilestones(computedScaleCapital));
  }, [decision, computedScaleCapital, milestonesDirty]);

  if (!user) return <div className="text-sm text-muted-foreground">Đang tải...</div>;
  if (!resolved) {
    return (
      <div className="space-y-4">
        <Link
          href={`/${role}/co-may/quan-ly`}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Quay lại
        </Link>
        <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          Không tìm thấy cỗ máy.
        </div>
      </div>
    );
  }

  const { machine, tx, resolvedOwner } = resolved;

  // Stats chu kỳ hiện tại
  const cycleStartTs = new Date(machine.cycle_started_at ?? machine.created_at).getTime();
  const cycleTx = tx.filter((t) => new Date(t.created_at).getTime() >= cycleStartTs);
  const trades = cycleTx.filter((t) => t.type === "trade_win" || t.type === "trade_loss");
  const pnl = trades.reduce((s, t) => s + t.amount, 0);
  const wins = trades.filter((t) => t.amount > 0).length;
  const wr = trades.length > 0 ? Math.round((wins / trades.length) * 100) : 0;
  const winSum = trades.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const lossSum = -trades.filter((t) => t.amount < 0).reduce((s, t) => s + t.amount, 0);
  const rrAvg = lossSum > 0 ? winSum / lossSum : 0;
  const withdrawn = -cycleTx.filter((t) => t.type === "withdraw").reduce((s, t) => s + t.amount, 0);
  const endingBalance = machine.capital + pnl - withdrawn;
  const growthPct = machine.capital > 0 ? (pnl / machine.capital) * 100 : 0;

  // Peak pnl
  let runPnl = 0;
  let peakPnl = 0;
  trades
    .slice()
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    .forEach((t) => {
      runPnl += t.amount;
      if (runPnl > peakPnl) peakPnl = runPnl;
    });

  // Reserve pool: dồn cả số tiền đã rút + dự trữ
  const setup = getSetup(resolvedOwner);
  const reservePool = setup ? setup.totalCapital - machine.capital : 0;
  const scaleBudget = Math.max(0, withdrawn + reservePool);

  function next() {
    setStep((s) => Math.min(4, s + 1));
  }
  function prev() {
    setStep((s) => Math.max(1, s - 1));
  }

  function submit() {
    if (!decision || submitting) return;
    setSubmitting(true);
    const nextCapital = decision === "scale" ? computedScaleCapital : undefined;

    // Snapshot pre-close state để tính total cap đúng (cả khi invariant trước đó bị lệch).
    const setupBefore = getSetup(resolvedOwner);
    const totalAllocatedBefore = getMachinesByUser(resolvedOwner)
      .filter((m) => m.status !== "closed")
      .reduce((s, m) => s + m.capital, 0);
    const reserveBefore = setupBefore
      ? Math.max(0, setupBefore.totalCapital - totalAllocatedBefore)
      : 0;
    const otherActiveAllocated = totalAllocatedBefore - machine.capital;

    const nextMilestones =
      decision === "scale" && milestonesDraft
        ? milestonesDraft
            .map((s) => Number(s))
            .filter((n) => Number.isFinite(n) && n > 0)
        : undefined;
    const result = finalizeCycle(resolvedOwner, machineId, {
      decision,
      nextCapital,
      nextMilestones,
      scorecard,
      reflection,
    });

    // Force invariant: totalCap = allocated_after + reserve_after.
    // Pool sau khi đóng cỗ máy = reserve cũ + ending balance.
    //  - Close: không tạo máy mới → reserve_after = pool, allocated_after = otherActive.
    //  - Reset/Scale: máy mới lấy từ pool. Nếu pool < newCap, user inject (newCap-pool) từ external
    //    → reserve_after = 0. Nếu pool ≥ newCap, surplus = pool - newCap rơi vào reserve.
    const poolAfterClose = reserveBefore + endingBalance;
    let targetTotal: number;
    if (decision === "close") {
      targetTotal = otherActiveAllocated + poolAfterClose;
    } else {
      const newCap = nextCapital ?? machine.capital;
      const reserveAfter = Math.max(0, poolAfterClose - newCap);
      targetTotal = otherActiveAllocated + newCap + reserveAfter;
    }
    const currentTotal = setupBefore?.totalCapital ?? 0;
    const adjustment = targetTotal - currentTotal;
    if (adjustment !== 0) adjustTotalCapital(resolvedOwner, adjustment);

    router.push(`/${role}/co-may/bao-cao/${result.report.id}?owner=${resolvedOwner}`);
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <Link
          href={`/${role}/co-may/quan-ly/${machineId}${ownerId ? `?owner=${ownerId}` : ""}`}
          className="inline-flex items-center gap-1.5 text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3" />
          {machine.name} / Đóng chu kỳ
        </Link>
        <h1 className="text-3xl md:text-4xl font-bold mt-2">
          <span className="text-foreground">Đóng</span>{" "}
          <span className="gold-gradient-text">chu kỳ</span>
        </h1>
        <div className="border-b border-border mt-3" />
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-2 flex-wrap">
        {STEPS.map((s, i) => (
          <div key={s.idx} className="flex items-center gap-2">
            <div
              className={cn(
                "flex items-center gap-2 px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-widest",
                step === s.idx
                  ? "bg-foreground text-background"
                  : step > s.idx
                    ? "border border-foreground/30 text-foreground"
                    : "border border-border text-muted-foreground",
              )}
            >
              <span className="font-mono">{s.idx}</span>
              <span>{s.label}</span>
            </div>
            {i < STEPS.length - 1 && <div className="h-px w-10 bg-border" />}
          </div>
        ))}
      </div>

      {/* Step content */}
      <div className="rounded-2xl border-2 border-foreground bg-card p-6 md:p-8 space-y-5">
        {step === 1 && (
          <>
            <div>
              <h2 className="text-xl md:text-2xl font-semibold text-muted-foreground italic">
                {machine.name}
              </h2>
              <h3 className="text-2xl md:text-3xl font-bold text-foreground">chu kỳ vừa qua</h3>
              <p className="text-sm text-muted-foreground mt-1">Đây là toàn cảnh chu kỳ.</p>
            </div>
            <div className="border border-border rounded-xl p-4 md:p-6 grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-5">
              <Stat label="Vốn" value={usd.format(machine.capital)} />
              <Stat
                label="PnL cuối"
                value={`${pnl >= 0 ? "+" : ""}${usd.format(pnl)}`}
                tone={pnl > 0 ? "profit" : pnl < 0 ? "loss" : undefined}
              />
              <Stat label="Peak PnL" value={`+${usd.format(peakPnl)}`} />
              <Stat label="Đã rút" value={usd.format(withdrawn)} tone="gold" />
              <Stat label="Lệnh" value={String(trades.length)} />
              <Stat label="Winrate" value={`${wr}%`} />
              <Stat label="R:R" value={rrAvg.toFixed(2)} />
              <Stat
                label="Tăng trưởng"
                value={`${growthPct >= 0 ? "+" : ""}${growthPct.toFixed(1)}%`}
                tone={growthPct > 0 ? "profit" : growthPct < 0 ? "loss" : undefined}
              />
            </div>
            <div className="flex justify-end">
              <Button onClick={next} variant="anchor">
                Tiếp tục <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <div>
              <h2 className="text-2xl md:text-3xl font-bold">
                <span className="text-foreground italic">Scorecard</span>{" "}
                <span className="gold-gradient-text">4 lens</span>
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Chấm 0–10 mỗi trụ. Trung thực với chính mình.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <Slider
                  label="Kỷ luật"
                  hint="Có tuân thủ mốc neo + quy tắc rút không?"
                  value={scorecard.ky_luat}
                  onChange={(v) => setScorecard((s) => ({ ...s, ky_luat: v }))}
                />
                <Slider
                  label="Thực thi"
                  hint="Entry/exit đúng kế hoạch không?"
                  value={scorecard.thuc_thi}
                  onChange={(v) => setScorecard((s) => ({ ...s, thuc_thi: v }))}
                />
                <Slider
                  label="Quản trị rủi ro"
                  hint="DD có trong giới hạn không?"
                  value={scorecard.rui_ro}
                  onChange={(v) => setScorecard((s) => ({ ...s, rui_ro: v }))}
                />
                <Slider
                  label="Học hỏi"
                  hint="Insight mới, nhật ký đầy đủ, điểm yếu."
                  value={scorecard.hoc_hoi}
                  onChange={(v) => setScorecard((s) => ({ ...s, hoc_hoi: v }))}
                />
              </div>
              <RadarChart scorecard={scorecard} />
            </div>
            <div className="flex justify-between">
              <Button variant="outline" onClick={prev}>
                <ArrowLeft className="h-3.5 w-3.5" /> Quay lại
              </Button>
              <Button onClick={next} variant="anchor">
                Tiếp tục <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <div>
              <h2 className="text-2xl md:text-3xl font-bold">
                <span className="text-foreground italic">Ba câu</span>{" "}
                <span className="gold-gradient-text">cốt lõi</span>
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Trả lời thật — báo cáo chỉ bạn đọc.
              </p>
            </div>
            <ReflectQuestion
              num={1}
              q="Cỗ máy có vận hành đúng thiết kế?"
              value={reflection.van_hanh_dung_thiet_ke ?? ""}
              onChange={(v) => setReflection((r) => ({ ...r, van_hanh_dung_thiet_ke: v }))}
            />
            <ReflectQuestion
              num={2}
              q="Bài học lớn nhất?"
              value={reflection.bai_hoc_lon_nhat ?? ""}
              onChange={(v) => setReflection((r) => ({ ...r, bai_hoc_lon_nhat: v }))}
            />
            <ReflectQuestion
              num={3}
              q="Điều chỉnh cho chu kỳ tiếp?"
              value={reflection.dieu_chinh_chu_ky_tiep ?? ""}
              onChange={(v) => setReflection((r) => ({ ...r, dieu_chinh_chu_ky_tiep: v }))}
            />
            <div className="flex justify-between">
              <Button variant="outline" onClick={prev}>
                <ArrowLeft className="h-3.5 w-3.5" /> Quay lại
              </Button>
              <Button onClick={next} variant="anchor">
                Tiếp: Quyết định <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </>
        )}

        {step === 4 && (
          <>
            <div>
              <h2 className="text-2xl md:text-3xl font-bold">
                <span className="text-foreground italic">Tiếp theo</span>{" "}
                <span className="gold-gradient-text">là gì?</span>
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Doanh chủ phải ra quyết định rõ ràng.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <DecisionCard
                icon={<ArrowUp className="h-5 w-5" />}
                label="Scale"
                desc="Tăng vốn cho chu kỳ tiếp"
                selected={decision === "scale"}
                onClick={() => setDecision("scale")}
              />
              <DecisionCard
                icon={<ArrowRight className="h-5 w-5" />}
                label="Tiếp tục"
                desc="Giữ nguyên thông số"
                selected={decision === "reset"}
                onClick={() => setDecision("reset")}
              />
              <DecisionCard
                icon={<X className="h-5 w-5" />}
                label="Đóng"
                desc="Dừng và dồn vốn"
                selected={decision === "close"}
                onClick={() => setDecision("close")}
              />
            </div>

            {decision === "scale" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <h4 className="text-sm font-bold uppercase tracking-widest text-foreground">
                      Vốn cho cỗ máy mới
                    </h4>
                    <span className="text-[11px] text-muted-foreground tabular-nums">
                      Khả dụng:{" "}
                      <strong className="text-foreground">{usd.format(scaleBudget)}</strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setScaleMode("pct")}
                      className={cn(
                        "px-3 py-1.5 rounded-md border-2 font-bold uppercase tracking-widest transition-colors",
                        scaleMode === "pct"
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:text-foreground",
                      )}
                    >
                      %
                    </button>
                    <button
                      type="button"
                      onClick={() => setScaleMode("custom")}
                      className={cn(
                        "px-3 py-1.5 rounded-md border-2 font-bold uppercase tracking-widest transition-colors",
                        scaleMode === "custom"
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:text-foreground",
                      )}
                    >
                      Tự điền $
                    </button>
                  </div>
                  {scaleMode === "pct" ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Tăng vốn</span>
                        <span className="font-bold text-primary tabular-nums">+{scalePct}%</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={200}
                        step={5}
                        value={scalePct}
                        onChange={(e) => setScalePct(Number(e.target.value))}
                        className="w-full accent-primary"
                      />
                      <div className="text-xs text-muted-foreground tabular-nums">
                        Vốn mới ={" "}
                        <strong className="text-foreground">
                          {usd.format(computedScaleCapital)}
                        </strong>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <input
                        type="number"
                        min={0}
                        value={scaleCustom}
                        onChange={(e) => setScaleCustom(e.target.value)}
                        placeholder={String(machine.capital)}
                        className="h-11 w-full rounded-lg border border-input bg-card px-3 text-base tabular-nums focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 outline-none"
                      />
                      <div className="text-xs text-muted-foreground tabular-nums">
                        Vốn mới ={" "}
                        <strong className="text-foreground">
                          {usd.format(computedScaleCapital)}
                        </strong>
                      </div>
                    </div>
                  )}
                </div>

                <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <h4 className="text-sm font-bold uppercase tracking-widest text-foreground">
                      Mốc neo cỗ máy mới
                    </h4>
                    <button
                      type="button"
                      onClick={() => {
                        setMilestonesDraft(generateDefaultMilestones(computedScaleCapital));
                        setMilestonesDirty(false);
                      }}
                      className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors"
                    >
                      Reset auto
                    </button>
                  </div>
                  <div className="grid grid-cols-5 gap-1.5">
                    {(milestonesDraft ?? generateDefaultMilestones(computedScaleCapital)).map(
                      (v, i) => (
                        <div key={i} className="space-y-1">
                          <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-center">
                            M{i + 1}
                          </div>
                          <input
                            type="number"
                            min={0}
                            value={v}
                            onChange={(e) => {
                              setMilestonesDirty(true);
                              setMilestonesDraft((prev) => {
                                const base = prev ?? generateDefaultMilestones(computedScaleCapital);
                                return base.map((x, j) => (j === i ? e.target.value : x));
                              });
                            }}
                            className="w-full rounded-md border border-input bg-card px-1 py-1.5 text-center text-xs font-bold tabular-nums focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 outline-none"
                          />
                        </div>
                      ),
                    )}
                  </div>
                  <p className="text-[11px] italic text-muted-foreground/80">
                    Mặc định 100/80/64/51.2/41% vốn mới. Có thể chỉnh tay từng mốc.
                  </p>
                </div>
              </div>
            )}

            <div className="flex justify-between">
              <Button variant="outline" onClick={prev}>
                <ArrowLeft className="h-3.5 w-3.5" /> Quay lại
              </Button>
              <Button
                variant="anchor"
                onClick={submit}
                disabled={!decision || submitting}
              >
                <Sparkles className="h-3.5 w-3.5" />
                {submitting ? "Đang xử lý..." : "Hoàn tất & Lập báo cáo"}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "profit" | "loss" | "gold";
}) {
  return (
    <div className="space-y-1.5">
      <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        {label}
      </div>
      <div
        className={cn(
          "text-2xl md:text-3xl font-bold tabular-nums",
          tone === "profit" && "text-[#3B6C4F] dark:text-[#5C9C75]",
          tone === "loss" && "text-foreground",
          tone === "gold" && "text-primary",
          !tone && "text-foreground",
        )}
      >
        {value}
      </div>
    </div>
  );
}

function Slider({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
          {label}
        </span>
        <span className="font-bold tabular-nums text-foreground">
          {value}
          <span className="text-muted-foreground/70">/10</span>
        </span>
      </div>
      <input
        type="range"
        min={0}
        max={10}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-primary"
      />
      <p className="text-xs italic text-muted-foreground">{hint}</p>
    </div>
  );
}

function RadarChart({ scorecard }: { scorecard: CycleScorecard }) {
  const { ky_luat, thuc_thi, rui_ro, hoc_hoi } = scorecard;
  const max = 10;
  const cx = 100;
  const cy = 100;
  const radius = 80;

  // 4 axes: top, right, bottom, left
  const axes = [
    { label: "Kỷ luật", value: ky_luat, x: cx, y: cy - radius },
    { label: "Thực thi", value: thuc_thi, x: cx + radius, y: cy },
    { label: "Rủi ro", value: rui_ro, x: cx, y: cy + radius },
    { label: "Học hỏi", value: hoc_hoi, x: cx - radius, y: cy },
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
    <div className="rounded-xl border border-border p-4 flex items-center justify-center">
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
        <polygon
          points={points}
          fill="#CD9C20"
          fillOpacity={0.25}
          stroke="#CD9C20"
          strokeWidth={1.5}
        />
        {axes.map((a, i) => {
          const r = (a.value / max) * radius;
          const dx = (a.x - cx) * (r / radius);
          const dy = (a.y - cy) * (r / radius);
          return <circle key={i} cx={cx + dx} cy={cy + dy} r={2} fill="#CD9C20" />;
        })}
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
    </div>
  );
}

function ReflectQuestion({
  num,
  q,
  value,
  onChange,
}: {
  num: number;
  q: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs italic text-muted-foreground">Câu {String(num).padStart(2, "0")}</p>
      <p className="text-base md:text-lg font-medium text-foreground">{q}</p>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        placeholder="Viết thật — ít câu cũng được."
        className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-base focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 outline-none resize-none"
      />
    </div>
  );
}

function DecisionCard({
  icon,
  label,
  desc,
  selected,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  desc: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-xl border-2 p-6 text-center transition-colors flex flex-col items-center gap-3",
        selected
          ? "border-foreground bg-foreground text-background"
          : "border-border bg-card hover:border-foreground/40",
      )}
    >
      <span className={cn(selected ? "text-primary" : "text-foreground")}>{icon}</span>
      <span className="text-base font-bold">{label}</span>
      <span className={cn("text-xs", selected ? "text-background/70" : "text-muted-foreground")}>
        {desc}
      </span>
      {selected && (
        <Check className="h-4 w-4 text-primary mt-1" />
      )}
    </button>
  );
}
