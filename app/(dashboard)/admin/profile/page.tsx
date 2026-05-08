"use client";

import { useCurrentUser } from "@/lib/auth";
import { ProfileEditor } from "@/components/shared/ProfileEditor";

export default function AdminProfilePage() {
  const currentUser = useCurrentUser("admin");

  if (!currentUser) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-muted-foreground">Đang tải...</div>
      </div>
    );
  }

  return <ProfileEditor user={currentUser} />;
}
