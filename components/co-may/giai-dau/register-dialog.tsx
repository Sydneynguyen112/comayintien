"use client";

// Khách đăng ký giải: tạo CỖ MÁY MỚI riêng cho giải (theo rules) rồi gửi đăng ký (pending).

import { useState } from "react";
import { Trophy } from "lucide-react";
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
import { addMachine, deleteMachine } from "@/lib/co-may/mock-data";
import { pushMachineNow } from "@/lib/co-may/cloud-sync";
import { registerForTournament } from "@/lib/co-may/tournament-actions";
import { formatMoney, toUSD } from "@/lib/co-may/currency";
import type { CurrencyUnit, Tournament } from "@/lib/co-may/types";
import { currencyLabel, formatCapitalRange } from "@/lib/co-may/tournament-format";

function generateAnchors(capital: number): number[] {
  if (!Number.isFinite(capital) || capital <= 0) return [];
  const out: number[] = [];
  let v = capital;
  for (let i = 0; i < 5; i++) {
    out.push(Math.max(1, Math.round(v)));
    v *= 0.8;
  }
  return out;
}

export function RegisterDialog({
  tournament,
  userId,
  onRegistered,
}: {
  tournament: Tournament;
  userId: string;
  onRegistered: () => void;
}) {
  const locked = tournament.required_currency ?? null;
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [method, setMethod] = useState("");
  const [unit, setUnit] = useState<CurrencyUnit>(locked ?? "USD");
  const [capital, setCapital] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sym = unit === "USC" ? "¢" : "$";

  function reset() {
    setName("");
    setMethod("");
    setUnit(locked ?? "USD");
    setCapital("");
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    if (!name.trim()) return setError("Tên cỗ máy không được để trống.");
    const capNum = Number(capital);
    if (!Number.isFinite(capNum) || capNum <= 0) return setError("Vốn phải > 0.");

    const capUSD = toUSD(capNum, unit);
    if (tournament.min_capital != null && capUSD < tournament.min_capital)
      return setError(`Vốn phải ≥ ${formatMoney(tournament.min_capital, unit)}.`);
    if (tournament.max_capital != null && capUSD > tournament.max_capital)
      return setError(`Vốn phải ≤ ${formatMoney(tournament.max_capital, unit)}.`);

    setSubmitting(true);
    // 1. Tạo máy mới (local) + đẩy lên cloud, AWAIT để tránh race FK khi đăng ký
    const machine = addMachine(userId, {
      name: name.trim(),
      capital: capUSD,
      current_anchor: capUSD,
      currency_unit: unit === "USC" ? "USC" : undefined,
      method: method.trim() || undefined,
      anchor_milestones: generateAnchors(capNum).map((a) => toUSD(a, unit)),
    });
    const push = await pushMachineNow(userId, machine);
    if (push.error) {
      deleteMachine(userId, machine.id);
      setSubmitting(false);
      return setError(`Lưu cỗ máy lên cloud thất bại: ${push.error.message ?? ""}`);
    }
    // 2. Đăng ký (enforce rules server-side)
    const res = await registerForTournament({
      tournamentId: tournament.id,
      machineId: machine.id,
      userId,
    });
    if (!res.success) {
      // rollback máy để không để máy mồ côi
      deleteMachine(userId, machine.id);
      setSubmitting(false);
      return setError(res.error ?? "Đăng ký thất bại.");
    }
    setSubmitting(false);
    setOpen(false);
    reset();
    onRegistered();
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
          <Button variant="anchor" size="default">
            <Trophy className="h-4 w-4" />
            Đăng ký tham gia
          </Button>
        }
      />
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Đăng ký &ldquo;{tournament.title}&rdquo;</DialogTitle>
          <DialogDescription>
            Tạo 1 cỗ máy mới riêng cho giải. Đăng ký sẽ chờ admin duyệt trước khi lên bảng xếp hạng.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground space-y-0.5 mb-1">
          <div>{currencyLabel(tournament.required_currency)}</div>
          <div>Vốn cho phép: <span className="text-foreground">{formatCapitalRange(tournament)}</span></div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 mt-1">
          <Field label="Tên cỗ máy *">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="VD: Máy dự giải tháng 6" autoFocus className="h-11 text-base" />
          </Field>

          <Field label="Phương pháp" hint="Tuỳ chọn">
            <Input value={method} onChange={(e) => setMethod(e.target.value)} placeholder="VD: 3-Box, Swing..." className="h-11 text-base" />
          </Field>

          {!locked && (
            <Field label="Đơn vị tiền tệ">
              <div className="grid grid-cols-2 gap-2">
                {(["USD", "USC"] as CurrencyUnit[]).map((u) => (
                  <button
                    key={u}
                    type="button"
                    onClick={() => setUnit(u)}
                    className={
                      "h-11 rounded-lg border-2 px-3 text-sm font-semibold transition-colors " +
                      (unit === u
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background text-muted-foreground hover:bg-muted")
                    }
                  >
                    {u === "USC" ? "USC (¢) · Cent" : "USD ($) · Thường"}
                  </button>
                ))}
              </div>
            </Field>
          )}

          <Field label={`Vốn (${sym})`}>
            <Input type="number" value={capital} onChange={(e) => setCapital(e.target.value)} placeholder={unit === "USC" ? "2000" : "200"} min={1} className="h-11 text-base" />
          </Field>

          {error && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">{error}</div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={submitting}>Huỷ</Button>
            <Button type="submit" variant="anchor" disabled={submitting}>
              {submitting ? "Đang gửi..." : "Đăng ký"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold uppercase tracking-widest text-muted-foreground">{label}</label>
      {children}
      {hint && <p className="text-xs italic text-muted-foreground/80">{hint}</p>}
    </div>
  );
}
