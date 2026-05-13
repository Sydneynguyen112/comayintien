"use client";

// Admin page standalone xem MT5 monitoring — không cần link với customer/machine.
// Add MT5 account → mt5-bridge sync data → drill xuống xem trades + transactions.

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, CheckCircle2, ChevronDown, ChevronRight, Clock, Trash2, XCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useCurrentUser } from "@/lib/auth";
import { cn, formatDate } from "@/lib/utils";
import { PageTransition } from "@/components/shared/PageTransition";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Mt5AddDialog } from "@/components/admin/mt5-add-dialog";
import { Mt5ActivityLog } from "@/components/admin/mt5-activity-log";
import { deleteMt5Account } from "@/lib/co-may/mt5-actions";

interface Mt5AccountRow {
  id: string;
  user_id: string | null;
  login: string;
  server: string;
  nickname: string | null;
  broker_name: string | null;
  status: string;
  last_error: string | null;
  last_synced_at: string | null;
  created_at: string;
}

interface Mt5StateRow {
  mt5_account_id: string;
  balance: number | null;
  equity: number | null;
  positions_count: number | null;
  updated_at: string;
}

const statusConfig: Record<string, { icon: typeof CheckCircle2; tone: string; label: string }> = {
  active:   { icon: CheckCircle2, tone: "text-emerald-500 border-emerald-500/30 bg-emerald-500/10",      label: "Đang sync" },
  pending:  { icon: Clock,        tone: "text-amber-500 border-amber-500/30 bg-amber-500/10",            label: "Chờ sync lần đầu" },
  error:    { icon: XCircle,      tone: "text-red-500 border-red-500/30 bg-red-500/10",                  label: "Lỗi sync" },
  disabled: { icon: XCircle,      tone: "text-muted-foreground border-border bg-muted",                  label: "Đã tắt" },
};

function timeSince(iso: string | null): string {
  if (!iso) return "Chưa từng";
  const diffMs = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diffMs / (1000 * 60));
  if (m < 1) return "Vừa xong";
  if (m < 60) return `${m} phút trước`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} giờ trước`;
  const d = Math.floor(h / 24);
  return `${d} ngày trước`;
}

export default function AdminMt5Page() {
  const admin = useCurrentUser("admin");
  const [accounts, setAccounts] = useState<Mt5AccountRow[]>([]);
  const [states, setStates] = useState<Record<string, Mt5StateRow>>({});
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  async function loadData() {
    setLoading(true);
    const [accRes, stateRes] = await Promise.all([
      supabase.from("mt5_accounts").select("*").order("created_at", { ascending: false }),
      supabase.from("mt5_account_states").select("*"),
    ]);
    setAccounts((accRes.data ?? []) as Mt5AccountRow[]);
    const stateMap: Record<string, Mt5StateRow> = {};
    for (const s of (stateRes.data ?? []) as Mt5StateRow[]) stateMap[s.mt5_account_id] = s;
    setStates(stateMap);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleDelete(id: string, label: string) {
    if (!confirm(`Xoá account "${label}" và toàn bộ data (trades, transactions)? Không khôi phục được.`)) return;
    const res = await deleteMt5Account(id);
    if (!res.success) {
      alert(`Xoá fail: ${res.error}`);
      return;
    }
    await loadData();
  }

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (!admin) {
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
        className="space-y-5"
      >
        {/* Back link */}
        <Link
          href="/admin"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-gold transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Admin dashboard
        </Link>

        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">MT5 Monitoring</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Theo dõi {accounts.length} tài khoản MT5 đang sync — lệnh ra vào + nạp/rút thật.
            </p>
          </div>
          <Mt5AddDialog onCreated={loadData} />
        </div>

        {loading ? (
          <div className="text-sm text-muted-foreground py-10 text-center">Đang tải...</div>
        ) : accounts.length === 0 ? (
          <Card>
            <CardContent className="pt-8 pb-8 text-center space-y-2">
              <p className="text-sm text-muted-foreground">Chưa có MT5 account nào.</p>
              <p className="text-xs text-muted-foreground/80">
                Click "Thêm MT5 account" để bắt đầu.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {accounts.map((acc) => {
              const isOpen = expanded.has(acc.id);
              const st = statusConfig[acc.status] ?? statusConfig.pending;
              const StatusIcon = st.icon;
              const state = states[acc.id];
              const label = acc.nickname || `${acc.login}@${acc.server}`;

              return (
                <Card key={acc.id} className="overflow-hidden">
                  <button
                    type="button"
                    onClick={() => toggleExpand(acc.id)}
                    className="w-full text-left hover:bg-muted/20 transition-colors"
                  >
                    <CardContent className="pt-4 pb-4 flex items-start gap-3">
                      {isOpen ? <ChevronDown className="h-4 w-4 mt-1 shrink-0" /> : <ChevronRight className="h-4 w-4 mt-1 shrink-0" />}
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-base">{label}</span>
                          <Badge variant="outline" className={cn("text-[10px]", st.tone)}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {st.label}
                          </Badge>
                          <span className="text-xs text-muted-foreground tabular-nums">
                            Login {acc.login} · {acc.server}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground tabular-nums">
                          <span>Sync cuối: <span className="text-foreground">{timeSince(acc.last_synced_at)}</span></span>
                          {state && (
                            <>
                              <span>Balance: <span className="text-foreground font-semibold">${Number(state.balance ?? 0).toLocaleString("en-US", { maximumFractionDigits: 2 })}</span></span>
                              <span>Equity: <span className="text-foreground font-semibold">${Number(state.equity ?? 0).toLocaleString("en-US", { maximumFractionDigits: 2 })}</span></span>
                              <span>Open: <span className="text-foreground font-semibold">{state.positions_count ?? 0}</span></span>
                            </>
                          )}
                        </div>
                        {acc.last_error && (
                          <div className="text-xs text-red-600 dark:text-red-400">
                            ⚠ {acc.last_error}
                          </div>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(acc.id, label);
                        }}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </CardContent>
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-5 pt-1 border-t border-border bg-muted/20">
                      <Mt5ActivityLog mt5AccountId={acc.id} daysBack={365} />
                      <div className="mt-3 text-[10px] text-muted-foreground/80">
                        ID: <code className="font-mono">{acc.id}</code> · Created {formatDate(acc.created_at)}
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}

        {/* Setup guide */}
        <Card className="bg-muted/20">
          <CardContent className="pt-4 pb-4 space-y-2">
            <h3 className="text-sm font-semibold">Setup mt5-bridge sync</h3>
            <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
              <li>Thêm MT5 account ở trên → copy <code>id</code> ở section expand.</li>
              <li>Trong <code>mt5-bridge/.env</code> set <code>MT5_ACCOUNT_LOGIN</code>, <code>MT5_ACCOUNT_PASSWORD</code>, <code>MT5_ACCOUNT_SERVER</code>.</li>
              <li>Set <code>SUPABASE_URL</code>, <code>SUPABASE_SERVICE_ROLE_KEY</code> trong cùng .env.</li>
              <li>Chạy <code>python test_sync.py</code> — MT5 terminal phải đang chạy. Sẽ sync trades + transactions vào DB.</li>
              <li>Reload page này → click expand account → thấy log hoạt động.</li>
            </ol>
          </CardContent>
        </Card>
      </motion.div>
    </PageTransition>
  );
}
