import {
  LayoutDashboard,
  User,
  Settings,
  FileBarChart,
  type LucideIcon,
} from "lucide-react";
import type { Role } from "@/lib/types";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  children?: NavItem[];
}

function comayNav(roleSlug: "student" | "mentor" | "admin"): NavItem[] {
  return [
    { href: `/${roleSlug}/co-may/tong-quan`, label: "Tổng quan", icon: LayoutDashboard },
    { href: `/${roleSlug}/co-may/quan-ly`, label: "Cỗ Máy chi tiết", icon: Settings },
    { href: `/${roleSlug}/co-may/lich-su`, label: "Nhật ký hoạt động", icon: FileBarChart },
    { href: `/${roleSlug}/profile`, label: "Hồ sơ", icon: User },
  ];
}

export const studentNav: NavItem[] = comayNav("student");
export const mentorNav: NavItem[] = comayNav("mentor");
export const adminNav: NavItem[] = comayNav("admin");

export function getNavConfig(pathname: string): {
  items: NavItem[];
  role: string;
  fallbackRole: Role;
} {
  if (pathname.startsWith("/admin"))
    return { items: adminNav, role: "Admin", fallbackRole: "admin" };
  if (pathname.startsWith("/mentor"))
    return { items: mentorNav, role: "Mentor", fallbackRole: "mentor" };
  return { items: studentNav, role: "Học viên", fallbackRole: "student" };
}
