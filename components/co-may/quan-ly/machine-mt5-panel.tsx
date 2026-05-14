"use client";

// Panel hiển thị MT5 trong machine detail view (customer/admin xem chi tiết 1 cỗ máy).
// Phong phú hơn footer ở list view: status + last_synced + (admin/owner) link button.
// Customer view: chỉ status + last_sync, KHÔNG hiện login/password/balance.

import { useCallback, useEffect, useState } from "react";
import { AlertCircle, Anchor, CheckCircle2, Clock, RefreshCcw, XCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { Mt5LinkDialog } from "@/components/admin/mt5-link-dialog";

interface Props {
  machineId: string;
  machineName: string;
  userId: string;
  canLink: boolean;
  showCredentials?: boolean;   // admin true; customer false (default)
}

interface MT5State {
  accountId: string;
  status: string;
  lastError: string | null;
  lastSyncedAt: string | null;
  login: string | null;        // chỉ show khi showCredentials
  server: string | null;
}

const STATUS_CONFIG: Record<string, { icon: typeof CheckCircle2; tone: string; bg: string; label: string }> = {
  active:   { icon: CheckCircle2, tone: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/30", label: "Đang đồng bộ" },
  pending:  { icon: Clock,        tone: "text-amber-600 dark:text-amber-400",     bg: "bg-amber-500/10 border-amber-500/30",     label: "Chờ sync lần đầu" },
  error:    { icon: XCircle,      tone: "text-red-600 dark:text-red-400",         bg: "bg-red-500/10 border-red-500/30",         label: "Lỗi kết nối" },
  disabled: { icon: AlertCircle,  tone: "text-muted-foreground",                  bg: "bg-muted border-border",                  label: "Đã tắt" },
};

function timeSince(iso: string | null): string {
  if (!iso) return "Chưa từng";
  const diffMs = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diffMs / (1000 * 60));
  if (m < 1) return "Vừa xong";
  if (m < 60) return `${m} phút trước`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} giờ trước`;
  const d = Math.floor(h / 24);
  return `${d} ngày trước`;
}

export function MachineMt5Panel({ machineId, machineName, userId, canLink, showCredentials = false }: Props) {
  const [loading, setLoading] = useState(true);
  const [state, setState] = useState<MT5State | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const linkRes = await supabase
      .from("mt5_machine_links")
      .select("mt5_account_id")
      .eq("machine_id", machineId)
      .maybeSingle();

    if (!linkRes.data) {
      setState(null);
      setLoading(false);
      return;
    }
    const accRes = await supabase
      .from("mt5_accounts")
      .select("id, status, last_error, last_synced_at, login, server")
      .eq("id", linkRes.data.mt5_account_id)
      .maybeSingle();
    if (accRes.data) {
      setState({
        accountId: accRes.data.id,
        status: accRes.data.status ?? "pending",
        lastError: accRes.data.last_error,
        lastSyncedAt: accRes.data.last_synced_at,
        login: showCredentials ? accRes.data.login : null,
        server: showCredentials ? accRes.data.server : null,
      });
    }
    setLoading(false);
  }, [machineId, showCredentials]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return <div className="rounded-xl border border-border bg-card p-4 h-24 animate-pulse" />;
  }

  // CASE 1: chưa link
  if (!state) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card/50 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Anchor className="h-4 w-4 text-muted-foreground" />
          <h4 className="text-sm font-semibold">Giám sát MT5</h4>
        </div>
        <p className="text-xs text-muted-foreground">
          Kết nối MT5 (qua INVESTOR password read-only) để hệ thống tự đồng bộ kỷ luật mỗi 5 phút.
          So sánh log của bạn với MT5 thật để phát hiện gap.
        </p>
        {canLink ? (
          <Mt5LinkDialog
            userId={userId}
            machineId={machineId}
            machineName={machineName}
            onLinked={load}
          />
        ) : (
          <div className="text-xs italic text-muted-foreground">
            Chưa được kết nối. Người sở hữu cỗ máy cần thêm trong phần Quản lý.
          </div>
        )}
      </div>
    );
  }

  // CASE 2: đã link — hiện status
  const cfg = STATUS_CONFIG[state.status] ?? STATUS_CONFIG.pending;
  const Icon = cfg.icon;

  return (
    <div className={cn("rounded-xl border p-4 space-y-3", cfg.bg)}>
      <div className="flex items-center gap-2 justify-between">
        <div className="flex items-center gap-2">
          <Anchor className="h-4 w-4 text-muted-foreground" />
          <h4 className="text-sm font-semibold">Giám sát MT5</h4>
        </div>
        <button
          type="button"
          onClick={load}
          className="text-[10px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
        >
          <RefreshCcw className="h-3 w-3" /> Reload
        </button>
      </div>

      <div className="flex items-center gap-2">
        <Icon className={cn("h-4 w-4", cfg.tone)} />
        <span className={cn("font-semibold text-sm", cfg.tone)}>{cfg.label}</span>
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs">
        <div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Sync cuối</div>
          <div className="font-medium tabular-nums">{timeSince(state.lastSyncedAt)}</div>
        </div>
        {showCredentials && state.login && state.server && (
          <div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Account</div>
            <div className="font-medium tabular-nums truncate" title={`${state.login}@${state.server}`}>
              {state.login}@{state.server}
            </div>
          </div>
        )}
      </div>

      {state.lastError && state.status === "error" && (
        <div className="rounded border border-red-500/30 bg-red-500/5 px-2 py-1 text-[11px] text-red-600 dark:text-red-400">
          ⚠ {state.lastError.length > 200 ? state.lastError.slice(0, 200) + "…" : state.lastError}
        </div>
      )}

      {!showCredentials && (
        <p className="text-[11px] italic text-muted-foreground/80">
          Thông tin chi tiết (lệnh, nạp/rút thật) chỉ admin/mentor xem được để chấm kỷ luật.
        </p>
      )}
    </div>
  );
}
