"use client";

import { useEffect, useRef, useState } from "react";
import { Wallet, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
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
import { recordTransaction } from "@/lib/co-may/mock-data";
import { fireworks, FIREWORK_DURATION } from "@/lib/co-may/celebrate";
import { isSeniorMode } from "@/lib/co-may/senior-ui";

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export function WithdrawModal({
  ownerId,
  machineId,
  currentAnchor,
  onChange,
  role,
}: {
  ownerId: string;
  machineId: string;
  currentAnchor: number;
  onChange: () => void;
  role?: string | null;
}) {
  const senior = isSeniorMode(role);
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [celebrating, setCelebrating] = useState<{ amount: number } | null>(null);
  const celebrateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (celebrateTimerRef.current) clearTimeout(celebrateTimerRef.current);
    };
  }, []);

  function reset() {
    setAmount("");
    setError(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    const a = Number(amount);
    if (!Number.isFinite(a) || a <= 0) return setError("Số tiền phải > 0");
    if (a > currentAnchor)
      return setError(`Vượt anchor — chỉ rút tối đa ${usd.format(currentAnchor)}`);

    setSubmitting(true);
    try {
      recordTransaction(ownerId, machineId, {
        type: "withdraw",
        amount: -a,
        note: `Rút ${usd.format(a)}`,
      });
    } catch (err) {
      setSubmitting(false);
      return setError(err instanceof Error ? err.message : "Không thể rút");
    }
    setOpen(false);
    reset();
    onChange();
    setCelebrating({ amount: a });
    fireworks();
    if (celebrateTimerRef.current) clearTimeout(celebrateTimerRef.current);
    celebrateTimerRef.current = setTimeout(() => {
      setCelebrating(null);
      setSubmitting(false);
      celebrateTimerRef.current = null;
    }, FIREWORK_DURATION);
  }

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) reset();
        }}
      >
        <DialogTrigger
          render={
            <Button variant="anchor" size={senior ? "lg" : "default"} className="w-full">
              <Wallet className={senior ? "h-4 w-4" : "h-3.5 w-3.5"} />
              Rút tiền
            </Button>
          }
        />
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Rút tiền từ cỗ máy</DialogTitle>
            <DialogDescription>
              Anchor hiện tại: <span className="font-semibold text-primary">{usd.format(currentAnchor)}</span>.
              Rút tiền là khoảnh khắc thưởng cho kỷ luật của bạn.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-3 mt-2">
            <div className="space-y-1.5">
              <label className={senior ? "text-sm font-medium text-foreground" : "text-xs font-medium text-foreground"}>
                Số tiền (USD)
              </label>
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="500"
                min={0.01}
                step="0.01"
                autoFocus
                className={senior ? "h-11 text-base" : ""}
              />
            </div>
            {error && <p className={senior ? "text-sm text-destructive" : "text-xs text-destructive"}>{error}</p>}

            <DialogFooter className="-mx-4 -mb-4 mt-3">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Huỷ
              </Button>
              <Button type="submit" variant="anchor" disabled={submitting}>
                <Sparkles className="h-3.5 w-3.5" />
                {submitting ? "Đang xử lý..." : `Rút ${amount ? usd.format(Number(amount) || 0) : ""}`}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AnimatePresence>
        {celebrating && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", duration: 0.4 }}
            className="fixed inset-0 z-[60] flex items-center justify-center pointer-events-none px-4"
          >
            <div className="bg-card border-2 border-primary rounded-3xl px-8 py-6 shadow-2xl gold-glow text-center space-y-2 max-w-sm">
              <div className="flex justify-center">
                <Sparkles className="h-10 w-10 text-primary" />
              </div>
              <h3 className="text-2xl font-bold gold-gradient-text">
                Rút thành công {usd.format(celebrating.amount)}
              </h3>
              <p className="text-sm text-muted-foreground">
                Kỷ luật được tưởng thưởng. Tiếp tục giữ vững nhịp giao dịch.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
