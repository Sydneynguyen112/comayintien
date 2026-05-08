"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Lock, Crown, Play, Clock, MessageCircle } from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useCurrentUser } from "@/lib/auth";
import { formatPrice, formatDuration } from "@/lib/utils";
import { PageTransition } from "@/components/shared/PageTransition";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface Course {
  id: string;
  title: string;
  description: string;
  price: number | null;
  price_label: string | null;
  thumbnail_url: string | null;
  badge_label: string | null;
  total_lessons: number;
  total_duration_sec: number;
}

interface LockedFeatureProps {
  title: string;
  description: string;
}

export function LockedFeature({ title, description }: LockedFeatureProps) {
  const currentUser = useCurrentUser("student");
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from("courses").select("*").order("created_at");
      if (data) setCourses(data as Course[]);
      setLoading(false);
    }
    load();
  }, []);

  if (loading || !currentUser) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-muted-foreground">Đang tải...</div>
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="p-6 space-y-8 max-w-3xl mx-auto">
        {/* Lock icon + message */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-4 pt-8"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="w-20 h-20 rounded-full bg-gold/10 border-2 border-gold/30 flex items-center justify-center mx-auto"
          >
            <Lock className="h-8 w-8 text-gold" />
          </motion.div>

          <div>
            <h1 className="text-2xl font-bold text-foreground">{title}</h1>
            <p className="text-muted-foreground mt-2 max-w-md mx-auto">
              {description}
            </p>
          </div>

          <div className="inline-block rounded-full bg-gold/10 px-4 py-2">
            <p className="text-sm font-medium text-gold">
              Hãy đăng ký chương trình ROVA để sử dụng tính năng này
            </p>
          </div>
        </motion.div>

        {/* Khoá học */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-4"
        >
          <h2 className="text-lg font-semibold text-foreground text-center">
            Các chương trình đào tạo
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {courses.map((course, i) => (
              <motion.div
                key={course.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + i * 0.1 }}
              >
                <Card className="h-full hover:border-gold/40 transition-all overflow-hidden">
                  <div className="relative aspect-[2/1] bg-gradient-to-br from-gold/20 to-card flex items-center justify-center">
                    {course.thumbnail_url ? (
                      <img src={course.thumbnail_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Crown className="h-12 w-12 text-gold/40" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                    <div className="absolute bottom-3 left-4">
                      {course.badge_label && (
                        <Badge className="bg-gold/90 text-black font-semibold">
                          {course.badge_label}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <CardContent className="pt-4 space-y-4">
                    <div>
                      <h3 className="text-lg font-bold text-foreground">
                        {course.title}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {course.description}
                      </p>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      {course.total_lessons > 0 && (
                        <span className="flex items-center gap-1">
                          <Play className="h-3.5 w-3.5" /> {course.total_lessons} bài học
                        </span>
                      )}
                      {course.total_duration_sec > 0 && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" /> {formatDuration(course.total_duration_sec)}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-border">
                      <div>
                        {course.price ? (
                          <p className="text-xl font-bold text-gold">
                            {formatPrice(course.price)}
                          </p>
                        ) : (
                          <p className="text-base font-semibold text-gold">
                            {course.price_label || "Liên hệ"}
                          </p>
                        )}
                      </div>
                      {course.price ? (
                        <Link href={`/student/checkout/${course.id}`}>
                          <Button className="bg-gold hover:bg-gold/90 text-black font-semibold">
                            Đăng ký ngay
                          </Button>
                        </Link>
                      ) : (
                        <Link href="https://m.me/rova" target="_blank">
                          <Button variant="outline" className="border-gold/50 text-gold hover:bg-gold/10">
                            <MessageCircle className="h-4 w-4 mr-1" /> Tư vấn
                          </Button>
                        </Link>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </PageTransition>
  );
}
