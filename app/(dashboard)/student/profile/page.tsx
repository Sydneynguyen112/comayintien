"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useCurrentUser } from "@/lib/auth";
import type { Profile } from "@/lib/auth";
import { ProfileEditor } from "@/components/shared/ProfileEditor";

export default function StudentProfilePage() {
  const currentUser = useCurrentUser("student");
  const [mentorName, setMentorName] = useState<string | null>(null);

  useEffect(() => {
    if (!currentUser?.mentor_id) return;
    async function loadMentor() {
      const { data } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", currentUser!.mentor_id)
        .single();
      if (data) setMentorName(data.full_name);
    }
    loadMentor();
  }, [currentUser]);

  if (!currentUser) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-muted-foreground">Đang tải...</div>
      </div>
    );
  }

  return <ProfileEditor user={currentUser} mentorName={mentorName} />;
}
