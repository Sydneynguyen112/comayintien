"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn, formatDate } from "@/lib/utils";
import { recordTransaction } from "@/lib/co-may/mock-data";
import type { MachineTransaction, TradeDirection } from "@/lib/co-may/types";
import { SymbolCombobox } from "./symbol-combobox";

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

interface Props {
  ownerId: string;
  machineId: string;
  tx: MachineTransaction[];
  onChange: () => void;
  readOnly?: boolean;
}

interface TradeFormState {
  direction: TradeDirection;
  symbol: string;
  volume: string;
  pnl: string; // signed
  entryReason: string;
  exitReason: string;
  emotion: string;
}

const INITIAL_FORM: TradeFormState = {
  direction: "long",
  symbol: "",
  volume: "",
  pnl: "",
  entryReason: "",
  exitReason: "",
  emotion: "",
};

export function TradeJournal({ ownerId, machineId, tx, onChange, readOnly }: Props) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<TradeFormState>(INITIAL_FORM);
  const [error, setError] = useState<string | null>(null);

  const trades = tx
    .filter((t) => t.type === "trade_win" || t.type === "trade_loss")
    .sort((a, b) => b.created_at.localeCompare(a.created_at));

  const wins = trades.filter((t) => t.type === "trade_win").length;
  const wr = trades.length > 0 ? Math.round((wins / trades.length) * 100) : 0;
  const winSum = trades.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const lossSum = -trades.filter((t) => t.amount < 0).reduce((s, t) => s + t.amount, 0);
  const rrAvg = lossSum > 0 ? winSum / lossSum : 0;

  function update<K extends keyof TradeFormState>(key: K, value: TradeFormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.symbol.trim()) {
      return setError("Cặp / Mã không được để trống");
    }
    const volNum = Number(form.volume);
    if (!Number.isFinite(volNum) || volNum <= 0) {
      return setError("Khối lượng phải > 0");
    }
    const pnlNum = Number(form.pnl);
    if (!Number.isFinite(pnlNum) || pnlNum === 0) {
      return setError("PNL phải là số ≠ 0");
    }
    recordTransaction(ownerId, machineId, {
      type: pnlNum > 0 ? "trade_win" : "trade_loss",
      amount: pnlNum,
      direction: form.direction,
      symbol: form.symbol.trim() || undefined,
      volume: Number.isFinite(volNum) && volNum > 0 ? volNum : undefined,
      entry_reason: form.entryReason.trim() || undefined,
      exit_reason: form.exitReason.trim() || undefined,
      emotion: form.emotion.trim() || undefined,
    });
    setForm(INITIAL_FORM);
    setError(null);
    setOpen(false);
    onChange();
  }

  return (
    <section className="rounded-2xl border border-border bg-card overflow-hidden">
      <header className="px-5 py-3.5 border-b border-border flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <h3 className="text-base md:text-lg font-semibold text-foreground">Nhật ký giao dịch</h3>
          <span className="text-xs uppercase tracking-widest text-muted-foreground tabular-nums">
            {trades.length} lệnh · WR {wr}% · R:R {rrAvg.toFixed(2)}
          </span>
        </div>
        {!readOnly && (
          <Button
            type="button"
            variant="anchor"
            size="sm"
            onClick={() => setOpen(true)}
            className="shrink-0"
          >
            <Plus className="h-3.5 w-3.5" />
            Ghi nhận lệnh mới
          </Button>
        )}
      </header>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/30">
            <tr className="text-left text-[11px] uppercase tracking-widest text-muted-foreground">
              <Th>Ngày</Th>
              <Th>Hướng</Th>
              <Th>Cặp / Mã</Th>
              <Th align="right">Khối lượng</Th>
              <Th align="right">PNL ($)</Th>
              <Th>Lý do vào</Th>
              <Th>Lý do thoát</Th>
              <Th>Cảm xúc</Th>
            </tr>
          </thead>
          <tbody>
            {trades.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-5 py-8 text-center text-sm italic text-muted-foreground">
                  Chưa có giao dịch nào.
                </td>
              </tr>
            ) : (
              trades.map((t) => {
                const tone = t.amount > 0 ? "profit" : t.amount < 0 ? "loss" : undefined;
                return (
                  <tr key={t.id} className="border-t border-border/60 hover:bg-muted/15 transition-colors">
                    <Td>{formatDate(t.created_at)}</Td>
                    <Td>
                      <span
                        className={cn(
                          "uppercase text-[11px] font-semibold tracking-wider",
                          t.direction === "short" ? "text-foreground" : "text-[#5C9C75]",
                        )}
                      >
                        {t.direction ?? "long"}
                      </span>
                    </Td>
                    <Td>
                      <span className="font-mono text-foreground">{t.symbol ?? "—"}</span>
                    </Td>
                    <Td align="right">{t.volume?.toFixed(2) ?? "—"}</Td>
                    <Td align="right">
                      <span
                        className={cn(
                          "font-semibold tabular-nums",
                          tone === "profit" && "text-[#5C9C75]",
                          tone === "loss" && "text-foreground",
                        )}
                      >
                        {t.amount > 0 ? "+" : ""}
                        {usd.format(t.amount)}
                      </span>
                    </Td>
                    <Td>{t.entry_reason ?? "—"}</Td>
                    <Td>{t.exit_reason ?? "—"}</Td>
                    <Td className="italic text-muted-foreground">{t.emotion ?? "—"}</Td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <Dialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) {
            setForm(INITIAL_FORM);
            setError(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Ghi nhận lệnh mới</DialogTitle>
            <DialogDescription>
              <span className="text-destructive">*</span> bắt buộc · còn lại là tùy chọn (lý do, cảm xúc)
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Field label="Hướng" required>
                <select
                  value={form.direction}
                  onChange={(e) => update("direction", e.target.value as TradeDirection)}
                  className="h-11 w-full rounded-lg border border-input bg-transparent px-2.5 text-base focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 outline-none"
                >
                  <option value="long">Long</option>
                  <option value="short">Short</option>
                </select>
              </Field>
              <Field label="Cặp / Mã" required>
                <SymbolCombobox
                  value={form.symbol}
                  onChange={(v) => update("symbol", v)}
                  placeholder="EURUSD, BTC..."
                  required
                />
              </Field>
              <Field label="Khối lượng" required>
                <Input
                  type="number"
                  step="0.01"
                  value={form.volume}
                  onChange={(e) => update("volume", e.target.value)}
                  placeholder="0.05"
                  className="h-11 text-base"
                  required
                />
              </Field>
              <Field label="PNL ($)" required>
                <Input
                  type="number"
                  step="0.01"
                  value={form.pnl}
                  onChange={(e) => update("pnl", e.target.value)}
                  placeholder="+45 hoặc -32"
                  className="h-11 text-base"
                  autoFocus
                  required
                />
              </Field>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Field label="Lý do vào">
                <Input
                  value={form.entryReason}
                  onChange={(e) => update("entryReason", e.target.value)}
                  placeholder="Setup pullback... (tuỳ chọn)"
                  className="h-11 text-base"
                />
              </Field>
              <Field label="Lý do thoát">
                <Input
                  value={form.exitReason}
                  onChange={(e) => update("exitReason", e.target.value)}
                  placeholder="Hit TP / SL / kỷ luật (tuỳ chọn)"
                  className="h-11 text-base"
                />
              </Field>
              <Field label="Cảm xúc">
                <Input
                  value={form.emotion}
                  onChange={(e) => update("emotion", e.target.value)}
                  placeholder="bình tĩnh, lo lắng... (tuỳ chọn)"
                  className="h-11 text-base"
                />
              </Field>
            </div>

            {error && (
              <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}

            <DialogFooter className="-mx-4 -mb-4 mt-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setOpen(false);
                  setForm(INITIAL_FORM);
                  setError(null);
                }}
              >
                <X className="h-3.5 w-3.5" />
                Huỷ
              </Button>
              <Button type="submit" variant="anchor">
                <Plus className="h-3.5 w-3.5" />
                Ghi nhận
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}

function Th({
  children,
  align,
}: {
  children: React.ReactNode;
  align?: "right";
}) {
  return (
    <th className={cn("px-4 py-2 font-medium whitespace-nowrap", align === "right" && "text-right")}>
      {children}
    </th>
  );
}

function Td({
  children,
  align,
  className,
}: {
  children: React.ReactNode;
  align?: "right";
  className?: string;
}) {
  return (
    <td
      className={cn(
        "px-4 py-2.5 text-foreground/90 whitespace-nowrap",
        align === "right" && "text-right",
        className,
      )}
    >
      {children}
    </td>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label className="block text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}
