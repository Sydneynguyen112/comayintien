"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/lib/auth";
import { hasCompletedSetup } from "@/lib/co-may/setup-store";
import { TongQuanView } from "@/components/co-may/tong-quan/tong-quan-view";

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
  return <TongQuanView role="client" />;
}
