"use client";

import { useState } from "react";
import { ShieldCheck, UserCog, GraduationCap, Crown } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

type Role = "student" | "mentor" | "admin" | "super_admin";

interface Props {
  userId: string;
  currentRole: Role;
  adminId: string;
  adminRole: Role;
  onChanged: () => void;
}

const roleOptions: { key: Role; label: string; desc: string; icon: typeof UserCog }[] = [
  { key: "student", label: "Khách hàng", desc: "Người dùng Cỗ Máy", icon: GraduationCap },
  { key: "mentor", label: "Mentor", desc: "Coach, xem máy mentee", icon: UserCog },
  { key: "admin", label: "Admin", desc: "Quản lý toàn hệ thống", icon: ShieldCheck },
];

export function RoleChangeSelect({ userId, currentRole, adminId, adminRole, onChanged }: Props) {
  const [busy, setBusy] = useState(false);

  // Chỉ super_admin mới được nâng quyền lên admin để tránh privilege escalation
  const canPromoteToAdmin = adminRole === "super_admin";

  async function changeRole(next: Role) {
    if (next === currentRole) return;
    const confirmMsg =
      next === "admin"
        ? "Cấp quyền ADMIN — user sẽ truy cập được toàn bộ trang quản trị. Tiếp tục?"
        : currentRole === "admin"
          ? "Hạ quyền admin xuống user thường — user sẽ mất quyền quản trị. Tiếp tục?"
          : `Đổi vai trò từ "${roleOptions.find((r) => r.key === currentRole)?.label}" sang "${roleOptions.find((r) => r.key === next)?.label}"?`;
    if (!window.confirm(confirmMsg)) return;

    setBusy(true);
    await supabase.from("profiles").update({ role: next }).eq("id", userId);
    await supabase.from("admin_audit_log").insert({
      admin_id: adminId,
      action: "change_role",
      target_user_id: userId,
      metadata: { from: currentRole, to: next },
    });
    setBusy(false);
    onChanged();
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <ShieldCheck className="h-4 w-4 text-gold" /> Vai trò
      </div>
      <div className="space-y-1.5">
        {roleOptions.map((opt) => {
          const isCurrent = opt.key === currentRole;
          const blocked = opt.key === "admin" && !canPromoteToAdmin && !isCurrent;
          const Icon = opt.icon;
          return (
            <button
              key={opt.key}
              disabled={busy || isCurrent || blocked}
              onClick={() => changeRole(opt.key)}
              className={cn(
                "w-full flex items-center gap-2.5 rounded-lg border p-2.5 text-left text-sm transition-colors",
                isCurrent
                  ? "border-gold/50 bg-gold/10 cursor-default"
                  : blocked
                    ? "border-border opacity-40 cursor-not-allowed"
                    : "border-border hover:border-gold/30 hover:bg-gold/5",
              )}
            >
              <Icon className={cn("h-4 w-4 shrink-0", isCurrent ? "text-gold" : "text-muted-foreground")} />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-foreground">{opt.label}</div>
                <div className="text-[11px] text-muted-foreground">{opt.desc}</div>
              </div>
              {isCurrent && <span className="text-xs text-gold font-semibold">Hiện tại</span>}
              {blocked && <span className="text-[10px] text-muted-foreground">super_admin</span>}
            </button>
          );
        })}
      </div>

      {currentRole === "super_admin" && (
        <div className="flex items-center gap-2 text-xs text-purple-500 bg-purple-500/10 border border-purple-500/30 rounded-lg p-2 mt-2">
          <Crown className="h-3.5 w-3.5" />
          User là Super Admin — không thể đổi vai trò qua UI.
        </div>
      )}
    </div>
  );
}
