"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { MessageSquarePlus, Bug, Lightbulb, ThumbsUp, AlertCircle, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useCurrentUser } from "@/lib/auth";
import { submitFeedback } from "@/lib/admin/voc-api";

const types = [
  { key: "bug", label: "Bug", icon: Bug, color: "text-red-500" },
  { key: "feature_request", label: "Feature", icon: Lightbulb, color: "text-amber-500" },
  { key: "praise", label: "Khen", icon: ThumbsUp, color: "text-emerald-500" },
  { key: "complaint", label: "Phàn nàn", icon: AlertCircle, color: "text-orange-500" },
  { key: "general", label: "Khác", icon: MessageSquare, color: "text-muted-foreground" },
];

export function FeedbackButton() {
  const user = useCurrentUser(null);
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState("general");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (!user) return null;

  async function handleSubmit() {
    if (!user || !title.trim() || !content.trim()) return;
    setSubmitting(true);
    await submitFeedback(user.id, type, title.trim(), content.trim(), pathname);
    setSubmitting(false);
    setSubmitted(true);
    setTimeout(() => {
      setOpen(false);
      setSubmitted(false);
      setTitle(""); setContent(""); setType("general");
    }, 1500);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-40 h-12 w-12 rounded-full bg-gold hover:bg-gold/90 text-black shadow-lg flex items-center justify-center hover:scale-105 transition-all"
        title="Gửi feedback"
      >
        <MessageSquarePlus className="h-5 w-5" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gửi feedback</DialogTitle>
            <DialogDescription>
              Mọi feedback đều được team đọc. Đính kèm trang: <span className="text-gold">{pathname}</span>
            </DialogDescription>
          </DialogHeader>

          {submitted ? (
            <div className="py-8 text-center">
              <ThumbsUp className="h-10 w-10 text-emerald-500 mx-auto mb-3" />
              <p className="text-sm font-semibold text-foreground">Cảm ơn feedback của bạn!</p>
              <p className="text-xs text-muted-foreground mt-1">Team sẽ review trong 1-2 ngày làm việc.</p>
            </div>
          ) : (
            <div className="space-y-4 py-2">
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 block">Loại</label>
                <div className="grid grid-cols-5 gap-1.5">
                  {types.map((t) => {
                    const Icon = t.icon;
                    const active = type === t.key;
                    return (
                      <button
                        key={t.key}
                        type="button"
                        onClick={() => setType(t.key)}
                        className={cn(
                          "flex flex-col items-center gap-1 rounded-lg border p-2 text-[11px] transition-colors",
                          active ? "border-gold/50 bg-gold/10" : "border-border hover:border-gold/30 hover:bg-gold/5",
                        )}
                      >
                        <Icon className={cn("h-4 w-4", active ? "text-gold" : t.color)} />
                        <span className={active ? "text-gold font-medium" : ""}>{t.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 block">Tiêu đề</label>
                <Input
                  placeholder="Tóm tắt ngắn (vd: Lỗi khi rút tiền trên iPhone)"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={120}
                />
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 block">Nội dung</label>
                <textarea
                  placeholder="Chi tiết — càng cụ thể càng tốt"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={5}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-card text-sm resize-none"
                />
              </div>
            </div>
          )}

          {!submitted && (
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Huỷ</Button>
              <Button
                onClick={handleSubmit}
                disabled={submitting || !title.trim() || !content.trim()}
                className="bg-gold hover:bg-gold/90 text-black font-semibold"
              >
                {submitting ? "Đang gửi..." : "Gửi"}
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
