"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChartLine, Flame, Repeat, Filter, MessageCircle, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface Tab {
  href: string;
  label: string;
  icon: LucideIcon;
}

const TABS: Tab[] = [
  { href: "/admin/crm", label: "Dashboard", icon: ChartLine },
  { href: "/admin/crm/engagement", label: "Engagement & Habit", icon: Flame },
  { href: "/admin/crm/retention", label: "Retention & Churn", icon: Repeat },
  { href: "/admin/crm/segments", label: "Segmentation", icon: Filter },
  { href: "/admin/crm/voc", label: "Voice of Customer", icon: MessageCircle },
];

export function CrmTabs() {
  const pathname = usePathname();

  return (
    <nav className="border-b border-border">
      <div className="flex gap-1 overflow-x-auto no-scrollbar -mb-px">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          // Dashboard root → exact match; sub-tabs → startsWith
          const active = tab.href === "/admin/crm"
            ? pathname === "/admin/crm"
            : pathname === tab.href || pathname.startsWith(tab.href + "/");
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition-colors",
                active
                  ? "border-gold text-gold"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border",
              )}
            >
              <Icon size={16} />
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
