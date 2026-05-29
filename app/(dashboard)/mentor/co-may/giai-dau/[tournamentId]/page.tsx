"use client";

import { use } from "react";
import { GiaiDauDetailView } from "@/components/co-may/giai-dau/giai-dau-detail-view";

export default function Page({ params }: { params: Promise<{ tournamentId: string }> }) {
  const { tournamentId } = use(params);
  return <GiaiDauDetailView role="mentor" tournamentId={tournamentId} />;
}
