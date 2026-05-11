"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Download, Mail, Bell, MessageSquare, Phone, Check } from "lucide-react";
import { format, parseISO, formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  Table, TableHeader, TableRow, TableHead, TableBody, TableCell,
} from "@/components/ui/table";
import type { AtRiskUser } from "@/lib/admin/retention-api";
import { LogReengagementDialog } from "./log-reengagement-dialog";

interface Props {
  users: AtRiskUser[];
  adminId: string;
}

const reasonBadge: Record<string, { label: string; className: string }> = {
  frequency_drop: {
    label: "Frequency drop",
    className: "bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30",
  },
  silent_active_user: {
    label: "Silent user",
    className: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
  },
  low_activation: {
    label: "Low activation",
    className: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30",
  },
};

const actionIcon: Record<string, typeof Mail> = {
  email: Mail,
  notification: Bell,
  manual_contact: MessageSquare,
  phone_call: Phone,
};

export function AtRiskTable({ users, adminId }: Props) {
  const [search, setSearch] = useState("");
  const [reasonFilter, setReasonFilter] = useState<string>("all");
  const [dialogUser, setDialogUser] = useState<AtRiskUser | null>(null);

  const allReasons = useMemo(() => {
    const s = new Set<string>();
    users.forEach((u) => u.risk_reasons.forEach((r) => s.add(r)));
    return Array.from(s);
  }, [users]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      if (q && !u.full_name.toLowerCase().includes(q) && !u.email.toLowerCase().includes(q)) return false;
      if (reasonFilter !== "all" && !u.risk_reasons.includes(reasonFilter)) return false;
      return true;
    });
  }, [users, search, reasonFilter]);

  function handleExportCsv() {
    const header = ["Tên", "Email", "Last active", "Ngày im lặng", "Trades 7d", "Median 4w", "Reasons"];
    const rows = filtered.map((u) => [
      u.full_name,
      u.email,
      u.last_active ? format(parseISO(u.last_active), "yyyy-MM-dd HH:mm") : "",
      String(u.days_inactive),
      String(u.trades_this_week),
      String(u.median_trades_4w),
      u.risk_reasons.join("|"),
    ]);
    const csv = [header, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `at-risk-users-${format(new Date(), "yyyyMMdd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Tìm tên hoặc email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setReasonFilter("all")}
            className={cn(
              "px-3 py-1.5 text-xs rounded-lg border transition-colors",
              reasonFilter === "all"
                ? "border-gold/40 bg-gold/10 text-gold"
                : "border-border hover:bg-muted/40",
            )}
          >
            Tất cả · {users.length}
          </button>
          {allReasons.map((r) => (
            <button
              key={r}
              onClick={() => setReasonFilter(r)}
              className={cn(
                "px-3 py-1.5 text-xs rounded-lg border transition-colors",
                reasonFilter === r
                  ? "border-gold/40 bg-gold/10 text-gold"
                  : "border-border hover:bg-muted/40",
              )}
            >
              {reasonBadge[r]?.label ?? r}
            </button>
          ))}
        </div>
        <Button variant="outline" size="sm" onClick={handleExportCsv} className="ml-auto">
          <Download className="h-3.5 w-3.5 mr-1.5" /> CSV ({filtered.length})
        </Button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Học viên</TableHead>
              <TableHead>Last active</TableHead>
              <TableHead>Ngày im lặng</TableHead>
              <TableHead>Trades 7d</TableHead>
              <TableHead>Median 4w</TableHead>
              <TableHead>Reasons</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                  Không có user at-risk. 🎉
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((u) => {
                const LastActionIcon = u.last_action_type ? actionIcon[u.last_action_type] : null;
                return (
                  <TableRow key={u.user_id}>
                    <TableCell>
                      <Link
                        href={`/admin/khach-hang/${u.user_id}`}
                        className="hover:opacity-80"
                      >
                        <div className="font-medium text-foreground hover:text-gold transition-colors">
                          {u.full_name}
                        </div>
                        <div className="text-[11px] text-muted-foreground">{u.email}</div>
                      </Link>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {u.last_active
                        ? formatDistanceToNow(parseISO(u.last_active), { addSuffix: true, locale: vi })
                        : "Chưa từng"}
                    </TableCell>
                    <TableCell className={cn(
                      "text-sm font-semibold tabular-nums",
                      u.days_inactive >= 14 ? "text-red-500" : u.days_inactive >= 7 ? "text-amber-500" : "text-foreground",
                    )}>
                      {u.days_inactive}d
                    </TableCell>
                    <TableCell className="text-sm tabular-nums">{u.trades_this_week}</TableCell>
                    <TableCell className="text-sm tabular-nums text-muted-foreground">
                      {Number(u.median_trades_4w).toFixed(1)}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {u.risk_reasons.map((r) => (
                          <Badge key={r} variant="outline" className={cn("text-[10px]", reasonBadge[r]?.className ?? "")}>
                            {reasonBadge[r]?.label ?? r}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {u.last_action_at && LastActionIcon ? (
                        <div className="flex items-center gap-1.5 justify-end">
                          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[10px]">
                            <Check className="h-3 w-3 mr-1" />
                            {formatDistanceToNow(parseISO(u.last_action_at), { addSuffix: true, locale: vi })}
                          </Badge>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            onClick={() => setDialogUser(u)}
                          >
                            Log lại
                          </Button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs border-gold/40 text-gold hover:bg-gold/10"
                          onClick={() => setDialogUser(u)}
                        >
                          Log re-engagement
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {dialogUser && (
        <LogReengagementDialog
          userId={dialogUser.user_id}
          userName={dialogUser.full_name}
          adminId={adminId}
          open={!!dialogUser}
          onOpenChange={(v) => !v && setDialogUser(null)}
        />
      )}
    </div>
  );
}
