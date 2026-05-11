"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Download, Filter } from "lucide-react";
import { format, parseISO, formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableHeader, TableRow, TableHead, TableBody, TableCell,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  fetchTopUsers, STYLE_META, ACCOUNT_META, TENURE_META,
} from "@/lib/admin/segments-api";
import { TIER_META } from "@/lib/admin/engagement-api";

export function TopUsersSegmentTable() {
  const [style, setStyle] = useState<string>("all");
  const [accountType, setAccountType] = useState<string>("all");
  const [tenure, setTenure] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"habit_score" | "total_trades" | "last_active">("habit_score");
  const [limit, setLimit] = useState(50);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "segments", "top-users", style, accountType, tenure, sortBy, limit],
    queryFn: () =>
      fetchTopUsers({
        trading_style: style === "all" ? undefined : style,
        account_type: accountType === "all" ? undefined : accountType,
        tenure_stage: tenure === "all" ? undefined : tenure,
        sort_by: sortBy,
        limit,
      }),
  });

  function exportCsv() {
    if (!data) return;
    const header = ["Email", "Name", "Style", "Account type", "Tenure", "Accounts", "Tier", "Habit Score", "Trades/Week", "Total Trades", "Last Active", "Signup"];
    const rows = data.map((u) => [
      u.email, u.full_name, u.trading_style, u.account_type, u.tenure_stage,
      u.account_count, u.tier, Number(u.habit_score).toFixed(1),
      Number(u.median_weekly_trades).toFixed(1), u.total_trades,
      u.last_active ?? "", u.signup_date ?? "",
    ]);
    const csv = [header, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `users-${style}-${accountType}-${tenure}-${format(new Date(), "yyyyMMdd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-3">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <Filter className="h-3.5 w-3.5 text-muted-foreground" />
        <FilterSelect
          label="Style"
          value={style}
          onChange={setStyle}
          options={[{ value: "all", label: "Tất cả" }, ...Object.entries(STYLE_META).map(([k, v]) => ({ value: k, label: v.label }))]}
        />
        <FilterSelect
          label="Account"
          value={accountType}
          onChange={setAccountType}
          options={[{ value: "all", label: "Tất cả" }, ...Object.entries(ACCOUNT_META).map(([k, v]) => ({ value: k, label: v.label }))]}
        />
        <FilterSelect
          label="Tenure"
          value={tenure}
          onChange={setTenure}
          options={[{ value: "all", label: "Tất cả" }, ...Object.entries(TENURE_META).map(([k, v]) => ({ value: k, label: v.label }))]}
        />
        <FilterSelect
          label="Sort"
          value={sortBy}
          onChange={(v) => setSortBy(v as "habit_score" | "total_trades" | "last_active")}
          options={[
            { value: "habit_score", label: "Habit score" },
            { value: "total_trades", label: "Total trades" },
            { value: "last_active", label: "Last active" },
          ]}
        />
        <input
          type="number"
          min={10}
          max={200}
          step={10}
          value={limit}
          onChange={(e) => setLimit(Math.min(200, Math.max(10, Number(e.target.value))))}
          className="h-8 w-20 px-2 rounded-lg border border-border bg-card text-xs"
        />
        <Button variant="outline" size="sm" onClick={exportCsv} disabled={!data?.length} className="ml-auto h-8">
          <Download className="h-3.5 w-3.5 mr-1.5" /> CSV ({data?.length ?? 0})
        </Button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>#</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Style</TableHead>
              <TableHead>Acc</TableHead>
              <TableHead>Tier</TableHead>
              <TableHead>Habit</TableHead>
              <TableHead>Trades/Week</TableHead>
              <TableHead>Total trades</TableHead>
              <TableHead>Last active</TableHead>
              <TableHead>Signup</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={10} className="text-center py-6 text-muted-foreground">Đang tải...</TableCell></TableRow>
            ) : data?.length === 0 ? (
              <TableRow><TableCell colSpan={10} className="text-center py-6 text-muted-foreground">Không match filter.</TableCell></TableRow>
            ) : (
              data?.map((u, i) => {
                const styleMeta = STYLE_META[u.trading_style];
                const tierMeta = TIER_META[u.tier];
                return (
                  <TableRow key={u.user_id}>
                    <TableCell className="text-xs text-muted-foreground tabular-nums">{i + 1}</TableCell>
                    <TableCell>
                      <Link href={`/admin/khach-hang/${u.user_id}`} className="hover:opacity-80">
                        <div className="font-medium text-foreground hover:text-gold transition-colors">{u.full_name}</div>
                        <div className="text-[11px] text-muted-foreground">{u.email}</div>
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" style={{ background: `${styleMeta?.color}20`, borderColor: styleMeta?.color, color: styleMeta?.color }} className="text-[10px]">
                        {styleMeta?.label ?? u.trading_style}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs tabular-nums">{u.account_count}</TableCell>
                    <TableCell>
                      {tierMeta && (
                        <Badge variant="outline" style={{ background: `${tierMeta.color}20`, borderColor: tierMeta.color, color: tierMeta.color }} className="text-[10px]">
                          {tierMeta.label}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 min-w-[80px]">
                        <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
                          <div className="h-full bg-gold rounded-full" style={{ width: `${Math.min(100, Number(u.habit_score))}%` }} />
                        </div>
                        <span className="text-xs font-semibold tabular-nums">{Number(u.habit_score).toFixed(0)}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs tabular-nums">{Number(u.median_weekly_trades).toFixed(1)}</TableCell>
                    <TableCell className="text-xs tabular-nums">{u.total_trades}</TableCell>
                    <TableCell className="text-[11px] text-muted-foreground">
                      {u.last_active ? formatDistanceToNow(parseISO(u.last_active), { addSuffix: true, locale: vi }) : "—"}
                    </TableCell>
                    <TableCell className="text-[11px] text-muted-foreground">
                      {u.signup_date ? format(parseISO(u.signup_date), "d/M/yyyy") : "—"}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function FilterSelect({
  label, value, onChange, options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="flex items-center gap-1.5">
      <span className="text-muted-foreground">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "h-8 px-2 rounded-lg border border-border bg-card text-xs",
        )}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </label>
  );
}
