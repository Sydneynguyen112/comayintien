"use client";

import { useState } from "react";
import { RotateCcw, TrendingUp, RefreshCw } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { closeCycleMock } from "@/lib/co-may/mock-data";
import { isSeniorMode } from "@/lib/co-may/senior-ui";

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export function CloseCycleDialog({
  ownerId,
  machineId,
  cyclePnl,
  onChange,
  role,
}: {
  ownerId: string;
  machineId: string;
  cyclePnl: number;
  onChange: () => void;
  role?: string | null;
}) {
  const senior = isSeniorMode(role);
  const [open, setOpen] = useState(false);

  function handle(decision: "reset" | "scale") {
    closeCycleMock(ownerId, machineId, decision);
    setOpen(false);
    onChange();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size={senior ? "lg" : "default"} className="w-full">
            <RefreshCw className={senior ? "h-4 w-4" : "h-3.5 w-3.5"} />
            Đóng chu kỳ
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Đóng chu kỳ giao dịch</DialogTitle>
          <DialogDescription>
            P&L chu kỳ này:{" "}
            <span
              className={
                cyclePnl > 0
                  ? "font-semibold text-[#3B6C4F] dark:text-[#5C9C75]"
                  : cyclePnl < 0
                    ? "font-semibold text-foreground"
                    : "font-semibold"
              }
            >
              {cyclePnl >= 0 ? "+" : ""}
              {usd.format(cyclePnl)}
            </span>
            . Chọn quyết định cho chu kỳ tiếp theo.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 mt-2">
          <button
            type="button"
            onClick={() => handle("reset")}
            className={cn(
              "w-full text-left rounded-xl border-2 border-border hover:border-foreground transition-colors group",
              senior ? "p-5" : "p-4",
            )}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <RotateCcw className={senior ? "h-5 w-5 text-muted-foreground group-hover:text-foreground" : "h-4 w-4 text-muted-foreground group-hover:text-foreground"} />
              <span className={cn("font-semibold text-foreground", senior && "text-lg")}>
                Reset — Giữ nguyên vốn
              </span>
            </div>
            <p className={senior ? "text-sm text-muted-foreground leading-relaxed" : "text-xs text-muted-foreground"}>
              Bắt đầu chu kỳ mới với <strong>cùng vốn + cùng anchor</strong>. Bộ đếm ngày
              hoạt động (Days active) sẽ được đặt lại về 0. Phù hợp khi bạn muốn khởi động
              lại chu kỳ giao dịch.
            </p>
          </button>

          <button
            type="button"
            onClick={() => handle("scale")}
            disabled={cyclePnl <= 0}
            className={cn(
              "w-full text-left rounded-xl border-2 border-primary/40 bg-primary/5 hover:bg-primary/10 hover:border-primary transition-colors group disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-primary/40",
              senior ? "p-5" : "p-4",
            )}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <TrendingUp className={senior ? "h-5 w-5 text-primary" : "h-4 w-4 text-primary"} />
              <span className={cn("font-semibold text-foreground", senior && "text-lg")}>
                Scale — Tăng vốn theo lợi nhuận{" "}
                {cyclePnl > 0 && <span className="text-primary">(+{usd.format(cyclePnl)})</span>}
              </span>
            </div>
            <p className={senior ? "text-sm text-muted-foreground leading-relaxed" : "text-xs text-muted-foreground"}>
              Vốn và anchor mới sẽ <strong>cộng thêm phần lợi nhuận</strong> của chu kỳ vừa qua.
              Chỉ khả dụng khi chu kỳ có lợi nhuận. Đây là cơ chế &quot;cỗ máy lớn dần&quot;
              theo thời gian.
            </p>
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
