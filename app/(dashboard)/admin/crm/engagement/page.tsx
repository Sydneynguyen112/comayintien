"use client";

import { motion } from "framer-motion";
import { Flame } from "lucide-react";
import { useCurrentUser } from "@/lib/auth";
import { PageTransition } from "@/components/shared/PageTransition";
import { HabitStrengthSection } from "@/components/admin/habit-strength-section";
import { TierDistributionSection } from "@/components/admin/tier-distribution-section";
import { LoggingBehaviorSection } from "@/components/admin/logging-behavior-section";

export default function AdminEngagementPage() {
  const admin = useCurrentUser("admin");
  if (!admin) {
    return <div className="flex items-center justify-center min-h-[60vh] text-muted-foreground">Đang tải...</div>;
  }

  return (
    <PageTransition>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="space-y-8"
      >
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gold/15 flex items-center justify-center">
            <Flame className="h-5 w-5 text-gold" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">
              <span className="gold-gradient-text">Engagement & Habit</span>
            </h1>
            <p className="mt-0.5 text-muted-foreground text-sm">
              Habit strength, tier distribution, hành vi nhập liệu
            </p>
          </div>
        </div>

        <HabitStrengthSection />
        <div className="border-t border-border/50" />
        <TierDistributionSection />
        <div className="border-t border-border/50" />
        <LoggingBehaviorSection />
      </motion.div>
    </PageTransition>
  );
}
