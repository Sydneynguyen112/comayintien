"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Filter } from "lucide-react";
import { useCurrentUser } from "@/lib/auth";
import { PageTransition } from "@/components/shared/PageTransition";
import { Card, CardContent } from "@/components/ui/card";
import { SegmentOverviewTable } from "@/components/admin/segment-overview-table";
import { TopUsersSegmentTable } from "@/components/admin/top-users-segment-table";
import {
  fetchSegmentMetrics, STYLE_META, ACCOUNT_META, TENURE_META,
} from "@/lib/admin/segments-api";

export default function AdminSegmentsPage() {
  const admin = useCurrentUser("admin");

  const styleQ = useQuery({
    queryKey: ["admin", "segments", "metrics", "trading_style"],
    queryFn: () => fetchSegmentMetrics("trading_style"),
  });
  const accountQ = useQuery({
    queryKey: ["admin", "segments", "metrics", "account_type"],
    queryFn: () => fetchSegmentMetrics("account_type"),
  });
  const tenureQ = useQuery({
    queryKey: ["admin", "segments", "metrics", "tenure_stage"],
    queryFn: () => fetchSegmentMetrics("tenure_stage"),
  });

  if (!admin) {
    return <div className="flex items-center justify-center min-h-[60vh] text-muted-foreground">Đang tải...</div>;
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
            <Filter className="h-5 w-5 text-gold" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">
              <span className="gold-gradient-text">Segmentation</span>
            </h1>
            <p className="mt-0.5 text-muted-foreground text-sm">
              Trading style · Account setup · Tenure stage — so sánh segment, find PMF target
            </p>
          </div>
        </div>

        <Card>
          <CardContent className="pt-5 space-y-6">
            <SegmentOverviewTable
              title="1. Trading Style — phân loại theo median trade/tuần (4w qua)"
              rows={styleQ.data ?? []}
              labelMap={STYLE_META}
            />
            <SegmentOverviewTable
              title="2. Account Setup — số trading account user sở hữu"
              rows={accountQ.data ?? []}
              labelMap={ACCOUNT_META}
              showMultiAccountCol={false}
            />
            <SegmentOverviewTable
              title="3. Tenure Stage — thời gian từ khi signup"
              rows={tenureQ.data ?? []}
              labelMap={TENURE_META}
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5 space-y-3">
            <h3 className="text-sm font-semibold">Top users theo filter</h3>
            <TopUsersSegmentTable />
          </CardContent>
        </Card>
      </motion.div>
    </PageTransition>
  );
}
