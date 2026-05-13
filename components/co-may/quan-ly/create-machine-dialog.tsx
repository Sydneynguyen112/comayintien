"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, RotateCcw, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { addMachine } from "@/lib/co-may/mock-data";
import { linkMt5ToMachine } from "@/lib/co-may/mt5-actions";
import type { SignalSource } from "@/lib/co-may/types";

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const SIGNAL_OPTIONS: { value: SignalSource; label: string }[] = [
  { value: "self", label: "Tự sản xuất" },
  { value: "imported", label: "Nhập tín hiệu" },
  { value: "both", label: "Cả hai" },
];

interface FormState {
  name: string;
  method: string;
  capital: string;
  signalSource: SignalSource;
  riskPerTrade: string;
  maxDd: string;
  targetWithdrawCount: string;
  targetProfit: string;
  anchors: number[];
  // Optional MT5 monitoring (read-only investor password)
  mt5Enabled: boolean;
  mt5Login: string;
  mt5Password: string;
  mt5Server: string;
}

const INITIAL: FormState = {
  name: "",
  method: "",
  capital: "",
  signalSource: "self",
  riskPerTrade: "2",
  maxDd: "30",
  targetWithdrawCount: "10",
  targetProfit: "300",
  anchors: [],
  mt5Enabled: false,
  mt5Login: "",
  mt5Password: "",
  mt5Server: "",
};

/**
 * Default anchor milestones — geometric spacing match loss-aversion psychology.
 * NEO 1 = vốn gốc (= 100% capital).
 * NEO 2..5 = 80% mốc trước (mỗi step -20%, mốc gần đáy gắt hơn).
 *
 * Vd capital=200  → [200, 160, 128, 102, 82].
 * Vd capital=1000 → [1000, 800, 640, 512, 410].
 */
function generateAnchors(capital: number): number[] {
  if (!Number.isFinite(capital) || capital <= 0) return [];
  const ratio = 0.8;
  const out: number[] = [];
  let v = capital; // NEO 1 = vốn gốc
  for (let i = 0; i < 5; i++) {
    out.push(Math.max(1, Math.round(v)));
    v *= ratio;
  }
  return out;
}

