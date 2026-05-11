"use client";

import { useState } from "react";
import { Mail, Bell, MessageSquare, Phone } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { logReEngagement } from "@/lib/admin/retention-api";

interface Props {
  userId: string;
  userName: string;
  adminId: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const actionTypes = [
  { key: "email", label: "Email", icon: Mail },
  { key: "notification", label: "In-app", icon: Bell },
  { key: "manual_contact", label: "Manual", icon: MessageSquare },
  { key: "phone_call", label: "Phone call", icon: Phone },
];

export function LogReengagementDialog({ userId, userName, adminId, open, onOpenChange }: Props) {
  const queryClient = useQueryClient();
  const [actionType, setActionType] = useState("email");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!notes.trim()) return;
    setSubmitting(true);
    await logReEngagement(userId, actionType, notes.trim(), adminId);
    setSubmitting(false);
    setNotes("");
    onOpenChange(false);
    queryClient.invalidateQueries({ queryKey: ["admin", "retention"] });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ghi nhận tương tác re-engagement</DialogTitle>
          <DialogDescription>
            Liên hệ <span className="font-semibold text-foreground">{userName}</span> để gọi user
            quay lại app. Hệ thống sẽ tự đánh dấu thành công nếu user log trade trong 30d sau action.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 block">
              Loại action
            </label>
            <div className="grid grid-cols-4 gap-2">
              {actionTypes.map((a) => {
                const Icon = a.icon;
                const active = actionType === a.key;
                return (
                  <button
                    key={a.key}
                    type="button"
                    onClick={() => setActionType(a.key)}
                    className={cn(
                      "flex flex-col items-center gap-1.5 rounded-lg border p-3 text-xs transition-colors",
                      active
                        ? "border-gold/50 bg-gold/10 text-gold"
                        : "border-border hover:border-gold/30 hover:bg-gold/5",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {a.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 block">
              Ghi chú
            </label>
            <Input
              placeholder="Ví dụ: Gọi điện hỏi thăm, user đang bận, hẹn quay lại tuần sau"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Huỷ</Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || !notes.trim()}
            className="bg-gold hover:bg-gold/90 text-black font-semibold"
          >
            {submitting ? "Đang lưu..." : "Lưu action"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
