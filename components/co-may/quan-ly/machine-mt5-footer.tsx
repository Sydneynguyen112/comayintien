"use client";

// Footer hiển thị MT5 status cho 1 cỗ máy ở customer view.
// - Chưa link → nút "Liên kết MT5" (chỉ customer thấy, mentor/admin chỉ thấy badge)
// - Đã link → chỉ badge trạng thái, KHÔNG hiện login/password/balance
// Khách phải biết: máy này đã được link MT5, đang sync mỗi 5 phút, lỗi thì alert.

import { useCallback, useEffect, useState } from "react";
import { Activity, AlertCircle, CheckCircle2, Clock, XCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { Mt5LinkDialog } from "@/components/admin/mt5-link-dialog";

interface Props {
  machineId: string;
  machineName: string;
  userId: string;
  canLink: boolean;     // true cho customer view, false cho mentor/admin
}

type Status = "loading" | "unlinked" | "linked";

interface LinkedInfo {
  accountStatus: string;        // active | pending | error | disabled
  lastError: string | null;
}

const STATUS_CONFIG: Record<string, { icon: typeof CheckCircle2; tone: string; label: string }> = {
  active:   { icon: CheckCircle2, tone: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/30",  label: "MT5 đang đồng bộ" },
  pending:  { icon: Clock,        tone: "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/30",          label: "MT5 chờ sync lần đầu" },
  error:    { icon: XCircle,      tone: "text-red-600 dark:text-red-400 bg-red-500/10 border-red-500/30",                  label: "MT5 lỗi kết nối" },
  disabled: { icon: AlertCircle,  tone: "text-muted-foreground bg-muted border-border",                                    label: "MT5 đã tắt" },
};

export function MachineMt5Footer({ machineId, machineName, userId, canLink }: Props) {
  const [status, setStatus] = useState<Status>("loading");
  const [info, setInfo] = useState<LinkedInfo | null>(null);

  const loadStatus = useCallback(async () => {
    setStatus("loading");
    const linkRes = await supabase
      .from("mt5_machine_links")
      .select("mt5_account_id")
      .eq("machine_id", machineId)
      .maybeSingle();

    if (!linkRes.data) {
      setStatus("unlinked");
      return;
    }

    const accRes = await supabase
      .from("mt5_accounts")
      .select("status, last_error")
      .eq("id", linkRes.data.mt5_account_id)
      .maybeSingle();

    setStatus("linked");
    setInfo({
      accountStatus: accRes.data?.status ?? "pending",
      lastError: accRes.data?.last_error ?? null,
    });
  }, [machineId]);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  if (status === "loading") {
    return <div className="h-7 rounded bg-muted/40 animate-pulse" />;
  }

  if (status === "unlinked") {
    if (!canLink) return null;        // mentor/admin xem không cần thấy
    return (
      <div className="flex items-center gap-2 px-1">
        <Mt5LinkDialog
          userId={userId}
          machineId={machineId}
          machineName={machineName}
          onLinked={loadStatus}
        />
        <span className="text-[11px] italic text-muted-foreground">
          Tuỳ chọn: kết nối MT5 để hệ thống tự đồng bộ kỷ luật
        </span>
      </div>
    );
  }

  // Linked — chỉ badge, không lộ credentials
  const cfg = STATUS_CONFIG[info!.accountStatus] ?? STATUS_CONFIG.pending;
  const Icon = cfg.icon;

  return (
    <div
      className={cn(
        "rounded-lg border px-3 py-1.5 text-xs flex items-center gap-2",
        cfg.tone,
      )}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <span className="font-medium">{cfg.label}</span>
      {info!.lastError && info!.accountStatus === "error" && (
        <span className="italic text-muted-foreground truncate">
          — {info!.lastError.length > 80 ? info!.lastError.slice(0, 80) + "…" : info!.lastError}
        </span>
      )}
      <Activity className="h-3 w-3 ml-auto opacity-50" />
    </div>
  );
}
