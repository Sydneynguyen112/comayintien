"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { MessageCircle, Star, ThumbsUp, ThumbsDown, MinusCircle, MessageSquarePlus, Download } from "lucide-react";
import { format, parseISO, formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import {
  LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from "recharts";
import { useCurrentUser } from "@/lib/auth";
import { PageTransition } from "@/components/shared/PageTransition";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table, TableHeader, TableRow, TableHead, TableBody, TableCell,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { KPICard } from "@/components/admin/kpi-card";
import {
  fetchNpsSummary, fetchNpsTrend, fetchNpsResponses,
  fetchFeedbackStats, fetchFeedbackByType, fetchFeedbackList,
  updateFeedback, FEEDBACK_TYPE_META, FEEDBACK_STATUS_META,
} from "@/lib/admin/voc-api";

export default function AdminVocPage() {
  const admin = useCurrentUser("admin");
  const queryClient = useQueryClient();
  const [feedbackStatus, setFeedbackStatus] = useState<string>("all");
  const [feedbackType, setFeedbackType] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const npsSummaryQ = useQuery({ queryKey: ["admin", "voc", "nps-summary"], queryFn: () => fetchNpsSummary(90) });
  const npsTrendQ = useQuery({ queryKey: ["admin", "voc", "nps-trend"], queryFn: () => fetchNpsTrend(6) });
  const npsResponsesQ = useQuery({ queryKey: ["admin", "voc", "nps-responses"], queryFn: () => fetchNpsResponses(30) });
  const fbStatsQ = useQuery({ queryKey: ["admin", "voc", "fb-stats"], queryFn: fetchFeedbackStats });
  const fbByTypeQ = useQuery({ queryKey: ["admin", "voc", "fb-by-type"], queryFn: fetchFeedbackByType });
  const fbListQ = useQuery({
    queryKey: ["admin", "voc", "fb-list", feedbackStatus, feedbackType],
    queryFn: () => fetchFeedbackList({
      status: feedbackStatus === "all" ? undefined : feedbackStatus,
      type: feedbackType === "all" ? undefined : feedbackType,
      sort_by: "upvotes",
      limit: 50,
    }),
  });

  if (!admin) return <div className="flex items-center justify-center min-h-[60vh] text-muted-foreground">Đang tải...</div>;

  const nps = npsSummaryQ.data;
  const npsScoreTone = (nps?.nps_score ?? 0) >= 50 ? "text-emerald-500"
    : (nps?.nps_score ?? 0) >= 30 ? "text-foreground"
      : (nps?.nps_score ?? 0) >= 0 ? "text-amber-500"
        : "text-red-500";

  const pieData = (fbByTypeQ.data ?? []).map((d) => ({
    type: d.type,
    label: FEEDBACK_TYPE_META[d.type]?.label ?? d.type,
    color: FEEDBACK_TYPE_META[d.type]?.color ?? "#6B7280",
    value: d.count,
  }));

  async function changeStatus(id: number, status: string) {
    await updateFeedback(id, { status });
    queryClient.invalidateQueries({ queryKey: ["admin", "voc", "fb-list"] });
    queryClient.invalidateQueries({ queryKey: ["admin", "voc", "fb-stats"] });
  }

  return (
    <PageTransition>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="space-y-8">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gold/15 flex items-center justify-center">
            <MessageCircle className="h-5 w-5 text-gold" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">
              <span className="gold-gradient-text">Voice of Customer</span>
            </h1>
            <p className="mt-0.5 text-muted-foreground text-sm">NPS · Feedback · User insights</p>
          </div>
        </div>

        {/* SECTION 5.1 — NPS */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Star className="h-4 w-4 text-gold" />
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gold">5.1 NPS Score</h2>
            <span className="text-xs text-muted-foreground">90 ngày gần nhất · benchmark &gt;30 tốt</span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KPICard
              label="NPS Score"
              icon={Star}
              value={nps?.nps_score ?? 0}
              hint={`${nps?.total_responses ?? 0} response`}
              loading={npsSummaryQ.isLoading}
              highlight
            />
            <KPICard label="Promoters" icon={ThumbsUp} value={nps?.promoters ?? 0} format="number" hint={`${nps?.promoter_pct ?? 0}%`} loading={npsSummaryQ.isLoading} />
            <KPICard label="Passives" icon={MinusCircle} value={nps?.passives ?? 0} hint={`${nps?.passive_pct ?? 0}%`} loading={npsSummaryQ.isLoading} />
            <KPICard label="Detractors" icon={ThumbsDown} value={nps?.detractors ?? 0} hint={`${nps?.detractor_pct ?? 0}%`} loading={npsSummaryQ.isLoading} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="lg:col-span-2">
              <CardContent className="pt-5">
                <h3 className="text-sm font-semibold mb-3">NPS Trend · 6 tháng</h3>
                {npsTrendQ.isLoading || !npsTrendQ.data ? (
                  <div className="h-44 rounded-lg bg-muted/30 animate-pulse" />
                ) : npsTrendQ.data.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">Chưa có NPS response.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={npsTrendQ.data}>
                      <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.08} />
                      <XAxis dataKey="month_start" tickFormatter={(d) => format(parseISO(d), "M/yy")} fontSize={10} />
                      <YAxis fontSize={10} domain={[-100, 100]} />
                      <Tooltip
                        contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
                        labelFormatter={(d) => format(parseISO(d as string), "MMMM yyyy")}
                      />
                      <Line type="monotone" dataKey="nps_score" stroke="#CD9C20" strokeWidth={2} dot={{ r: 3 }} name="NPS" />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-5">
                <h3 className="text-sm font-semibold mb-3">Phân bố</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: "Promoter", value: nps?.promoters ?? 0 },
                        { name: "Passive", value: nps?.passives ?? 0 },
                        { name: "Detractor", value: nps?.detractors ?? 0 },
                      ]}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={40}
                      outerRadius={70}
                    >
                      <Cell fill="#3B6C4F" />
                      <Cell fill="#6B7280" />
                      <Cell fill="#B8512E" />
                    </Pie>
                    <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 10 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className={cn("text-center text-3xl font-extrabold mt-1", npsScoreTone)}>{nps?.nps_score ?? 0}</div>
                <div className="text-center text-[10px] uppercase tracking-wide text-muted-foreground">NPS Score</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardContent className="pt-5">
              <h3 className="text-sm font-semibold mb-3">Response gần nhất</h3>
              <div className="overflow-x-auto rounded-lg border border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Score</TableHead>
                      <TableHead>Lý do</TableHead>
                      <TableHead>Khi nào</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {npsResponsesQ.isLoading ? (
                      <TableRow><TableCell colSpan={4} className="text-center py-6 text-muted-foreground">Đang tải...</TableCell></TableRow>
                    ) : npsResponsesQ.data?.length === 0 ? (
                      <TableRow><TableCell colSpan={4} className="text-center py-6 text-muted-foreground">Chưa có response.</TableCell></TableRow>
                    ) : (
                      npsResponsesQ.data?.map((r) => {
                        const isDetractor = r.score <= 6;
                        return (
                          <TableRow key={r.id} className={isDetractor ? "bg-red-500/5" : ""}>
                            <TableCell>
                              <Link href={`/admin/khach-hang/${r.user_id}`} className="hover:opacity-80">
                                <div className="font-medium text-foreground hover:text-gold text-sm">{r.full_name}</div>
                                <div className="text-[11px] text-muted-foreground">{r.email}</div>
                              </Link>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={cn(
                                "text-xs font-bold",
                                r.score >= 9 ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30" :
                                r.score >= 7 ? "bg-muted text-muted-foreground border-border" :
                                "bg-red-500/10 text-red-500 border-red-500/30",
                              )}>
                                {r.score}/10
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs max-w-md">{r.reason || <span className="italic text-muted-foreground">—</span>}</TableCell>
                            <TableCell className="text-[11px] text-muted-foreground">
                              {formatDistanceToNow(parseISO(r.created_at), { addSuffix: true, locale: vi })}
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
        </div>

        {/* SECTION 5.2 — Feedback */}
        <div className="space-y-4 border-t border-border/50 pt-6">
          <div className="flex items-center gap-2">
            <MessageSquarePlus className="h-4 w-4 text-gold" />
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gold">5.2 User Feedback</h2>
            <span className="text-xs text-muted-foreground">Bug, feature request, complaint, praise</span>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <KPICard label="Tổng feedback" icon={MessageCircle} value={fbStatsQ.data?.total ?? 0} hint="90 ngày" loading={fbStatsQ.isLoading} />
            <KPICard label="Chưa review" icon={MessageSquarePlus} value={fbStatsQ.data?.new_count ?? 0} hint="cần action" loading={fbStatsQ.isLoading} highlight />
            <KPICard label="Open items" icon={MessageCircle} value={fbStatsQ.data?.open_count ?? 0} hint="đang xử lý" loading={fbStatsQ.isLoading} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-5">
                <h3 className="text-sm font-semibold mb-3">Theo loại</h3>
                {fbByTypeQ.isLoading || pieData.length === 0 ? (
                  <div className="h-48 rounded-lg bg-muted/30 animate-pulse" />
                ) : (
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie data={pieData} dataKey="value" nameKey="label" innerRadius={40} outerRadius={70}>
                        {pieData.map((p) => <Cell key={p.type} fill={p.color} />)}
                      </Pie>
                      <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
                      <Legend wrapperStyle={{ fontSize: 10 }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardContent className="pt-5 space-y-3">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <label className="flex items-center gap-1.5">
                    <span className="text-muted-foreground">Status</span>
                    <select value={feedbackStatus} onChange={(e) => setFeedbackStatus(e.target.value)} className="h-8 px-2 rounded-lg border border-border bg-card text-xs">
                      <option value="all">Tất cả</option>
                      {Object.entries(FEEDBACK_STATUS_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                    </select>
                  </label>
                  <label className="flex items-center gap-1.5">
                    <span className="text-muted-foreground">Type</span>
                    <select value={feedbackType} onChange={(e) => setFeedbackType(e.target.value)} className="h-8 px-2 rounded-lg border border-border bg-card text-xs">
                      <option value="all">Tất cả</option>
                      {Object.entries(FEEDBACK_TYPE_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                    </select>
                  </label>
                </div>

                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                  {fbListQ.isLoading ? (
                    <p className="text-center py-6 text-muted-foreground">Đang tải...</p>
                  ) : fbListQ.data?.length === 0 ? (
                    <p className="text-center py-6 text-muted-foreground">Chưa có feedback.</p>
                  ) : (
                    fbListQ.data?.map((f) => {
                      const isExpanded = expandedId === f.id;
                      const typeMeta = FEEDBACK_TYPE_META[f.type];
                      const statusMeta = FEEDBACK_STATUS_META[f.status];
                      return (
                        <div key={f.id} className="rounded-lg border border-border p-3 text-sm">
                          <div className="flex items-start gap-3">
                            <button
                              onClick={() => setExpandedId(isExpanded ? null : f.id)}
                              className="flex-1 text-left min-w-0"
                            >
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge variant="outline" style={{ background: `${typeMeta?.color}20`, borderColor: typeMeta?.color, color: typeMeta?.color }} className="text-[10px]">
                                  {typeMeta?.label}
                                </Badge>
                                <span className="font-medium text-foreground truncate">{f.title}</span>
                                {f.upvotes > 0 && (
                                  <Badge variant="outline" className="text-[10px]">
                                    <ThumbsUp className="h-3 w-3 mr-1" /> {f.upvotes}
                                  </Badge>
                                )}
                              </div>
                              <div className="text-[11px] text-muted-foreground mt-1">
                                {f.full_name} · {formatDistanceToNow(parseISO(f.created_at), { addSuffix: true, locale: vi })}
                                {f.attached_url && <> · <span className="text-gold">{f.attached_url}</span></>}
                              </div>
                            </button>
                            <select
                              value={f.status}
                              onChange={(e) => changeStatus(f.id, e.target.value)}
                              className="h-7 px-2 rounded border border-border bg-card text-[11px]"
                              style={{ color: statusMeta?.color }}
                            >
                              {Object.entries(FEEDBACK_STATUS_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                            </select>
                          </div>
                          {isExpanded && (
                            <div className="mt-3 pt-3 border-t border-border space-y-2">
                              <p className="text-xs text-foreground whitespace-pre-wrap">{f.content}</p>
                              {f.admin_notes && (
                                <div className="rounded bg-muted/40 p-2 text-[11px] text-muted-foreground">
                                  <span className="font-medium">Admin note:</span> {f.admin_notes}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* SECTION 5.3 — External tools placeholder */}
        <Card className="border-dashed">
          <CardContent className="pt-5">
            <h3 className="text-sm font-semibold mb-2">5.3 Session replay & support (external)</h3>
            <p className="text-xs text-muted-foreground mb-3">
              Recommend setup <strong>Microsoft Clarity</strong> (free) cho session replay + heatmap. Sau khi setup, paste link dashboard ở đây.
            </p>
            <a
              href="https://clarity.microsoft.com"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border hover:bg-muted/40 text-xs text-foreground transition-colors"
            >
              Mở Clarity →
            </a>
          </CardContent>
        </Card>
      </motion.div>
    </PageTransition>
  );
}
