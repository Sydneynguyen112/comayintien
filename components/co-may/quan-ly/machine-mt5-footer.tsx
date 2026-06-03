"use client";

// Compact footer cho card cỗ máy trong list view — show MT5 status hoặc nút link.
// Không có helper text inline (gây overflow grid trước đây).
// Customer/admin chỉ thấy badge trạng thái, KHÔNG thấy login/password/balance.

import { useCallback, useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Clock, Plug, Unplug, XCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { unlinkMt5FromMachine } from "@/lib/co-may/mt5-actions";
import { Mt5LinkDialog } from "@/components/admin/mt5-link-dialog";

interface Props {
  machineId: string;
  machineName: string;
  userId: string;
  canLink: boolean;
}

type Status = "loading" | "unlinked" | "linked";

interface LinkedInfo {
  accountId: string;
  accountStatus: string;
  lastError: string | null;
  login: string;
  server: string;
}

const STATUS_CONFIG: Record<string, { icon: typeof CheckCircle2; tone: string; label: string }> = {
  active:   { icon: CheckCircle2, tone: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/30",  label: "MT5 đã kết nối" },
  pending:  { icon: Clock,        tone: "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/30",          label: "MT5 chờ sync" },
  error:    { icon: XCircle,      tone: "text-red-600 dark:text-red-400 bg-red-500/10 border-red-500/30",                  label: "MT5 lỗi" },
  disabled: { icon: AlertCircle,  tone: "text-muted-foreground bg-muted border-border",                                    label: "MT5 tắt" },
};

export function MachineMt5Footer({ machineId, machineName, userId, canLink }: Props) {
  const [status, setStatus] = useState<Status>("loading");
  const [info, setInfo] = useState<LinkedInfo | null>(null);
  const [confirmUnlink, setConfirmUnlink] = useState(false);
  const [unlinking, setUnlinking] = useState(false);
  const [unlinkErr, setUnlinkErr] = useState<string | null>(null);

  const loadStatus = useCallback(async () => {
    // KHÔNG setStatus("loading") ở đây — chỉ initial render dùng status="loading" ban đầu.
    // Background polls update state lặng, tránh flicker skeleton mỗi 30s.
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
      .select("id, status, last_error, login, server")
      .eq("id", linkRes.data.mt5_account_id)
      .maybeSingle();

    setStatus("linked");
    setInfo({
      accountId: accRes.data?.id ?? linkRes.data.mt5_account_id,
      accountStatus: accRes.data?.status ?? "pending",
      lastError: accRes.data?.last_error ?? null,
      login: accRes.data?.login ?? "",
      server: accRes.data?.server ?? "",
    });
  }, [machineId]);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  // Poll để "Sync cuối" + status luôn fresh khi đã link.
  //   pending: 15s, active/error: 30s, unlinked/disabled: không poll.
  useEffect(() => {
    if (status !== "linked" || !info) return;
    if (info.accountStatus === "disabled") return;
    const intervalMs = info.accountStatus === "pending" ? 15000 : 30000;
    const interval = setInterval(() => loadStatus(), intervalMs);
    return () => clearInterval(interval);
  }, [status, info?.accountStatus, loadStatus]);

  async function handleUnlink() {
    if (unlinking) return;
    setUnlinking(true);
    setUnlinkErr(null);
    const res = await unlinkMt5FromMachine(machineId);
    setUnlinking(false);
    if (res.success) {
      setConfirmUnlink(false);
      setInfo(null);
      setStatus("unlinked");
    } else {
      setUnlinkErr(res.error ?? "Ngắt kết nối thất bại.");
    }
  }

  if (status === "loading") {
    return <div className="h-7 rounded bg-muted/40 animate-pulse" />;
  }

  if (status === "unlinked") {
    if (!canLink) {
      return (
        <div className="text-[11px] text-muted-foreground italic px-1">
          Chưa kết nối MT5
        </div>
      );
    }
    return (
      <Mt5LinkDialog
        userId={userId}
        machineId={machineId}
        machineName={machineName}
        onLinked={loadStatus}
      />
    );
  }

  const cfg = STATUS_CONFIG[info!.accountStatus] ?? STATUS_CONFIG.pending;
  const Icon = cfg.icon;
  const isError = info!.accountStatus === "error";

  return (
    <div className="space-y-1.5">
      <div
        className={cn(
          "rounded-lg border px-2.5 py-1.5 text-[11px] flex items-center gap-1.5 w-full",
          cfg.tone,
        )}
        title={info!.lastError ?? cfg.label}
      >
        <Icon className="h-3.5 w-3.5 shrink-0" />
        <span className="font-medium truncate">{cfg.label}</span>
        {isError && info!.lastError && (
          <span className="italic text-[10px] truncate min-w-0 opacity-80">
            {info!.lastError.slice(0, 30)}…
          </span>
        )}
      </div>
      {isError && canLink && (
        <Mt5LinkDialog
          userId={userId}
          machineId={machineId}
          machineName={machineName}
          existingAccountId={info!.accountId}
          existingLogin={info!.login}
          existingServer={info!.server}
          urgent
          onLinked={loadStatus}
        />
      )}

      {canLink &&
        (!confirmUnlink ? (
          <button
            type="button"
            onClick={() => {
              setConfirmUnlink(true);
              setUnlinkErr(null);
            }}
            className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-red-600 dark:hover:text-red-400 transition-colors px-1"
          >
            <Unplug className="h-3 w-3" /> Ngắt kết nối
          </button>
        ) : (
          <div className="rounded-md border border-red-500/30 bg-red-500/5 px-2 py-1.5 space-y-1.5">
            <p className="text-[10px] text-foreground leading-snug">
              Ngắt MT5 khỏi cỗ máy này? Lịch sử lệnh vẫn được giữ.
            </p>
            {unlinkErr && (
              <p className="text-[10px] text-red-600 dark:text-red-400">{unlinkErr}</p>
            )}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleUnlink}
                disabled={unlinking}
                className="inline-flex items-center gap-1 rounded bg-red-600 text-white px-2 py-0.5 text-[10px] font-medium hover:bg-red-700 disabled:opacity-60"
              >
                <Unplug className="h-2.5 w-2.5" />
                {unlinking ? "Đang ngắt..." : "Ngắt"}
              </button>
              <button
                type="button"
                onClick={() => setConfirmUnlink(false)}
                disabled={unlinking}
                className="text-[10px] text-muted-foreground hover:text-foreground disabled:opacity-60"
              >
                Huỷ
              </button>
            </div>
          </div>
        ))}
    </div>
  );
}
