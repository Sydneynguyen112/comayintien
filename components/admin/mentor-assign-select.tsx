"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, UserCog, Users as UsersIcon } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { Profile } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
  studentId: string;
  currentMentorId: string | null;
  adminId: string;
  onChanged: () => void;
}

export function MentorAssignSelect({ studentId, currentMentorId, adminId, onChanged }: Props) {
  const [mentors, setMentors] = useState<Profile[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("role", "mentor")
        .order("full_name");
      if (data) setMentors(data as Profile[]);
    })();
  }, []);

  async function assign(mentorId: string | null) {
    setBusy(true);
    await supabase.from("profiles").update({ mentor_id: mentorId }).eq("id", studentId);
    await supabase.from("admin_audit_log").insert({
      admin_id: adminId,
      action: mentorId ? "assign_mentor" : "unassign_mentor",
      target_user_id: studentId,
      metadata: { mentor_id: mentorId },
    });
    setBusy(false);
    onChanged();
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <UserCog className="h-4 w-4 text-gold" /> Gán Mentor
      </div>
      {mentors.length === 0 ? (
        <p className="text-sm text-muted-foreground">Chưa có mentor nào trong hệ thống.</p>
      ) : (
        <div className="space-y-1.5">
          {mentors.map((m) => {
            const isCurrent = currentMentorId === m.id;
            return (
              <button
                key={m.id}
                disabled={busy || isCurrent}
                onClick={() => assign(m.id)}
                className={cn(
                  "w-full flex items-center justify-between gap-2 rounded-lg border p-2.5 text-left text-sm transition-colors",
                  isCurrent
                    ? "border-gold/50 bg-gold/10"
                    : "border-border hover:border-gold/30 hover:bg-gold/5",
                )}
              >
                <span className="flex items-center gap-2 min-w-0">
                  <UsersIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="truncate font-medium text-foreground">{m.full_name}</span>
                </span>
                {isCurrent ? (
                  <CheckCircle2 className="h-4 w-4 text-gold shrink-0" />
                ) : (
                  <span className="text-xs text-gold font-medium">Chọn</span>
                )}
              </button>
            );
          })}
          {currentMentorId && (
            <Button
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() => assign(null)}
              className="w-full mt-2 text-xs text-muted-foreground hover:text-destructive"
            >
              Bỏ gán mentor
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
