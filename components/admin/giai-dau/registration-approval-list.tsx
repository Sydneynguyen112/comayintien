"use client";

// Admin: danh sách đăng ký của 1 giải — duyệt / từ chối. Enrich tên máy + người chơi.

import { useCallback, useEffect, useState } from "react";
import { Check, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/co-may/currency";
import { approveRegistration, rejectRegistration } from "@/lib/co-may/tournament-actions";
import type { CurrencyUnit, RegistrationStatus, TournamentRegistration } from "@/lib/co-may/types";

interface Enriched extends TournamentRegistration {
  machine_name: string;
  capital: number;
  currency_unit: CurrencyUnit;
  display_name: string;
}

const STATUS_TONE: Record<RegistrationStatus, string> = {
  pending: "text-amber-500 border-amber-500/30 bg-amber-500/10",
  approved: "text-emerald-500 border-emerald-500/30 bg-emerald-500/10",
  rejected: "text-red-500 border-red-500/30 bg-red-500/10",
};
const STATUS_LABEL: Record<RegistrationStatus, string> = {
  pending: "Chờ duyệt",
  approved: "Đã duyệt",
  rejected: "Từ chối",
};

export function RegistrationApprovalList({
  tournamentId,
  adminId,
  onChanged,
}: {
  tournamentId: string;
  adminId?: string;
  onChanged?: () => void;
}) {
  const [rows, setRows] = useState<Enriched[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: regs } = await supabase
      .from("tournament_registrations")
      .select("*")
      .eq("tournament_id", tournamentId)
      .order("created_at", { ascending: false });
    const list = (regs ?? []) as TournamentRegistration[];
    if (list.length === 0) {
      setRows([]);
      setLoading(false);
      return;
    }
    const machineIds = list.map((r) => r.machine_id);
    const userIds = Array.from(new Set(list.map((r) => r.user_id)));

    const [mRes, pRes] = await Promise.all([
      supabase.from("comay_machines").select("id, name, capital, currency_unit").in("id", machineIds),
      supabase.from("profiles").select("id, full_name").in("id", userIds),
    ]);
    const mById = new Map(((mRes.data ?? []) as { id: string; name: string; capital: number; currency_unit: string | null }[]).map((m) => [m.id, m]));
    const nById = new Map(((pRes.data ?? []) as { id: string; full_name: string | null }[]).map((p) => [p.id, p.full_name ?? "—"]));

    setRows(
      list.map((r) => {
        const m = mById.get(r.machine_id);
        return {
          ...r,
          machine_name: m?.name ?? "—",
          capital: Number(m?.capital ?? 0),
          currency_unit: ((m?.currency_unit as CurrencyUnit) ?? "USD") || "USD",
          display_name: nById.get(r.user_id) ?? "—",
        };
      }),
    );
    setLoading(false);
  }, [tournamentId]);

  useEffect(() => {
    load();
  }, [load]);

  async function onApprove(id: string) {
    setBusy(id);
    const res = await approveRegistration(id, adminId);
    setBusy(null);
    if (!res.success) return alert(res.error);
    await load();
    onChanged?.();
  }
  async function onReject(id: string) {
    const reason = prompt("Lý do từ chối (tuỳ chọn):") ?? undefined;
    setBusy(id);
    const res = await rejectRegistration(id, reason, adminId);
    setBusy(null);
    if (!res.success) return alert(res.error);
    await load();
    onChanged?.();
  }

  if (loading) return <div className="text-sm text-muted-foreground py-4">Đang tải đăng ký...</div>;
  if (rows.length === 0)
    return <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">Chưa có đăng ký nào.</div>;

  return (
    <div className="space-y-2">
      {rows.map((r) => (
        <div key={r.id} className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-foreground truncate">{r.machine_name}</span>
              <Badge variant="outline" className={cn("text-[10px]", STATUS_TONE[r.status])}>{STATUS_LABEL[r.status]}</Badge>
            </div>
            <div className="text-xs text-muted-foreground">
              {r.display_name} · Vốn {formatMoney(r.capital, r.currency_unit)}
              {r.reject_reason ? ` · Lý do: ${r.reject_reason}` : ""}
            </div>
          </div>
          {r.status === "pending" && (
            <div className="flex items-center gap-2 shrink-0">
              <Button size="sm" variant="default" disabled={busy === r.id} onClick={() => onApprove(r.id)} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                <Check className="h-3.5 w-3.5" /> Duyệt
              </Button>
              <Button size="sm" variant="outline" disabled={busy === r.id} onClick={() => onReject(r.id)} className="text-red-500 hover:text-red-600">
                <X className="h-3.5 w-3.5" /> Từ chối
              </Button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
