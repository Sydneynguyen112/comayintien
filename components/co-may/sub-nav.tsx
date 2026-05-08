"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Settings, LineChart, FileBarChart, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { isSeniorMode } from "@/lib/co-may/senior-ui";

type RoleSlug = "student" | "mentor" | "admin";

interface SubNavTab {
  segment: string;
  label: string;
  icon: LucideIcon;
}

const TABS: SubNavTab[] = [
  { segment: "tong-quan", label: "Tổng quan", icon: LayoutDashboard },
  { segment: "quan-ly", label: "Cỗ Máy Chi Tiết", icon: Settings },
  { segment: "lich-su", label: "Nhật ký hoạt động", icon: FileBarChart },
];

export function SubNav({ role }: { role: RoleSlug }) {
  const pathname = usePathname();
  const senior = isSeniorMode(role);

  return (
    <nav className="border-b border-border">
      <div className="flex gap-1 overflow-x-auto no-scrollbar -mb-px">
        {TABS.map((tab) => {
          const href = `/${role}/co-may/${tab.segment}`;
          const active = pathname === href || pathname.startsWith(href + "/");
          const Icon = tab.icon;
          return (
            <Link
              key={tab.segment}
              href={href}
              className={cn(
                "flex items-center font-medium whitespace-nowrap border-b-2 -mb-px transition-colors",
                senior ? "gap-2.5 px-5 py-4 text-base" : "gap-2 px-4 py-3 text-sm",
                active
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border",
              )}
            >
              <Icon size={senior ? 18 : 16} />
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
