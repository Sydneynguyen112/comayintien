"use client";

import { useState } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { recordTransaction } from "@/lib/co-may/mock-data";
import { isSeniorMode } from "@/lib/co-may/senior-ui";

export function TradeInput({
  ownerId,
  machineId,
  onChange,
  role,
}: {
  ownerId: string;
  machineId: string;
  onChange: () => void;
  role?: string | null;
}) {
  const senior = isSeniorMode(role);
  const inputCls = senior ? "h-11 text-base" : "";
  const [type, setType] = useState<"trade_win" | "trade_loss">("trade_win");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const a = Number(amount);
    if (!Number.isFinite(a) || a <= 0) return setError("Số tiền phải > 0");
    setError(null);

    recordTransaction(ownerId, machineId, {
      type,
      amount: type === "trade_win" ? a : -a,
      note: note.trim() || null,
    });
    setAmount("");
    setNote("");
    onChange();
  }

  const togglePadCls = senior ? "px-4 py-3 text-base" : "px-3 py-2 text-sm";

  return (
    <div className={cn("rounded-2xl border border-border bg-card space-y-4", senior ? "p-6" : "p-5")}>
      <h3 className={cn("font-semibold text-foreground", senior ? "text-base" : "text-sm")}>
        Ghi nhận giao dịch
      </h3>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setType("trade_win")}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 rounded-lg font-medium border-2 transition-colors",
              togglePadCls,
              type === "trade_win"
                ? "border-[#3B6C4F] bg-[#3B6C4F]/10 text-[#3B6C4F] dark:text-[#5C9C75]"
                : "border-border text-muted-foreground hover:bg-muted",
            )}
          >
            <TrendingUp className={senior ? "h-4 w-4" : "h-3.5 w-3.5"} />
            Lệnh thắng
          </button>
          <button
            type="button"
            onClick={() => setType("trade_loss")}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 rounded-lg font-medium border-2 transition-colors",
              togglePadCls,
              type === "trade_loss"
                ? "border-primary bg-primary/10 text-foreground"
                : "border-border text-muted-foreground hover:bg-muted",
            )}
          >
            <TrendingDown className={senior ? "h-4 w-4" : "h-3.5 w-3.5"} />
            Lệnh thua
          </button>
        </div>

        <Input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Số tiền (USD)"
          min={0.01}
          step="0.01"
          className={inputCls}
        />

        <Input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Ghi chú (tuỳ chọn)..."
          className={inputCls}
        />

        {error && <p className={senior ? "text-sm text-destructive" : "text-xs text-destructive"}>{error}</p>}

        <Button type="submit" variant="default" size={senior ? "lg" : "default"} className="w-full">
          Ghi nhận
        </Button>
      </form>
    </div>
  );
}
