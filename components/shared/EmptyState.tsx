"use client";

import { motion } from "framer-motion";
import { Inbox, Search, FileX, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

type EmptyVariant = "default" | "search" | "submissions" | "courses";

const variantConfig = {
  default: { icon: Inbox, text: "Chưa có dữ liệu" },
  search: { icon: Search, text: "Không tìm thấy kết quả" },
  submissions: { icon: FileX, text: "Chưa có bài nộp nào" },
  courses: { icon: BookOpen, text: "Chưa đăng ký khoá học nào" },
};

interface EmptyStateProps {
  variant?: EmptyVariant;
  title?: string;
  description?: string;
  className?: string;
}

export function EmptyState({
  variant = "default",
  title,
  description,
  className,
}: EmptyStateProps) {
  const config = variantConfig[variant];
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className={cn(
        "flex flex-col items-center justify-center py-16 text-center",
        className
      )}
    >
      <div className="w-16 h-16 rounded-2xl bg-gold/5 border border-gold-shadow/20 flex items-center justify-center mb-4">
        <Icon size={28} className="text-gold/40" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-1">
        {title || config.text}
      </h3>
      {description && (
        <p className="text-sm text-muted-foreground max-w-sm">{description}</p>
      )}
    </motion.div>
  );
}