export function CreateMachineDialog({
  userId,
  reservePool,
  onCreated,
}: {
  userId: string;
  reservePool?: number;
  onCreated: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(INITIAL);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const capitalNum = Number(form.capital) || 0;

  // Auto-generate anchors khi capital thay đổi (chỉ nếu user chưa custom).
  const [anchorsDirty, setAnchorsDirty] = useState(false);
  useEffect(() => {
    if (anchorsDirty) return;
    setForm((f) => ({ ...f, anchors: generateAnchors(capitalNum) }));
  }, [capitalNum, anchorsDirty]);

  const reserveHint = useMemo(() => {
    if (reservePool === undefined) return null;
    const remaining = reservePool - capitalNum;
    return { reserve: reservePool, remaining };
  }, [reservePool, capitalNum]);

  function reset() {
    setForm(INITIAL);
    setError(null);
    setAnchorsDirty(false);
  }

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function updateAnchor(idx: number, value: number) {
    setAnchorsDirty(true);
    setForm((f) => ({
      ...f,
      anchors: f.anchors.map((a, i) => (i === idx ? value : a)),
    }));
  }
  function addAnchor() {
    setAnchorsDirty(true);
    const last = form.anchors[form.anchors.length - 1] ?? capitalNum / 8;
    setForm((f) => ({ ...f, anchors: [...f.anchors, Math.max(1, Math.round(last / 2))] }));
  }
  function removeAnchor(idx: number) {
    setAnchorsDirty(true);
    setForm((f) => ({ ...f, anchors: f.anchors.filter((_, i) => i !== idx) }));
  }
  function resetAnchors() {
    setAnchorsDirty(false);
    setForm((f) => ({ ...f, anchors: generateAnchors(capitalNum) }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setError(null);

    if (!form.name.trim()) return setError("Tên cỗ máy không được để trống");
    if (!Number.isFinite(capitalNum) || capitalNum <= 0)
      return setError("Vốn phải > 0");
    if (reservePool !== undefined && capitalNum > reservePool)
      return setError(
        `Vốn (${usd.format(capitalNum)}) vượt vốn dự trữ khả dụng (${usd.format(reservePool)})`,
      );

    // Validate MT5 fields nếu user bật toggle
    if (form.mt5Enabled) {
      if (!form.mt5Login.trim() || !form.mt5Password || !form.mt5Server.trim()) {
        return setError("Bật MT5 thì phải điền đủ Login + Password + Server (hoặc tắt toggle).");
      }
      if (!/^\d+$/.test(form.mt5Login.trim())) {
        return setError("MT5 Login phải là số nguyên (vd: 153152412).");
      }
    }

    setSubmitting(true);

    // Step 1: tạo cỗ máy như cũ (sync local + fire-and-forget cloud push)
    const machine = addMachine(userId, {
      name: form.name.trim(),
      capital: capitalNum,
      current_anchor: capitalNum, // Anchor khởi đầu = vốn ban đầu
      method: form.method.trim() || undefined,
      signal_source: form.signalSource,
      risk_per_trade_pct: Number(form.riskPerTrade) || undefined,
      max_drawdown_pct: Number(form.maxDd) || undefined,
      target_withdraw_count: Number(form.targetWithdrawCount) || undefined,
      target_profit: Number(form.targetProfit) || undefined,
      anchor_milestones: form.anchors.length > 0 ? form.anchors : undefined,
    });

    // Step 2: link MT5 nếu user bật. Server action retry chờ cloudPush.machine.
    if (form.mt5Enabled) {
      const res = await linkMt5ToMachine({
        userId,
        machineId: machine.id,
        login: form.mt5Login.trim(),
        password: form.mt5Password,
        server: form.mt5Server.trim(),
      });
      if (!res.success) {
        setError(
          `Cỗ máy "${machine.name}" đã tạo nhưng link MT5 thất bại: ${res.error}. ` +
          `Xoá cỗ máy này (Quản lý) rồi tạo lại, hoặc liên hệ admin.`,
        );
        setSubmitting(false);
        return;
      }
    }

    setSubmitting(false);
    reset();
    setOpen(false);
    onCreated();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) reset();
      }}
    >
      <DialogTrigger
        render={
          <Button variant="anchor" size="sm">
            <Plus className="h-3.5 w-3.5" />
            Tạo cỗ máy mới
          </Button>
        }
      />
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Khởi tạo cỗ máy mới</DialogTitle>
          <DialogDescription>
            Cấu hình đầy đủ trước khi khởi động — phương pháp, mức rủi ro, mục tiêu chu kỳ
            và các mốc neo kỷ luật.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 mt-2">
          {/* Tên + Phương pháp */}
          <Field label="Tên cỗ máy">
            <Input
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              placeholder="VD: Scalping EURUSD sáng"
              autoFocus
              className="h-11 text-base"
            />
          </Field>

          <Field
            label="Phương pháp"
            hint="Tên phương pháp bạn dùng cho cỗ máy này."
          >
            <Input
              value={form.method}
              onChange={(e) => update("method", e.target.value)}
              placeholder="VD: 3-Box Method, Swing theo trend, Mean reversion..."
              className="h-11 text-base"
            />
          </Field>

          {/* Vốn + Nguồn tín hiệu */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field
              label="Vốn ($)"
              hint={
                reserveHint
                  ? `Reserve: ${usd.format(reserveHint.reserve)}`
                  : undefined
              }
            >
              <Input
                type="number"
                value={form.capital}
                onChange={(e) => update("capital", e.target.value)}
                placeholder="200"
                min={1}
                step="1"
                className="h-11 text-base"
              />
            </Field>
            <Field label="Nguồn tín hiệu">
              <NativeSelect
                value={form.signalSource}
                onChange={(v) => update("signalSource", v as SignalSource)}
              >
                {SIGNAL_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </NativeSelect>
            </Field>
          </div>

          {/* Rủi ro + DD */}
          <div className="grid grid-cols-2 gap-4">
            <Field label="Rủi ro / lệnh (%)">
              <Input
                type="number"
                value={form.riskPerTrade}
                onChange={(e) => update("riskPerTrade", e.target.value)}
                placeholder="2"
                min={0}
                step="0.1"
                className="h-11 text-base"
              />
            </Field>
            <Field label="DD tối đa (%)">
              <Input
                type="number"
                value={form.maxDd}
                onChange={(e) => update("maxDd", e.target.value)}
                placeholder="30"
                min={0}
                step="1"
                className="h-11 text-base"
              />
            </Field>
          </div>

          {/* Mục tiêu chu kỳ */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Mục tiêu chu kỳ
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <Field
                label=""
                hint="Số lần rút mục tiêu"
              >
                <Input
                  type="number"
                  value={form.targetWithdrawCount}
                  onChange={(e) => update("targetWithdrawCount", e.target.value)}
                  placeholder="VD: 10"
                  min={1}
                  step="1"
                  className="h-11 text-base"
                />
              </Field>
              <Field
                label=""
                hint="Tổng lợi nhuận mục tiêu ($)"
              >
                <Input
                  type="number"
                  value={form.targetProfit}
                  onChange={(e) => update("targetProfit", e.target.value)}
                  placeholder="VD: 300"
                  min={0}
                  step="1"
                  className="h-11 text-base"
                />
              </Field>
            </div>
          </div>

          {/* Mốc neo */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Mốc neo — tự động sinh, có thể chỉnh tay
            </h3>
            <div className="rounded-xl border-2 border-dashed border-border bg-card/50 p-3 space-y-2">
              {form.anchors.length === 0 && (
                <p className="text-sm text-muted-foreground italic text-center py-2">
                  Nhập vốn để sinh mốc neo tự động.
                </p>
              )}
              {form.anchors.map((a, i) => (
                <div key={i} className="flex items-center gap-2 rounded-lg border border-border bg-card pl-3">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground tabular-nums w-12 shrink-0">
                    Neo {i + 1}
                  </span>
                  <Input
                    type="number"
                    value={a}
                    onChange={(e) => updateAnchor(i, Number(e.target.value) || 0)}
                    min={0}
                    step="1"
                    className="h-10 border-0 focus-visible:ring-0 px-2 text-base font-semibold tabular-nums"
                  />
                  <button
                    type="button"
                    onClick={() => removeAnchor(i)}
                    className="px-3 py-2 text-muted-foreground hover:text-destructive transition-colors shrink-0"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={resetAnchors}
                className="flex-1"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset tự động
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addAnchor}
                className="flex-1"
                disabled={!Number.isFinite(capitalNum) || capitalNum <= 0}
              >
                <Plus className="h-3.5 w-3.5" />
                Thêm mốc
              </Button>
            </div>
            <p className="text-xs italic text-muted-foreground/80">
              Vượt mốc — rút phần dư về mốc đó ngay.
            </p>
          </div>

          {/* MT5 monitoring (optional) */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Giám sát MT5 (tuỳ chọn)
            </h3>
            <label className="flex items-start gap-2 cursor-pointer rounded-xl border border-border bg-card p-3">
              <input
                type="checkbox"
                checked={form.mt5Enabled}
                onChange={(e) => update("mt5Enabled", e.target.checked)}
                className="mt-0.5 h-4 w-4 cursor-pointer"
              />
              <div className="flex-1 space-y-0.5">
                <div className="text-sm font-medium">
                  Cỗ máy này có MT5 — bật giám sát kỷ luật tự động
                </div>
                <div className="text-xs italic text-muted-foreground/80">
                  Hệ thống đọc data MT5 qua INVESTOR password (read-only),
                  so sánh với log của bạn để chấm điểm kỷ luật mỗi ngày.
                </div>
              </div>
            </label>

            {form.mt5Enabled && (
              <div className="space-y-3 rounded-xl border-2 border-dashed border-border bg-card/50 p-3">
                <Field label="MT5 Login" hint="Số tài khoản MT5 (số nguyên)">
                  <Input
                    type="text"
                    inputMode="numeric"
                    value={form.mt5Login}
                    onChange={(e) => update("mt5Login", e.target.value)}
                    placeholder="VD: 153152412"
                    className="h-11 text-base"
                  />
                </Field>
                <Field
                  label="MT5 Investor Password"
                  hint="Password CHỈ ĐỌC — KHÔNG phải master password. Lấy trong MT5 → File → Login to Trade Account → Save investor password."
                >
                  <Input
                    type="password"
                    value={form.mt5Password}
                    onChange={(e) => update("mt5Password", e.target.value)}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    className="h-11 text-base"
                  />
                </Field>
                <Field label="MT5 Server" hint="Tên server broker chính xác">
                  <Input
                    type="text"
                    value={form.mt5Server}
                    onChange={(e) => update("mt5Server", e.target.value)}
                    placeholder="VD: HFMarketsGlobal-Live11"
                    className="h-11 text-base"
                  />
                </Field>
              </div>
            )}
          </div>

          {error && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          <DialogFooter className="-mx-4 -mb-4 mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={submitting}
            >
              Huỷ
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="bg-foreground text-background hover:bg-foreground/90 px-8 disabled:opacity-60"
            >
              {submitting ? "Đang khởi tạo..." : "Khởi động"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          {label}
        </label>
      )}
      {children}
      {hint && <p className={cn("text-xs italic text-muted-foreground/80")}>{hint}</p>}
    </div>
  );
}

function NativeSelect({
  value,
  onChange,
  children,
}: {
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-11 w-full rounded-lg border border-input bg-transparent px-3 text-base focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 outline-none"
    >
      {children}
    </select>
  );
}
