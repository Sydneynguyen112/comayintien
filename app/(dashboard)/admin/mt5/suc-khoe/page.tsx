"use client";

// Admin: Sức khỏe tài khoản MT5 khách hàng — TK nào đang có vấn đề & vấn đề gì.

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, HeartPulse } from "lucide-react";
import { useCurrentUser } from "@/lib/auth";
import { PageTransition } from "@/components/shared/PageTransition";
import { Mt5HealthView } from "@/components/admin/mt5-health-view";

export default function Mt5HealthPage() {
  const admin = useCurrentUser("admin");

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
        <Link
          href="/admin/mt5"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-gold transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> MT5 monitoring
        </Link>

        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <HeartPulse className="h-6 w-6 text-primary" />
            Sức khỏe khách hàng
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Tài khoản MT5 của khách nào đang có vấn đề (cháy TK, drawdown, margin call, gồng lỗ,
            ngừng trade, sync lỗi) — xếp nặng nhất lên đầu.
          </p>
        </div>

        <Mt5HealthView />
      </motion.div>
    </PageTransition>
  );
}
