"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Search, Users as UsersIcon } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useCurrentUser, type Profile } from "@/lib/auth";
import { cn, formatDate } from "@/lib/utils";
import { PageTransition } from "@/components/shared/PageTransition";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { UserRowActions, type UserStatus } from "@/components/admin/user-row-actions";

interface AppsAccessRow {
  user_id: string;
  status: UserStatus;
  granted_at: string;
  approved_at: string | null;
}

interface UserItem {
  profile: Profile;
  status: UserStatus;
  grantedAt: string;
}

type Tab = "pending" | "approved" | "locked";

const tabConfig: { key: Tab; label: string; tone: string }[] = [
  { key: "pending", label: "Chờ duyệt", tone: "border-gold text-gold" },
  { key: "approved", label: "Đã duyệt", tone: "border-emerald-500 text-emerald-500" },
  { key: "locked", label: "Đã khoá", tone: "border-amber-500 text-amber-500" },
];

const roleLabels: Record<string, string> = {
  student: "Khách hàng",
  mentor: "Mentor",
};

const roleStyles: Record<string, string> = {
  student: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30",
  mentor: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
};

const statusStyles: Record<UserStatus, string> = {
  pending: "bg-gold/15 text-gold border-gold/30",
  approved: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
  locked: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
  none: "bg-muted text-muted-foreground border-border",
};

export default function AdminKhachHangPage() {
  const admin = useCurrentUser("admin");
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<Tab>("pending");
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadData() {
    setLoading(true);
    const [{ data: profiles }, { data: access }] = await Promise.all([
      supabase
        .from("profiles")
        .select("*")
        .in("role", ["student", "mentor"])
        .order("created_at", { ascending: false }),
      supabase
        .from("apps_access")
        .select("user_id, status, granted_at, approved_at")
        .eq("app", "comay"),
    ]);
    const accessByUser = new Map<string, AppsAccessRow>();
    (access ?? []).forEach((a) => accessByUser.set(a.user_id, a as AppsAccessRow));

    const items: UserItem[] = (profiles ?? []).map((p) => {
      const a = accessByUser.get(p.id);
      return {
        profile: p as Profile,
        status: (a?.status ?? "none") as UserStatus,
        grantedAt: a?.granted_at ?? p.created_at,
      };
    });
    setUsers(items);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  const counts = useMemo(() => {
    const c = { pending: 0, approved: 0, locked: 0 };
    users.forEach((u) => {
      if (u.status in c) c[u.status as Tab] += 1;
    });
    return c;
  }, [users]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users
      .filter((u) => u.status === tab)
      .filter(
        (u) =>
          !q ||
          u.profile.full_name.toLowerCase().includes(q) ||
          u.profile.email.toLowerCase().includes(q),
      );
  }, [users, tab, search]);

  if (loading || !admin) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-muted-foreground">
        Đang tải...
      </div>
    );
  }

  return (
    <PageTransition>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="space-y-6"
      >
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gold/15 flex items-center justify-center">
            <UsersIcon className="h-5 w-5 text-gold" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">
              <span className="gold-gradient-text">Khách hàng & Mentor</span>
            </h1>
            <p className="mt-0.5 text-muted-foreground text-sm">
              Duyệt yêu cầu truy cập, khoá, mở lại quyền Cỗ Máy In Tiền
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 border-b border-border">
          {tabConfig.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
                tab === t.key
                  ? t.tone
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {t.label}
              <span className={cn(
                "rounded-full px-2 py-0.5 text-xs font-semibold",
                tab === t.key ? "bg-gold/15" : "bg-muted",
              )}>
                {counts[t.key]}
              </span>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="max-w-sm">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Tìm theo tên hoặc email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Table */}
        <Card>
          <CardContent className="pt-4">
            <div className="overflow-x-auto rounded-2xl border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Loại</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead>Đăng ký</TableHead>
                    <TableHead className="text-right">Hành động</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                        {tab === "pending"
                          ? "Không có user nào đang chờ duyệt."
                          : tab === "approved"
                            ? "Chưa có user nào được duyệt."
                            : "Không có user nào bị khoá."}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map(({ profile, status, grantedAt }) => {
                      const initials = profile.full_name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .slice(-2);
                      return (
                        <TableRow key={profile.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                {profile.avatar_url && <AvatarImage src={profile.avatar_url} />}
                                <AvatarFallback className="bg-gold/20 text-gold text-xs">
                                  {initials}
                                </AvatarFallback>
                              </Avatar>
                              <span className="font-medium text-foreground">
                                {profile.full_name}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {profile.email}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={roleStyles[profile.role] ?? "bg-muted"}
                            >
                              {roleLabels[profile.role] ?? profile.role}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={statusStyles[status]}>
                              {status === "pending"
                                ? "Chờ duyệt"
                                : status === "approved"
                                  ? "Đã duyệt"
                                  : status === "locked"
                                    ? "Đã khoá"
                                    : "Chưa đăng ký"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {formatDate(grantedAt)}
                          </TableCell>
                          <TableCell>
                            <UserRowActions
                              userId={profile.id}
                              currentStatus={status}
                              adminId={admin.id}
                              onChanged={loadData}
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </PageTransition>
  );
}
