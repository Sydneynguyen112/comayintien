import { CloseCycleWizard } from "@/components/co-may/quan-ly/close-cycle-wizard";

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ owner?: string }>;
}) {
  const { id } = await params;
  const { owner } = await searchParams;
  return <CloseCycleWizard role="admin" machineId={id} ownerId={owner} />;
}
