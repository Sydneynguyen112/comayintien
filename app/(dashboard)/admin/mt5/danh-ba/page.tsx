"use client";

// Admin: bảng tổng hợp toàn bộ MT5 accounts (khách đã nhập). Login/server hiển
// thị thẳng; password ẩn mặc định, click "Hiện" để decrypt server-side và copy.

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Copy,
  Eye,
  EyeOff,
  RefreshCcw,
  XCircle,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useCurrentUser } from "@/lib/auth";
import { cn, formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getMt5DecryptedPassword } from "@/lib/co-may/mt5-actions";

interface EnrichedAccount {
  id: string;
  login: string;
  server: string;
  nickname: string | null;
  broker_name: string | null;
  status: string;
  last_synced_at: string | null;
  created_at: string;
  customer_name: string;
  customer_email: string;
  machine_name: string;
}

const STATUS_CFG: Record<string, { icon: typeof CheckCircle2; tone: string; label: string }> = {
  active: { icon: CheckCircle2, tone: "text-emerald-500 border-emerald-500/30 bg-emerald-500/10", label: "Đang sync" },
  pending: { icon: Clock, tone: "text-amber-500 border-amber-500/30 bg-amber-500/10", label: "Chờ sync" },
  error: { icon: XCircle, tone: "text-red-500 border-red-500/30 bg-red-500/10", label: "Lỗi" },
  disabled: { icon: AlertCircle, tone: "text-muted-foreground border-border bg-muted", label: "Tắt" },
};

