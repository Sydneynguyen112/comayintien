"use client";

import { use } from "react";
import { useSearchParams } from "next/navigation";
import { MachineDetailView } from "@/components/co-may/quan-ly/machine-detail-view";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const sp = useSearchParams();
  const owner = sp.get("owner") ?? undefined;
  return <MachineDetailView role="student" machineId={id} ownerId={owner} />;
}
