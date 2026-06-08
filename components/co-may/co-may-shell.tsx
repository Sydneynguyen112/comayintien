"use client";

import { Coins } from "lucide-react";
import { cn } from "@/lib/utils";
import { isSeniorMode, seniorCx } from "@/lib/co-may/senior-ui";
import { SubNav } from "./sub-nav";

type RoleSlug = "client" | "mentor" | "admin";

const ROLE_LABEL: Record<RoleSlug, string> = {
  client: "View khách hàng",
  mentor: "View mentor — đọc dữ liệu mentee",
  admin: "View admin — toàn hệ thống",
};

export function CoMayShell({
  role,
  children,
}: {
  role: RoleSlug;
  children: React.ReactNode;
}) {
  const senior = isSeniorMode(role);
  return (
    <div className={seniorCx.sectionGap(senior)}>
      <header className="flex items-start gap-4">
        <div
          className={cn(
            "flex items-center justify-center rounded-2xl bg-primary/15 border border-primary/30 shrink-0",
            senior ? "h-14 w-14" : "h-12 w-12",
          )}
        >
          <Coins className={senior ? "h-7 w-7 text-primary" : "h-6 w-6 text-primary"} />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className={cn(seniorCx.pageTitle(senior), "gold-gradient-text leading-tight")}>
            Cỗ Máy Trading
          </h1>
          <p className={cn(seniorCx.pageSubtitle(senior), "mt-1")}>
            {ROLE_LABEL[role]} — quản trị kỷ luật rút tiền cho trader
          </p>
        </div>
      </header>

      {role !== "admin" && <SubNav role={role as "client" | "mentor"} />}

      <div className="pt-2">{children}</div>
    </div>
  );
}