function timeSince(iso: string | null): string {
  if (!iso) return "Chưa từng";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "Vừa xong";
  if (m < 60) return `${m} phút trước`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} giờ trước`;
  return `${Math.floor(h / 24)} ngày trước`;
}

export default function Mt5DanhBaPage() {
  const admin = useCurrentUser("admin");
  const [accounts, setAccounts] = useState<EnrichedAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [shown, setShown] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const accRes = await supabase
      .from("mt5_accounts")
      .select("id, user_id, login, server, nickname, broker_name, status, last_synced_at, created_at")
      .order("created_at", { ascending: false });
    const accList = (accRes.data ?? []) as {
      id: string; user_id: string | null; login: string; server: string;
      nickname: string | null; broker_name: string | null; status: string;
      last_synced_at: string | null; created_at: string;
    }[];

    if (accList.length === 0) {
      setAccounts([]);
      setLoading(false);
      return;
    }

    const accountIds = accList.map((a) => a.id);
    const userIds = Array.from(new Set(accList.map((a) => a.user_id).filter((x): x is string => !!x)));

    const linksRes = await supabase
      .from("mt5_machine_links")
      .select("mt5_account_id, machine_id")
      .in("mt5_account_id", accountIds);
    const links = (linksRes.data ?? []) as { mt5_account_id: string; machine_id: string }[];
    const machineIdByAccount = new Map(links.map((l) => [l.mt5_account_id, l.machine_id]));
    const machineIds = Array.from(new Set(links.map((l) => l.machine_id)));

    const [mRes, pRes] = await Promise.all([
      machineIds.length
        ? supabase.from("comay_machines").select("id, name").in("id", machineIds)
        : Promise.resolve({ data: [] }),
      userIds.length
        ? supabase.from("profiles").select("id, full_name, email").in("id", userIds)
        : Promise.resolve({ data: [] }),
    ]);
    const machineNameById = new Map(((mRes.data ?? []) as { id: string; name: string }[]).map((m) => [m.id, m.name]));
    const profileById = new Map(
      ((pRes.data ?? []) as { id: string; full_name: string | null; email: string | null }[]).map((p) => [p.id, p]),
    );

    const enriched: EnrichedAccount[] = accList.map((a) => {
      const machineId = machineIdByAccount.get(a.id);
      const profile = a.user_id ? profileById.get(a.user_id) : null;
      return {
        id: a.id,
        login: a.login,
        server: a.server,
        nickname: a.nickname,
        broker_name: a.broker_name,
        status: a.status,
        last_synced_at: a.last_synced_at,
        created_at: a.created_at,
        customer_name: profile?.full_name ?? "—",
        customer_email: profile?.email ?? "—",
        machine_name: machineId ? machineNameById.get(machineId) ?? "—" : "—",
      };
    });
    setAccounts(enriched);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function toggleShow(a: EnrichedAccount) {
    if (shown[a.id]) {
      setShown((s) => {
        const n = { ...s };
        delete n[a.id];
        return n;
      });
      return;
    }
    setBusyId(a.id);
    const res = await getMt5DecryptedPassword(a.id);
    setBusyId(null);
    if (!res.success || !res.password) {
      alert(res.error ?? "Không lấy được password");
      return;
    }
    setShown((s) => ({ ...s, [a.id]: res.password! }));
  }

  function copy(key: string, value: string) {
    navigator.clipboard?.writeText(value);
    setCopied(key);
    setTimeout(() => setCopied((c) => (c === key ? null : c)), 1500);
  }

  if (!admin) {
    return <div className="flex items-center justify-center min-h-[40vh] text-muted-foreground">Đang tải...</div>;
  }

  const filtered = accounts.filter((a) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      a.login.toLowerCase().includes(q) ||
      a.server.toLowerCase().includes(q) ||
      a.customer_name.toLowerCase().includes(q) ||
      a.customer_email.toLowerCase().includes(q) ||
      a.machine_name.toLowerCase().includes(q) ||
      (a.nickname ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-5">
      <Link href="/admin/mt5" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-gold transition-colors">
        <ArrowLeft className="h-4 w-4" /> MT5 monitoring
      </Link>

      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Danh bạ MT5</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Tra cứu credentials để login MT5 thủ công khi cần. Password được giải mã server-side, không lưu cache.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCcw className="h-3.5 w-3.5" /> Reload
        </Button>
      </div>

      <input
        type="search"
        placeholder="Tìm theo login / server / khách / cỗ máy..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="h-10 w-full md:w-96 rounded-lg border border-input bg-background text-foreground px-3 text-sm focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 outline-none"
      />

      {loading ? (
        <div className="text-sm text-muted-foreground py-10 text-center">Đang tải...</div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="pt-8 pb-8 text-center text-sm text-muted-foreground">
            {accounts.length === 0 ? "Chưa có MT5 account nào." : "Không có account khớp filter."}
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr className="text-left text-[11px] uppercase tracking-widest text-muted-foreground">
                  <Th>Khách hàng</Th>
                  <Th>Cỗ máy</Th>
                  <Th>Login</Th>
                  <Th>Server</Th>
                  <Th>Status</Th>
                  <Th>Sync cuối</Th>
                  <Th>Password</Th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((a) => {
                  const cfg = STATUS_CFG[a.status] ?? STATUS_CFG.pending;
                  const StatusIcon = cfg.icon;
                  const visiblePwd = shown[a.id];
                  return (
                    <tr key={a.id} className="border-t border-border/60 hover:bg-muted/10 transition-colors">
                      <Td>
                        <div className="font-medium text-foreground truncate max-w-[180px]">{a.customer_name}</div>
                        <div className="text-[11px] text-muted-foreground truncate max-w-[180px]">{a.customer_email}</div>
                      </Td>
                      <Td>
                        <div className="text-foreground truncate max-w-[160px]">{a.machine_name}</div>
                        {a.nickname && <div className="text-[11px] text-muted-foreground">{a.nickname}</div>}
                      </Td>
                      <Td>
                        <div className="inline-flex items-center gap-1.5">
                          <span className="font-mono tabular-nums">{a.login}</span>
                          <CopyBtn label="Copy login" active={copied === `login-${a.id}`} onClick={() => copy(`login-${a.id}`, a.login)} />
                        </div>
                      </Td>
                      <Td>
                        <div className="inline-flex items-center gap-1.5">
                          <span className="font-mono text-foreground">{a.server}</span>
                          <CopyBtn label="Copy server" active={copied === `server-${a.id}`} onClick={() => copy(`server-${a.id}`, a.server)} />
                        </div>
                      </Td>
                      <Td>
                        <Badge variant="outline" className={cn("text-[10px]", cfg.tone)}>
                          <StatusIcon className="h-3 w-3 mr-1" /> {cfg.label}
                        </Badge>
                      </Td>
                      <Td>
                        <span className="text-muted-foreground tabular-nums whitespace-nowrap" title={a.last_synced_at ? formatDate(a.last_synced_at) : ""}>
                          {timeSince(a.last_synced_at)}
                        </span>
                      </Td>
                      <Td>
                        <div className="inline-flex items-center gap-1.5">
                          {visiblePwd ? (
                            <>
                              <span className="font-mono text-foreground max-w-[200px] truncate" title={visiblePwd}>{visiblePwd}</span>
                              <CopyBtn label="Copy password" active={copied === `pwd-${a.id}`} onClick={() => copy(`pwd-${a.id}`, visiblePwd)} />
                              <button type="button" onClick={() => toggleShow(a)} title="Ẩn" className="text-muted-foreground hover:text-foreground p-1">
                                <EyeOff className="h-3.5 w-3.5" />
                              </button>
                            </>
                          ) : (
                            <>
                              <span className="font-mono text-muted-foreground">••••••••</span>
                              <button
                                type="button"
                                onClick={() => toggleShow(a)}
                                disabled={busyId === a.id}
                                className="inline-flex items-center gap-1 text-[11px] text-primary hover:text-primary/80 disabled:opacity-50"
                              >
                                <Eye className="h-3.5 w-3.5" /> {busyId === a.id ? "..." : "Hiện"}
                              </button>
                            </>
                          )}
                        </div>
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <p className="text-[11px] text-muted-foreground italic">
        Password chỉ giải mã khi bạn bấm &ldquo;Hiện&rdquo; (qua server action, không lưu trong DOM cho đến lúc đó). Không chia sẻ màn hình khi đang xem.
      </p>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-4 py-2 font-medium whitespace-nowrap">{children}</th>;
}
function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-4 py-2.5 align-top">{children}</td>;
}

function CopyBtn({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={cn(
        "inline-flex items-center justify-center rounded p-1 transition-colors",
        active ? "text-emerald-500" : "text-muted-foreground hover:text-foreground",
      )}
    >
      {active ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}
