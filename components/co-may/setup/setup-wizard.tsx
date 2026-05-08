"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Coins, Check, Ban, Anchor, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  addInjectedFromWithdrawn,
  adjustTotalCapital,
  getSetup,
  QUICK_CAPITAL_CHIPS,
  saveSetup,
  STRATEGIES,
  type StrategyId,
} from "@/lib/co-may/setup-store";
import Link from "next/link";
import { deleteMachine, getMachinesByUser, getTxByUser } from "@/lib/co-may/mock-data";
import type { Machine } from "@/lib/co-may/types";
import { CreateMachineDialog } from "@/components/co-may/quan-ly/create-machine-dialog";

export type WizardMode = "initial" | "allocate";

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const TOTAL_STEPS = 3;

export function SetupWizard({
  userId,
  role,
  mode = "initial",
  reservePool = 0,
}: {
  userId: string;
  role: string;
  mode?: WizardMode;
  /** Khi mode="allocate", đây là pool vốn dự trữ available. */
  reservePool?: number;
}) {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(mode === "allocate" ? 3 : 1);
  const [capital, setCapital] = useState<number>(mode === "allocate" ? reservePool : 1000);
  const [strategy, setStrategy] = useState<StrategyId>("concentrated");
  const [allocations, setAllocations] = useState<
    { name: string; capital: number; anchor_milestones?: number[]; milestonesDirty?: boolean }[]
  >(
    mode === "allocate"
      ? [{ name: "Cỗ máy mới", capital: 0 }]
      : [],
  );
  // Mode allocate: thêm vốn doanh chủ. Pool = reservePool + addedCapital.
  const [addedCapital, setAddedCapital] = useState<number>(0);
  // Snapshot initial machine IDs để track session additions
  const [initialIds] = useState<Set<string>>(() =>
    mode === "allocate"
      ? new Set(getMachinesByUser(userId).map((m) => m.id))
      : new Set(),
  );
  const [tick, setTick] = useState(0);
  const sessionMachines = useMemo<Machine[]>(() => {
    if (mode !== "allocate") return [];
    return getMachinesByUser(userId).filter((m) => !initialIds.has(m.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, mode, tick]);
  const sessionAllocated = sessionMachines.reduce((s, m) => s + m.capital, 0);
  const effectivePool = mode === "allocate" ? reservePool + addedCapital : capital;
  const remainingReserve = effectivePool - sessionAllocated;

  const machineCount = useMemo(
    () =>
      mode === "allocate"
        ? allocations.length
        : STRATEGIES.find((s) => s.id === strategy)?.machineCount ?? 0,
    [mode, allocations.length, strategy],
  );

  function handleStrategyNext() {
    if (strategy === "later") {
      saveSetup(userId, { totalCapital: capital, strategy, allocations: [] });
      router.replace(`/${role}/co-may/tong-quan`);
      return;
    }
    const tpl = defaultAllocations(strategy, capital);
    setAllocations(tpl);
    setStep(3);
  }

  function handleFinish() {
    if (mode === "allocate") {
      // Allocate mode: machines đã được addMachine qua CreateMachineDialog rồi.
      // Chỉ apply addedCapital nếu > 0.
      if (addedCapital <= 0 && sessionMachines.length === 0) {
        // eslint-disable-next-line no-alert
        alert("Bạn chưa thay đổi gì — nạp thêm vốn HOẶC tạo cỗ máy mới.");
        return;
      }
      if (addedCapital > 0) {
        // Ưu tiên lấy từ dòng tiền đã rút (đã có sẵn ngoài hệ thống)
        const setup = getSetup(userId);
        const userTx = getTxByUser(userId);
        const withdrawnRaw = -userTx
          .filter((t) => t.type === "withdraw")
          .reduce((s, t) => s + t.amount, 0);
        const alreadyInjected = setup?.injectedFromWithdrawn ?? 0;
        const poolAvailable = Math.max(0, withdrawnRaw - alreadyInjected);
        const fromPool = Math.min(addedCapital, poolAvailable);
        if (fromPool > 0) addInjectedFromWithdrawn(userId, fromPool);
        adjustTotalCapital(userId, addedCapital);
      }
      router.replace(`/${role}/co-may/tong-quan`);
      return;
    }
    // Initial mode: legacy path
    const sum = allocations.reduce((s, a) => s + a.capital, 0);
    if (sum > capital + 1) {
      // eslint-disable-next-line no-alert
      alert(`Tổng phân bổ (${usd.format(sum)}) vượt quá tổng vốn (${usd.format(capital)}).`);
      return;
    }
    saveSetup(userId, { totalCapital: capital, strategy, allocations });
    router.replace(`/${role}/co-may/tong-quan`);
  }

  function handleRemoveSessionMachine(machineId: string) {
    if (!confirm("Xoá cỗ máy này?")) return;
    deleteMachine(userId, machineId);
    setTick((n) => n + 1);
  }

  function addAllocationRow() {
    setAllocations((prev) => [...prev, { name: `Cỗ máy ${prev.length + 1}`, capital: 0 }]);
  }
  function removeAllocationRow(idx: number) {
    setAllocations((prev) => prev.filter((_, i) => i !== idx));
  }

  const isAllocateMode = mode === "allocate";

  return (
    <div className="max-w-3xl mx-auto py-8 md:py-12 px-4 space-y-6">
      {!isAllocateMode && <StepIndicator current={step} total={TOTAL_STEPS} />}

      <div className="rounded-3xl border border-border bg-card p-6 md:p-10 space-y-6">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          {isAllocateMode ? (
            <>
              <span>Hoạch định lại</span>
              <span className="text-muted-foreground/40">·</span>
              <span className="text-primary">Phân bổ vốn dự trữ</span>
            </>
          ) : (
            <>
              Bước {String(step).padStart(2, "0")} / 0{TOTAL_STEPS}
              <span className="text-muted-foreground/40">·</span>
              <span className="text-primary">{stepLabel(step)}</span>
            </>
          )}
        </div>

        {step === 1 && !isAllocateMode && (
          <StepCapital capital={capital} onChange={setCapital} />
        )}
        {step === 2 && !isAllocateMode && (
          <StepStrategy strategy={strategy} onChange={setStrategy} />
        )}
        {step === 3 && isAllocateMode && (
          <>
            <AddCapitalSection
              reservePool={reservePool}
              addedCapital={addedCapital}
              onChangeAddedCapital={setAddedCapital}
              effectivePool={effectivePool}
            />
            <AllocateSessionList
              userId={userId}
              role={role}
              sessionMachines={sessionMachines}
              remainingReserve={remainingReserve}
              onCreated={() => setTick((n) => n + 1)}
              onRemove={handleRemoveSessionMachine}
            />
          </>
        )}

        {step === 3 && !isAllocateMode && (
          <StepAllocation
            allocations={allocations}
            onChange={setAllocations}
            total={capital}
            machineCount={machineCount}
            isAllocateMode={false}
            onAddRow={addAllocationRow}
            onRemoveRow={removeAllocationRow}
          />
        )}

        <div className="flex items-center justify-between gap-3 pt-4 border-t border-dashed border-border">
          {!isAllocateMode && step > 1 ? (
            <Button
              variant="outline"
              size="lg"
              onClick={() => setStep((s) => (s - 1) as 1 | 2 | 3)}
            >
              <ArrowLeft className="h-4 w-4" />
              Quay lại
            </Button>
          ) : isAllocateMode ? (
            <Button
              variant="outline"
              size="lg"
              onClick={() => router.replace(`/${role}/co-may/tong-quan`)}
            >
              <ArrowLeft className="h-4 w-4" />
              Về tổng quan
            </Button>
          ) : (
            <span />
          )}

          {step === 1 && !isAllocateMode && (
            <Button variant="anchor" size="lg" onClick={() => setStep(2)} disabled={capital <= 0}>
              Tiếp: Chiến lược phân bổ
              <ArrowRight className="h-4 w-4" />
            </Button>
          )}
          {step === 2 && !isAllocateMode && (
            <Button variant="anchor" size="lg" onClick={handleStrategyNext}>
              {strategy === "later" ? "Hoàn tất" : "Tiếp: Phân bổ chi tiết"}
              <ArrowRight className="h-4 w-4" />
            </Button>
          )}
          {step === 3 && (
            <Button variant="anchor" size="lg" onClick={handleFinish}>
              <Check className="h-4 w-4" />
              {isAllocateMode ? "Phân bổ thêm" : "Khởi tạo cỗ máy"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function defaultAllocations(
  strategy: StrategyId,
  total: number,
): { name: string; capital: number; anchor_milestones: number[] }[] {
  const withMilestones = (rows: { name: string; capital: number }[]) =>
    rows.map((r) => ({ ...r, anchor_milestones: defaultMilestones(r.capital) }));
  switch (strategy) {
    case "concentrated":
      return withMilestones([{ name: "Cỗ máy chính", capital: total }]);
    case "balanced":
      return withMilestones([
        { name: "Cỗ máy chính", capital: Math.round(total * 0.6) },
        { name: "Cỗ máy phụ", capital: total - Math.round(total * 0.6) },
      ]);
    case "diversified": {
      const a = Math.round(total * 0.5);
      const b = Math.round(total * 0.3);
      const c = total - a - b;
      return withMilestones([
        { name: "Cỗ máy chính", capital: a },
        { name: "Cỗ máy phụ", capital: b },
        { name: "Cỗ máy thử nghiệm", capital: c },
      ]);
    }
    default:
      return [];
  }
}

function stepLabel(step: number): string {
  if (step === 1) return "Vốn doanh chủ";
  if (step === 2) return "Chiến lược phân bổ";
  return "Phân bổ chi tiết";
}

// ─────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center justify-center gap-2">
      {Array.from({ length: total }).map((_, i) => {
        const idx = i + 1;
        const state = idx < current ? "done" : idx === current ? "active" : "pending";
        return (
          <div
            key={idx}
            className={cn(
              "h-1.5 rounded-full transition-all",
              state === "active" ? "w-12 bg-primary" : "w-8",
              state === "done" && "bg-primary/60",
              state === "pending" && "bg-border",
            )}
          />
        );
      })}
    </div>
  );
}

function StepCapital({
  capital,
  onChange,
}: {
  capital: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl md:text-3xl font-bold text-foreground">
          Bạn có <span className="text-primary">bao nhiêu</span> vốn?
        </h2>
        <p className="text-sm md:text-base text-muted-foreground mt-2 leading-relaxed">
          Đây là tổng số tiền bạn dành riêng cho trading. Không phải tiền sinh hoạt,
          không phải tiền vay. Nếu mất hết, cuộc sống vẫn tiếp tục.
        </p>
      </div>

      <div className="space-y-3">
        <label className="block text-xs font-semibold uppercase tracking-widest text-muted-foreground text-center">
          Tổng vốn ($)
        </label>
        <Input
          type="number"
          value={capital}
          onChange={(e) => onChange(Number(e.target.value) || 0)}
          min={1}
          className="h-20 text-5xl md:text-6xl font-bold text-center tabular-nums tracking-tight"
        />
        <div className="flex flex-wrap items-center justify-center gap-2">
          {QUICK_CAPITAL_CHIPS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => onChange(c)}
              className={cn(
                "rounded-lg border-2 px-4 py-2 text-sm font-medium transition-colors",
                capital === c
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-foreground hover:bg-muted",
              )}
            >
              {usd.format(c)}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-xl border-l-4 border-primary bg-primary/5 px-4 py-3">
        <p className="text-sm md:text-base italic text-foreground/80 leading-relaxed">
          <strong>Nguyên tắc doanh chủ:</strong> vốn trading phải là tiền bạn có thể
          mất 100% mà vẫn ngủ ngon.
        </p>
      </div>
    </div>
  );
}

function StepStrategy({
  strategy,
  onChange,
}: {
  strategy: StrategyId;
  onChange: (s: StrategyId) => void;
}) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl md:text-3xl font-bold text-foreground">
          Một cỗ máy hay <span className="text-primary">nhiều cỗ máy</span>?
        </h2>
        <p className="text-sm md:text-base text-muted-foreground mt-2 leading-relaxed">
          Doanh chủ kinh nghiệm phân bổ vốn ra nhiều cỗ máy để giảm rủi ro. Người mới
          nên bắt đầu với một cỗ máy.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {STRATEGIES.map((s) => {
          const active = strategy === s.id;
          const isLater = s.id === "later";
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => onChange(s.id)}
              className={cn(
                "text-left rounded-2xl border-2 p-5 transition-all space-y-2",
                active
                  ? "border-primary bg-primary/10 shadow-sm"
                  : "border-border bg-card hover:border-foreground/40",
              )}
            >
              <div className="flex items-center gap-2">
                {isLater ? (
                  <Ban className="h-6 w-6 text-muted-foreground" />
                ) : (
                  <span className="text-2xl font-bold text-primary">{s.number}</span>
                )}
              </div>
              <h3 className="font-semibold text-foreground text-lg">{s.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
            </button>
          );
        })}
      </div>

      <div className="rounded-xl border-l-4 border-primary bg-primary/5 px-4 py-3">
        <p className="text-sm md:text-base italic text-foreground/80 leading-relaxed">
          <strong>Nguyên tắc Kanban:</strong> đừng mở quá nhiều cỗ máy ngay từ đầu —
          bạn sẽ không quản trị được cái nào tử tế.
        </p>
      </div>
    </div>
  );
}

type AllocRow = {
  name: string;
  capital: number;
  anchor_milestones?: number[];
  milestonesDirty?: boolean;
};

function defaultMilestones(cap: number): number[] {
  if (!Number.isFinite(cap) || cap <= 0) return [];
  const ratio = 0.8;
  const out: number[] = [];
  let v = cap;
  for (let i = 0; i < 5; i++) {
    out.push(Math.max(1, Math.round(v)));
    v *= ratio;
  }
  return out;
}

function StepAllocation({
  allocations,
  onChange,
  total,
  machineCount,
  isAllocateMode,
  onAddRow,
  onRemoveRow,
}: {
  allocations: AllocRow[];
  onChange: (a: AllocRow[]) => void;
  total: number;
  machineCount: number;
  isAllocateMode?: boolean;
  onAddRow?: () => void;
  onRemoveRow?: (idx: number) => void;
}) {
  const sum = allocations.reduce((s, a) => s + a.capital, 0);
  const reserve = total - sum;
  const overAllocated = reserve < -1;

  function update(idx: number, patch: Partial<AllocRow>) {
    const next = allocations.map((a, i) => {
      if (i !== idx) return a;
      const merged = { ...a, ...patch };
      // Khi capital đổi và milestones chưa bị dirty → auto-sinh
      if (
        patch.capital !== undefined &&
        patch.capital !== a.capital &&
        !merged.milestonesDirty
      ) {
        merged.anchor_milestones = defaultMilestones(merged.capital);
      }
      return merged;
    });
    onChange(next);
  }

  function updateMilestone(idx: number, mIdx: number, value: number) {
    const next = allocations.map((a, i) => {
      if (i !== idx) return a;
      const milestones = (a.anchor_milestones ?? defaultMilestones(a.capital)).slice();
      milestones[mIdx] = Math.max(0, value);
      return { ...a, anchor_milestones: milestones, milestonesDirty: true };
    });
    onChange(next);
  }

  function resetMilestones(idx: number) {
    const next = allocations.map((a, i) =>
      i === idx
        ? { ...a, anchor_milestones: defaultMilestones(a.capital), milestonesDirty: false }
        : a,
    );
    onChange(next);
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl md:text-3xl font-bold text-foreground">
          {isAllocateMode ? (
            <>
              Phân bổ thêm từ <span className="text-primary">vốn dự trữ</span>
            </>
          ) : (
            <>
              Phân bổ <span className="text-primary">chi tiết</span>
            </>
          )}
        </h2>
        <p className="text-sm md:text-base text-muted-foreground mt-2 leading-relaxed">
          {isAllocateMode
            ? `Vốn dự trữ khả dụng: ${usd.format(total)}. Đặt tên + vốn cho cỗ máy mới (có thể thêm nhiều).`
            : `Đặt tên + vốn cho ${machineCount} cỗ máy. Phần dư sẽ thành vốn dự trữ — không bắt buộc dùng hết.`}
        </p>
      </div>

      <div className="space-y-3">
        {allocations.map((a, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <Coins className="h-3.5 w-3.5 text-primary" />
                Cỗ máy #{i + 1}
              </div>
              {isAllocateMode && onRemoveRow && allocations.length > 1 && (
                <button
                  type="button"
                  onClick={() => onRemoveRow(i)}
                  className="text-xs text-destructive hover:underline"
                >
                  Xoá
                </button>
              )}
            </div>
            <Input
              value={a.name}
              onChange={(e) => update(i, { name: e.target.value })}
              placeholder="Tên cỗ máy"
              className="h-11 text-base"
            />
            <Input
              type="number"
              value={a.capital}
              onChange={(e) => update(i, { capital: Number(e.target.value) || 0 })}
              placeholder="Vốn ($)"
              className="h-11 text-base"
            />
            {a.capital > 0 && (
              <div className="rounded-lg border border-dashed border-border bg-muted/20 p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                    Mốc neo
                  </span>
                  <button
                    type="button"
                    onClick={() => resetMilestones(i)}
                    className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors"
                  >
                    Reset auto
                  </button>
                </div>
                <div className="grid grid-cols-5 gap-1.5">
                  {(a.anchor_milestones ?? defaultMilestones(a.capital)).map((m, mIdx) => (
                    <div key={mIdx} className="space-y-1">
                      <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-center">
                        M{mIdx + 1}
                      </div>
                      <input
                        type="number"
                        min={0}
                        value={m}
                        onChange={(e) => updateMilestone(i, mIdx, Number(e.target.value) || 0)}
                        className="w-full rounded-md border border-input bg-card px-1 py-1.5 text-center text-xs font-bold tabular-nums focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 outline-none"
                      />
                    </div>
                  ))}
                </div>
                <p className="text-[11px] italic text-muted-foreground/80">
                  Mặc định 100/80/64/51.2/41% vốn. Có thể chỉnh tay.
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      {isAllocateMode && onAddRow && (
        <Button variant="outline" size="default" onClick={onAddRow} className="w-full">
          + Thêm cỗ máy
        </Button>
      )}

      <div
        className={cn(
          "rounded-xl border px-4 py-3 flex items-center justify-between text-sm md:text-base",
          overAllocated
            ? "border-destructive/40 bg-destructive/5 text-destructive"
            : "border-primary/30 bg-primary/5 text-primary",
        )}
      >
        <span>Đang phân bổ: {usd.format(sum)}</span>
        <span className="font-semibold tabular-nums">
          {overAllocated
            ? `Vượt ${usd.format(-reserve)}`
            : reserve === 0
              ? "Dùng hết, không còn dự trữ"
              : `Vốn dự trữ: ${usd.format(reserve)}`}
        </span>
      </div>
    </div>
  );
}

function AddCapitalSection({
  reservePool,
  addedCapital,
  onChangeAddedCapital,
  effectivePool,
}: {
  reservePool: number;
  addedCapital: number;
  onChangeAddedCapital: (n: number) => void;
  effectivePool: number;
}) {
  return (
    <div className="rounded-2xl border-2 border-dashed border-primary/30 bg-primary/5 p-5 space-y-4">
      <div>
        <h2 className="text-xl md:text-2xl font-bold text-foreground">
          Tăng <span className="text-primary">vốn doanh chủ</span> (tuỳ chọn)
        </h2>
        <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
          Nạp thêm tiền từ ngoài vào vốn doanh chủ. Số tiền này cộng thẳng vào vốn dự trữ
          và bạn có thể phân bổ cho cỗ máy mới ở dưới.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            Vốn dự trữ hiện có
          </label>
          <div className="h-11 rounded-lg bg-muted px-3 flex items-center text-base font-bold tabular-nums text-foreground">
            {usd.format(reservePool)}
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold uppercase tracking-widest text-primary">
            Nạp thêm ($)
          </label>
          <Input
            type="number"
            value={addedCapital === 0 ? "" : addedCapital}
            onChange={(e) => onChangeAddedCapital(Math.max(0, Number(e.target.value) || 0))}
            placeholder="0"
            min={0}
            step={1}
            className="h-11 text-base tabular-nums"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            Pool khả dụng
          </label>
          <div className="h-11 rounded-lg bg-primary/10 border-2 border-primary/30 px-3 flex items-center text-base font-bold tabular-nums text-primary">
            {usd.format(effectivePool)}
          </div>
        </div>
      </div>

      {addedCapital > 0 && (
        <p className="text-xs italic text-primary/80">
          Sau khi xác nhận: tổng vốn doanh chủ sẽ tăng thêm <strong>{usd.format(addedCapital)}</strong>.
        </p>
      )}
    </div>
  );
}

function AllocateSessionList({
  userId,
  role,
  sessionMachines,
  remainingReserve,
  onCreated,
  onRemove,
}: {
  userId: string;
  role: string;
  sessionMachines: Machine[];
  remainingReserve: number;
  onCreated: () => void;
  onRemove: (machineId: string) => void;
}) {
  return (
    <div className="rounded-2xl border-2 border-dashed border-primary/30 bg-card p-5 space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-foreground">
            Khởi tạo <span className="text-primary">cỗ máy mới</span>
          </h2>
          <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
            Mỗi cỗ máy cấu hình đầy đủ: phương pháp, rủi ro, mục tiêu, mốc neo.
          </p>
        </div>
        <CreateMachineDialog
          userId={userId}
          reservePool={Math.max(0, remainingReserve)}
          onCreated={onCreated}
        />
      </div>

      {sessionMachines.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/20 px-4 py-6 text-center text-sm italic text-muted-foreground">
          Chưa tạo cỗ máy nào trong phiên này. Bấm <strong className="text-foreground">Tạo cỗ máy mới</strong> để bắt đầu.
        </div>
      ) : (
        <ul className="space-y-2">
          {sessionMachines.map((m) => (
            <li key={m.id} className="relative">
              <Link
                href={`/${role}/co-may/quan-ly/${m.id}?owner=${userId}`}
                className="block rounded-xl border border-border bg-card hover:border-primary/40 hover:bg-primary/5 px-4 py-3 flex items-center gap-3 transition-colors"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 shrink-0">
                  <Anchor className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-foreground truncate">{m.name}</div>
                  <div className="text-xs text-muted-foreground mt-0.5 tabular-nums">
                    {usd.format(m.capital)}
                    {m.method && ` · ${m.method}`}
                    {m.anchor_milestones && m.anchor_milestones.length > 0 && (
                      <> · {m.anchor_milestones.length} mốc neo</>
                    )}
                  </div>
                </div>
              </Link>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onRemove(m.id);
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                title="Xoá cỗ máy này"
              >
                <X className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div
        className={cn(
          "rounded-xl border px-4 py-3 flex items-center justify-between text-sm md:text-base",
          remainingReserve < 0
            ? "border-destructive/40 bg-destructive/5 text-destructive"
            : "border-primary/30 bg-primary/5 text-primary",
        )}
      >
        <span className="font-medium">Vốn dự trữ còn lại</span>
        <span className="font-bold tabular-nums">{usd.format(remainingReserve)}</span>
      </div>
    </div>
  );
}
