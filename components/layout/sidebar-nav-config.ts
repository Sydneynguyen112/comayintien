import {
  LayoutDashboard,
  User,
  Settings,
  FileBarChart,
  Users,
  ChartLine,
  Coins,
  Repeat,
  Flame,
  Filter,
  MessageCircle,
  type LucideIcon,
} from "lucide-react";
import type { Role } from "@/lib/types";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  children?: NavItem[];
}

function clientMentorNav(urlSlug: "client" | "mentor"): NavItem[] {
  return [
    { href: `/${urlSlug}/co-may/tong-quan`, label: "Tổng quan", icon: LayoutDashboard },
    { href: `/${urlSlug}/co-may/quan-ly`, label: "Cỗ Máy chi tiết", icon: Settings },
    { href: `/${urlSlug}/co-may/lich-su`, label: "Nhật ký hoạt động", icon: FileBarChart },
    { href: `/${urlSlug}/profile`, label: "Hồ sơ", icon: User },
  ];
}

export const studentNav: NavItem[] = clientMentorNav("client");
export const mentorNav: NavItem[] = clientMentorNav("mentor");

export const adminNav: NavItem[] = [
  { href: "/admin/crm", label: "Dashboard", icon: ChartLine },
  { href: "/admin/crm/voc", label: "Voice of Customer", icon: MessageCircle },
  { href: "/admin/khach-hang", label: "Quản lý khách hàng", icon: Users },
  { href: "/client/co-may/tong-quan", label: "Cỗ máy cá nhân", icon: Coins },
  { href: "/admin/profile", label: "Hồ sơ", icon: User },
];

export function getNavConfig(pathname: string): {
  items: NavItem[];
  role: string;
  fallbackRole: Role;
} {
  if (pathname.startsWith("/admin"))
    return { items: adminNav, role: "Admin", fallbackRole: "admin" };
  if (pathname.startsWith("/mentor"))
    return { items: mentorNav, role: "Mentor", fallbackRole: "mentor" };
  return { items: studentNav, role: "Khách hàng", fallbackRole: "student" };
}
