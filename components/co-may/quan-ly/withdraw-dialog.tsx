"use client";

import { useEffect, useRef, useState } from "react";
import { Sparkles, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { recordTransaction } from "@/lib/co-may/mock-data";
import { fireworks, FIREWORK_DURATION } from "@/lib/co-may/celebrate";
import {
  formatMoney,
  toDisplay,
  toUSD,
  UNIT_SYMBOL,
  resolveUnit,
} from "@/lib/co-may/currency";
import type { CurrencyUnit } from "@/lib/co-may/types";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  ownerId: string;
  machineId: string;
  /** Amount preset theo USD (vd: balance - currentAnchor). */
  presetAmount: number;
  /** Mốc neo hiện tại (USD) — hiển thị "về mốc X". */
  currentAnchor: number;
  /** Đơn vị hiển thị của cỗ máy (USD / USC). */
  unit?: CurrencyUnit;
  onSuccess: () => void;
}

export function WithdrawDialog({
  open,
  onOpenChange,
  ownerId,
  machineId,
  presetAmount,
  currentAnchor,
  unit,
  onSuccess,
}: Props) {
  const fmt = (n: number) => formatMoney(n, unit);
  const symbol = UNIT_SYMBOL[resolveUnit(unit)];
  // `amount` lưu THEO đơn vị hiển thị; quy về USD khi ghi nhận.
  const [amount, setAmount] = useState(toDisplay(presetAmount, unit));
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [celebrating, setCelebrating] = useState<{ amount: number; anchor: number } | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset amount khi dialog mở lại với preset mới
  useEffect(() => {
    if (open) setAmount(toDisplay(presetAmount, unit));
  }, [open, presetAmount, unit]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting || amount <= 0) return;
    const amountUSD = toUSD(amount, unit);
    setSubmitting(true);
    try {
      recordTransaction(ownerId, machineId, {
        type: "withdraw",
        amount: -amountUSD,
        note: note.trim() || `Rút ${fmt(amountUSD)} về mốc ${fmt(currentAnchor)}`,
      });
    } catch (err) {
      setSubmitting(false);
      // eslint-disable-next-line no-alert
      alert(err instanceof Error ? err.message : "Không rút được");
      return;
    }
    onOpenChange(false);
    setNote("");
    onSuccess();
    setCelebrating({ amount: amountUSD, anchor: currentAnchor });
    fireworks();
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setCelebrating(null);
      setSubmitting(false);
      timerRef.current = null;
    }, FIREWORK_DURATION);
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Ghi nhận rút tiền</DialogTitle>
          </DialogHeader>

          <div className="rounded-2xl border-2 border-[#3B6C4F]/30 bg-[#3B6C4F]/5 p-5 text-center space-y-1.5 mt-1">
            <div className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              Số tiền rút
            </div>
            <div className="flex items-center justify-center gap-1 text-4xl md:text-5xl font-bold text-[#3B6C4F] dark:text-[#5C9C75] tabular-nums leading-none">
              <span>{symbol}</span>
              <input
                type="number"
                min={0}
                value={amount === 0 ? "" : amount}
                onChange={(e) => setAmount(Math.max(0, Math.floor(Number(e.target.value) || 0)))}
                placeholder="0"
                className="bg-transparent outline-none text-center w-[6ch] tabular-nums focus-visible:ring-2 focus-visible:ring-[#3B6C4F]/40 rounded-lg"
              />
            </div>
            <div className="text-sm text-muted-foreground">
              về mốc <strong className="text-foreground">{fmt(currentAnchor)}</strong>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3 mt-2">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Ghi chú (tuỳ chọn)
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Lý do rút, cảm nhận..."
                rows={3}
                className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-base focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 outline-none resize-none"
              />
            </div>

            <DialogFooter className="-mx-4 -mb-4 mt-3">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Huỷ
              </Button>
              <Button
                type="submit"
                disabled={submitting || amount <= 0}
                className="bg-[#3B6C4F] hover:bg-[#2F5840] text-white px-6"
              >
                <Sparkles className="h-3.5 w-3.5" />
                {submitting ? "Đang xử lý..." : "Ghi nhận rút"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AnimatePresence>
        {celebrating && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", duration: 0.4 }}
            className="fixed inset-0 z-[60] flex items-center justify-center pointer-events-none px-4"
          >
            <div className="bg-card border-2 border-primary rounded-3xl px-10 py-7 shadow-2xl gold-glow text-center space-y-3 max-w-md">
              <div className="text-[11px] font-semibold uppercase tracking-widest text-primary">
                Chúc mừng
              </div>
              <h3 className="text-3xl md:text-4xl font-bold text-foreground">
                Đã rút <span className="text-[#3B6C4F] dark:text-[#5C9C75]">{fmt(celebrating.amount)}</span>
              </h3>
              <p className="text-sm text-muted-foreground">
                về mốc <strong className="text-foreground">{fmt(celebrating.anchor)}</strong>
              </p>
              <div className="border-t border-dashed border-border pt-3">
                <p className="text-sm md:text-base text-foreground/80 italic">
                  Một nhịp rút sạch sẽ. Cứ giữ kỷ luật như vậy.
                </p>
              </div>
              <button
                type="button"
                className="text-[10px] uppercase tracking-widest text-muted-foreground/60"
              >
                ESC
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
