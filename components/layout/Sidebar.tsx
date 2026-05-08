"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Menu,
  X,
  ChevronLeft,
  ChevronDown,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCurrentUser, signOut } from "@/lib/auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { getNavConfig, type NavItem } from "./sidebar-nav-config";

function isItemActive(item: NavItem, pathname: string): boolean {
  // Dashboard root pages match exact only
  const isRootDashboard =
    item.href === "/student" || item.href === "/mentor" || item.href === "/admin";
  if (isRootDashboard) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(item.href + "/");
}

function isBranchActive(item: NavItem, pathname: string): boolean {
  if (isItemActive(item, pathname)) return true;
  return item.children?.some((c) => isBranchActive(c, pathname)) ?? false;
}

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { items, role, fallbackRole } = getNavConfig(pathname);
  const currentUser = useCurrentUser(fallbackRole);
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());

  // Auto-expand any branch whose descendant is active
  useEffect(() => {
    const next = new Set<string>();
    for (const item of items) {
      if (item.children && isBranchActive(item, pathname)) {
        next.add(item.href);
      }
    }
    setExpandedKeys((prev) => {
      // merge — don't collapse manually-opened branches
      const merged = new Set(prev);
      next.forEach((k) => merged.add(k));
      return merged;
    });
  }, [pathname, items]);

  const handleSignOut = () => {
    signOut();
    setMobileOpen(false);
    router.push("/sign-in");
  };

  const initials = useMemo(
    () =>
      currentUser?.full_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(-2) || "?",
    [currentUser],
  );

  const toggleExpand = (key: string) => {
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  function renderNavItem(item: NavItem, depth = 0): React.ReactNode {
    const active = isItemActive(item, pathname);
    const branchActive = isBranchActive(item, pathname);
    const hasChildren = !!item.children?.length;
    const expanded = expandedKeys.has(item.href);
    const Icon = item.icon;
    const iconSize = depth > 0 ? 16 : 18;

    const senior = fallbackRole === "student";
    const baseClass = cn(
      "flex items-center rounded-xl font-medium transition-all w-full",
      senior ? "gap-3 px-3 py-3 text-base" : "gap-3 px-3 py-2.5 text-sm",
      depth > 0 && (senior ? "ml-3 pl-2 gap-2.5 py-2.5" : "ml-3 pl-2 gap-2 py-2 text-[13px]"),
      active || (hasChildren && branchActive && !expanded)
        ? "bg-sidebar-accent text-gold"
        : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent",
    );

    const labelEl = !collapsed && (
      <span className="flex-1 text-left whitespace-normal leading-tight break-words min-w-0">
        {item.label}
      </span>
    );

    if (hasChildren && !collapsed) {
      // Parent with children — toggle button + animated children list
      return (
        <div key={item.href}>
          <button
            type="button"
            onClick={() => toggleExpand(item.href)}
            className={baseClass}
          >
            <Icon
              size={iconSize}
              className={cn("shrink-0", branchActive && "text-gold")}
            />
            {labelEl}
            <ChevronDown
              size={14}
              className={cn(
                "transition-transform text-sidebar-foreground/40",
                expanded && "rotate-180",
              )}
            />
          </button>
          <AnimatePresence initial={false}>
            {expanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
                className="overflow-hidden mt-1 space-y-1"
              >
                {item.children!.map((c) => renderNavItem(c, depth + 1))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      );
    }

    // Leaf or collapsed parent → render as Link
    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={() => setMobileOpen(false)}
        className={baseClass}
      >
        <Icon size={iconSize} className={cn("shrink-0", active && "text-gold")} />
        {labelEl}
      </Link>
    );
  }

  const NavContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center justify-between px-4 h-16 border-b border-sidebar-border">
        {!collapsed && (
          <Link href="/" className="text-xl font-bold gold-gradient-text">
            Cỗ Máy
          </Link>
        )}
        <div className="flex items-center gap-1">
          <ThemeToggle className="text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent" />
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:flex p-1.5 rounded-lg text-sidebar-foreground/60 hover:text-gold hover:bg-sidebar-accent"
          >
            <ChevronLeft
              size={18}
              className={cn("transition-transform", collapsed && "rotate-180")}
            />
          </button>
        </div>
      </div>

      {/* Role badge */}
      {!collapsed && (
        <div className="px-4 py-3">
          <span className="text-xs font-medium text-gold bg-gold/15 px-2.5 py-1 rounded-full">
            {role}
          </span>
        </div>
      )}

      {/* Nav items */}
      <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
        {items.map((item) => renderNavItem(item, 0))}
      </nav>

      {/* Bottom: user info + logout */}
      <div className="px-3 py-4 border-t border-sidebar-border space-y-2">
        {currentUser && !collapsed && (
          <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-sidebar-accent">
            <Avatar className="w-8 h-8 border border-gold/30 shrink-0">
              {currentUser.avatar_url && <AvatarImage src={currentUser.avatar_url} alt={currentUser.full_name} />}
              <AvatarFallback className="bg-gold/15 text-gold text-xs font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-sidebar-foreground truncate">
                {currentUser.full_name}
              </div>
              <div className="text-xs text-sidebar-foreground/50 truncate">
                {currentUser.email}
              </div>
            </div>
          </div>
        )}
        {currentUser && collapsed && (
          <Avatar className="w-8 h-8 mx-auto border border-gold/30">
            {currentUser.avatar_url && <AvatarImage src={currentUser.avatar_url} alt={currentUser.full_name} />}
            <AvatarFallback className="bg-gold/15 text-gold text-xs font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
        )}
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-all"
        >
          <LogOut size={18} />
          {!collapsed && <span>Đăng xuất</span>}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-card border border-border text-foreground"
      >
        <Menu size={20} />
      </button>

      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="lg:hidden fixed inset-0 z-40 bg-black/60"
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="lg:hidden fixed top-0 left-0 bottom-0 z-50 w-[260px] bg-sidebar border-r border-sidebar-border"
            >
              <button
                onClick={() => setMobileOpen(false)}
                className="absolute top-4 right-4 p-1 text-sidebar-foreground/60 hover:text-sidebar-foreground"
              >
                <X size={18} />
              </button>
              <NavContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden lg:flex flex-col fixed top-0 left-0 bottom-0 bg-sidebar border-r border-sidebar-border transition-all duration-300 z-30",
          collapsed ? "w-[68px]" : "w-[260px]",
        )}
      >
        <NavContent />
      </aside>
    </>
  );
}
