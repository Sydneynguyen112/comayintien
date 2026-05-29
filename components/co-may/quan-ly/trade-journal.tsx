"use client";

import { useState } from "react";
import { Pencil, Plus, X } from "lucide-react";
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
import { recordTransaction, updateTransaction } from "@/lib/co-may/mock-data";
import type { CurrencyUnit, MachineTransaction, TradeDirection } from "@/lib/co-may/types";
import { formatMoney, resolveUnit, toDisplay, toUSD, UNIT_SYMBOL } from "@/lib/co-may/currency";
import { SymbolCombobox } from "./symbol-combobox";

interface Props {
  ownerId: string;
  machineId: string;
  tx: MachineTransaction[];
  unit?: CurrencyUnit;
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

export function TradeJournal({ ownerId, machineId, tx, unit, onChange, readOnly }: Props) {
  const fmt = (n: number) => formatMoney(n, unit);
  const unitSym = UNIT_SYMBOL[resolveUnit(unit)];
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<TradeFormState>(INITIAL_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function openCreate() {
    setEditingId(null);
    setForm(INITIAL_FORM);
    setError(null);
    setOpen(true);
  }

  function openEdit(t: MachineTransaction) {
    setEditingId(t.id);
    setForm({
      direction: t.direction ?? "long",
      symbol: t.symbol ?? "",
      volume: t.volume != null ? String(t.volume) : "",
      pnl: String(Math.round(toDisplay(t.amount, unit) * 100) / 100),
      entryReason: t.entry_reason ?? "",
      exitReason: t.exit_reason ?? "",
      emotion: t.emotion ?? "",
    });
    setError(null);
    setOpen(true);
  }

  function closeDialog() {
    setOpen(false);
    setForm(INITIAL_FORM);
    setEditingId(null);
    setError(null);
  }

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
    // PNL nhập theo đơn vị hiển thị của máy (USD/¢) → quy về USD canonical để lưu,
    // giống vốn & rút tiền. Nếu không, máy cent nhập 45¢ sẽ bị lưu thành $45.
    const payload = {
      type: (pnlNum > 0 ? "trade_win" : "trade_loss") as MachineTransaction["type"],
      amount: toUSD(pnlNum, unit),
      direction: form.direction,
      symbol: form.symbol.trim() || undefined,
      volume: Number.isFinite(volNum) && volNum > 0 ? volNum : undefined,
      entry_reason: form.entryReason.trim() || undefined,
      exit_reason: form.exitReason.trim() || undefined,
      emotion: form.emotion.trim() || undefined,
    };
    if (editingId) {
      updateTransaction(ownerId, editingId, payload);
    } else {
      recordTransaction(ownerId, machineId, payload);
    }
    closeDialog();
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
            onClick={openCreate}
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
              <Th align="right">PNL ({unitSym})</Th>
              <Th>Lý do vào</Th>
              <Th>Lý do thoát</Th>
              <Th>Cảm xúc</Th>
              {!readOnly && <Th align="right">Sửa</Th>}
            </tr>
          </thead>
          <tbody>
            {trades.length === 0 ? (
              <tr>
                <td colSpan={readOnly ? 8 : 9} className="px-5 py-8 text-center text-sm italic text-muted-foreground">
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
                        {fmt(t.amount)}
                      </span>
                    </Td>
                    <Td>{t.entry_reason ?? "—"}</Td>
                    <Td>{t.exit_reason ?? "—"}</Td>
                    <Td className="italic text-muted-foreground">{t.emotion ?? "—"}</Td>
                    {!readOnly && (
                      <Td align="right">
                        <button
                          type="button"
                          onClick={() => openEdit(t)}
                          className="inline-flex items-center justify-center rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                          title="Điều chỉnh lệnh"
                          aria-label="Điều chỉnh lệnh"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                      </Td>
                    )}
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
          if (!v) closeDialog();
          else setOpen(true);
        }}
      >
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Điều chỉnh lệnh" : "Ghi nhận lệnh mới"}</DialogTitle>
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
                  className="h-11 w-full rounded-lg border border-input bg-background text-foreground px-2.5 text-base focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 outline-none"
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
              <Field label={`PNL (${unitSym})`} required>
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
              <Button type="button" variant="outline" onClick={closeDialog}>
                <X className="h-3.5 w-3.5" />
                Huỷ
              </Button>
              <Button type="submit" variant="anchor">
                {editingId ? <Pencil className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                {editingId ? "Lưu thay đổi" : "Ghi nhận"}
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
