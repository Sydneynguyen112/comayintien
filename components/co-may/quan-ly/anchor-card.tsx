"use client";

import { useState } from "react";
import { Anchor, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { recordTransaction, updateMachine } from "@/lib/co-may/mock-data";
import type { Machine } from "@/lib/co-may/types";
import { isSeniorMode, seniorCx } from "@/lib/co-may/senior-ui";

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export function AnchorCard({
  machine,
  ownerId,
  readOnly,
  onChange,
  role,
}: {
  machine: Machine;
  ownerId: string;
  readOnly?: boolean;
  onChange: () => void;
  role?: string | null;
}) {
  const senior = isSeniorMode(role);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(machine.current_anchor));
  const [error, setError] = useState<string | null>(null);

  function handleSet() {
    const newAnchor = Number(draft);
    if (!Number.isFinite(newAnchor) || newAnchor <= 0) {
      return setError("Anchor phải > 0");
    }
    if (newAnchor >= machine.current_anchor) {
      // Kỷ luật: anchor monotonic-decrease (chỉ tăng tự động qua closeCycle scale)
      return setError(`Anchor mới phải < ${usd.format(machine.current_anchor)}`);
    }
    setError(null);
    const delta = newAnchor - machine.current_anchor;
    updateMachine(ownerId, machine.id, { current_anchor: newAnchor });
    recordTransaction(ownerId, machine.id, {
      type: "anchor_change",
      amount: delta,
      note: `Hạ neo từ ${usd.format(machine.current_anchor)} xuống ${usd.format(newAnchor)}`,
    });
    setEditing(false);
    setDraft(String(newAnchor));
    onChange();
  }

  return (
    <div
      className={cn(
        "rounded-2xl border-2 border-primary/30 bg-gradient-to-br from-primary/5 via-card to-secondary/5 space-y-4",
        senior ? "p-7 md:p-8" : "p-6",
      )}
    >
      <div className={cn("flex items-center gap-2 text-muted-foreground", senior ? "text-sm" : "text-xs")}>
        <Anchor className={senior ? "h-4 w-4 text-primary" : "h-3.5 w-3.5 text-primary"} />
        <span className="uppercase tracking-wider font-semibold">Anchor hiện tại</span>
      </div>

      <div
        className={cn(
          "font-bold gold-gradient-text tabular-nums leading-none",
          senior ? "text-5xl md:text-6xl" : "text-4xl md:text-5xl",
        )}
      >
        {usd.format(machine.current_anchor)}
      </div>

      {senior ? (
        <div className="rounded-xl bg-primary/5 border border-primary/20 px-4 py-3 flex gap-2.5">
          <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <p className="text-sm text-foreground/80 leading-relaxed">
            <strong>Anchor</strong> là mức tiền &quot;neo&quot; trong cỗ máy — không cho phép rút xuống thấp hơn.
            Đây là cơ chế giữ kỷ luật: bạn chỉ được hạ neo tự nguyện, không được tăng tuỳ ý.
          </p>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          Anchor là mức giá &quot;neo&quot; — không cho phép rút xuống thấp hơn để giữ kỷ luật.
        </p>
      )}

      {!readOnly && (
        <>
          {!editing ? (
            <Button
              variant="anchor"
              size={senior ? "lg" : "default"}
              onClick={() => setEditing(true)}
              className={senior ? "w-full text-base" : "w-full"}
            >
              <Anchor className={senior ? "h-4 w-4" : "h-3.5 w-3.5"} />
              Hạ neo xuống mức mới
            </Button>
          ) : (
            <div className="space-y-2">
              <div className="flex gap-2 flex-wrap sm:flex-nowrap">
                <Input
                  type="number"
                  value={draft}
                  onChange={(e) => {
                    setDraft(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="Anchor mới (USD)"
                  max={machine.current_anchor - 1}
                  autoFocus
                  className={senior ? "h-11 text-base flex-1 min-w-0" : "flex-1 min-w-0"}
                />
                <Button variant="anchor" size={senior ? "default" : "sm"} onClick={handleSet}>
                  Xác nhận
                </Button>
                <Button
                  variant="ghost"
                  size={senior ? "default" : "sm"}
                  onClick={() => {
                    setEditing(false);
                    setError(null);
                    setDraft(String(machine.current_anchor));
                  }}
                >
                  Huỷ
                </Button>
              </div>
              {error ? (
                <p className="text-[11px] text-destructive">{error}</p>
              ) : (
                <p className="text-[11px] text-muted-foreground/70">
                  Anchor chỉ giảm — tăng được tự động khi đóng chu kỳ Scale.
                </p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
