"use client";

import { useEffect, useState } from "react";
import { Star, X } from "lucide-react";
import { useCurrentUser } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { submitNpsResponse } from "@/lib/admin/voc-api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const DISMISS_KEY = "rova_nps_dismissed_until";
const ELIGIBILITY_TRADES = 30;
const ELIGIBILITY_DAYS = 30;

/**
 * Hiện popup NPS khi user đã ≥30d signup + ≥30 trade + chưa dismiss / chưa trả lời gần đây.
 * Logic dismiss: 30d sau X, 90d sau khi trả lời.
 */
export function NpsSurvey() {
  const user = useCurrentUser(null);
  const [show, setShow] = useState(false);
  const [step, setStep] = useState<"score" | "reason" | "thanks">("score");
  const [score, setScore] = useState<number | null>(null);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user) return;
    const dismissedUntil = parseInt(localStorage.getItem(DISMISS_KEY) || "0");
    if (Date.now() < dismissedUntil) return;

    let cancelled = false;
    (async () => {
      // Check eligibility: signup >= 30d + >= 30 trades
      const signupDate = new Date(user.created_at).getTime();
      if (Date.now() - signupDate < ELIGIBILITY_DAYS * 24 * 60 * 60 * 1000) return;

      const { count } = await supabase
        .from("events")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("event_name", "trade_logged");
      if ((count ?? 0) < ELIGIBILITY_TRADES) return;

      // Check last NPS response — skip if within 90d
      const { data: last } = await supabase
        .from("nps_responses")
        .select("created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (last && Date.now() - new Date(last.created_at).getTime() < 90 * 24 * 60 * 60 * 1000) return;

      if (!cancelled) setShow(true);
    })();
    return () => { cancelled = true; };
  }, [user]);

  function dismiss(days = 30) {
    localStorage.setItem(DISMISS_KEY, String(Date.now() + days * 24 * 60 * 60 * 1000));
    setShow(false);
  }

  async function handleSubmit() {
    if (!user || score === null) return;
    setSubmitting(true);
    await submitNpsResponse(user.id, score, reason, "auto_30d_30trades");
    setSubmitting(false);
    setStep("thanks");
    localStorage.setItem(DISMISS_KEY, String(Date.now() + 90 * 24 * 60 * 60 * 1000));
    setTimeout(() => setShow(false), 2500);
  }

  if (!show || !user) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 w-[360px] rounded-2xl border border-gold/40 bg-card shadow-2xl p-5 animate-in slide-in-from-bottom-2">
      <button
        type="button"
        onClick={() => dismiss(30)}
        className="absolute top-3 right-3 text-muted-foreground hover:text-foreground"
      >
        <X className="h-4 w-4" />
      </button>

      {step === "score" && (
        <>
          <div className="flex items-center gap-2 mb-3">
            <Star className="h-4 w-4 text-gold" />
            <span className="text-sm font-semibold text-foreground">Bạn đánh giá Cỗ Máy thế nào?</span>
          </div>
          <p className="text-xs text-muted-foreground mb-4">
            Khả năng bạn sẽ giới thiệu Cỗ Máy Trading cho bạn bè trader?
          </p>
          <div className="flex flex-wrap gap-1 mb-3">
            {Array.from({ length: 11 }, (_, i) => i).map((n) => (
              <button
                key={n}
                onClick={() => { setScore(n); setStep("reason"); }}
                className={cn(
                  "h-9 w-9 rounded-lg border text-sm font-semibold transition-colors",
                  n <= 6
                    ? "border-red-500/40 text-red-500 hover:bg-red-500/10"
                    : n <= 8
                      ? "border-amber-500/40 text-amber-500 hover:bg-amber-500/10"
                      : "border-emerald-500/40 text-emerald-500 hover:bg-emerald-500/10",
                )}
              >
                {n}
              </button>
            ))}
          </div>
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <span>Không bao giờ</span>
            <span>Chắc chắn</span>
          </div>
        </>
      )}

      {step === "reason" && (
        <>
          <div className="text-sm font-semibold text-foreground mb-2">
            Cảm ơn! Bạn đã chọn <span className="text-gold">{score}/10</span>
          </div>
          <p className="text-xs text-muted-foreground mb-3">Lý do (optional, giúp team cải thiện):</p>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder="Vd: Tool kỷ luật giúp tôi rút tiền đều, nhưng UI hơi rối ở phần đóng chu kỳ..."
            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-xs resize-none mb-3"
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={handleSubmit} disabled={submitting}>
              Bỏ qua
            </Button>
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={submitting}
              className="bg-gold hover:bg-gold/90 text-black"
            >
              {submitting ? "Đang gửi..." : "Gửi"}
            </Button>
          </div>
        </>
      )}

      {step === "thanks" && (
        <div className="text-center py-4">
          <Star className="h-8 w-8 text-gold mx-auto mb-2" />
          <p className="text-sm font-semibold text-foreground">Cảm ơn bạn!</p>
          <p className="text-xs text-muted-foreground mt-1">Feedback của bạn rất quý giá.</p>
        </div>
      )}
    </div>
  );
}
