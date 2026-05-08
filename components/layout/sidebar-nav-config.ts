import {
  LayoutDashboard,
  User,
  Settings,
  FileBarChart,
  Users,
  ChartLine,
  Coins,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import type { Role } from "@/lib/types";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  children?: NavItem[];
}

function studentMentorNav(roleSlug: "student" | "mentor"): NavItem[] {
  return [
    { href: `/${roleSlug}/co-may/tong-quan`, label: "Tổng quan", icon: LayoutDashboard },
    { href: `/${roleSlug}/co-may/quan-ly`, label: "Cỗ Máy chi tiết", icon: Settings },
    { href: `/${roleSlug}/co-may/lich-su`, label: "Nhật ký hoạt động", icon: FileBarChart },
    { href: `/${roleSlug}/profile`, label: "Hồ sơ", icon: User },
  ];
}

export const studentNav: NavItem[] = studentMentorNav("student");
export const mentorNav: NavItem[] = studentMentorNav("mentor");

export const adminNav: NavItem[] = [
  { href: "/admin/crm", label: "CRM Dashboard", icon: ChartLine },
  { href: "/admin/khach-hang", label: "Khách hàng & Mentor", icon: Users },
  { href: "/student/co-may/tong-quan", label: "Cỗ máy cá nhân", icon: Coins },
  { href: "/admin/profile", label: "Hồ sơ", icon: User },
];

// Item prepend khi admin/super_admin đang ở /student/* hoặc /mentor/* — escape về admin
export const backToAdminItem: NavItem = {
  href: "/admin/crm",
  label: "← Quay lại Admin",
  icon: ShieldCheck,
};

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
