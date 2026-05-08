"use client";

import { useState } from "react";
import { Check, Lock, RotateCcw, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type UserStatus = "pending" | "approved" | "locked" | "none";

interface Props {
  userId: string;
  currentStatus: UserStatus;
  adminId: string;
  onChanged: () => void;
}

export function UserRowActions({ userId, currentStatus, adminId, onChanged }: Props) {
  const [busy, setBusy] = useState(false);

  async function setStatus(next: "approved" | "locked") {
    setBusy(true);
    const patch: Record<string, unknown> = { status: next };
    if (next === "approved") {
      patch.approved_at = new Date().toISOString();
      patch.approved_by = adminId;
    } else if (next === "locked") {
      patch.locked_at = new Date().toISOString();
      patch.locked_by = adminId;
    }
    await supabase
      .from("apps_access")
      .update(patch)
      .eq("user_id", userId)
      .eq("app", "comay");
    await supabase.from("admin_audit_log").insert({
      admin_id: adminId,
      action: next === "approved" ? "approve_comay" : "lock_comay",
      target_user_id: userId,
    });
    setBusy(false);
    onChanged();
  }

  async function removeAccess() {
    if (!window.confirm("Xoá quyền truy cập Cỗ Máy của user này? User sẽ phải đăng ký lại nếu muốn dùng.")) return;
    setBusy(true);
    await supabase
      .from("apps_access")
      .delete()
      .eq("user_id", userId)
      .eq("app", "comay");
    await supabase.from("admin_audit_log").insert({
      admin_id: adminId,
      action: "remove_comay_access",
      target_user_id: userId,
    });
    setBusy(false);
    onChanged();
  }

  return (
    <div className="flex items-center gap-1.5 justify-end flex-wrap">
      {currentStatus === "pending" && (
        <Button
          size="sm"
          disabled={busy}
          className="bg-emerald-500 hover:bg-emerald-600 text-white h-8"
          onClick={() => setStatus("approved")}
        >
          <Check className="h-3.5 w-3.5 mr-1" /> Duyệt
        </Button>
      )}
      {currentStatus === "approved" && (
        <Button
          size="sm"
          variant="outline"
          disabled={busy}
          className={cn("border-amber-500/50 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 h-8")}
          onClick={() => setStatus("locked")}
        >
          <Lock className="h-3.5 w-3.5 mr-1" /> Khoá
        </Button>
      )}
      {currentStatus === "locked" && (
        <Button
          size="sm"
          disabled={busy}
          className="bg-emerald-500 hover:bg-emerald-600 text-white h-8"
          onClick={() => setStatus("approved")}
        >
          <RotateCcw className="h-3.5 w-3.5 mr-1" /> Mở lại
        </Button>
      )}
      <Button
        size="sm"
        variant="outline"
        disabled={busy}
        className="border-destructive/40 text-destructive hover:bg-destructive/10 h-8"
        onClick={removeAccess}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
