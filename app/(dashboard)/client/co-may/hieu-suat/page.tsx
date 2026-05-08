"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/lib/auth";
import { hasCompletedSetup } from "@/lib/co-may/setup-store";
import { HieuSuatView } from "@/components/co-may/hieu-suat/hieu-suat-view";

export default function Page() {
  const user = useCurrentUser("student");
  const router = useRouter();

  useEffect(() => {
    if (!user) return;
    if (!hasCompletedSetup(user.id, user.role)) {
      router.replace("/client/co-may/setup");
    }
  }, [user, router]);

  if (!user) return null;
  if (!hasCompletedSetup(user.id, user.role)) return null;
  return <HieuSuatView role="client" />;
}
