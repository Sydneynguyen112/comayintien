import { CycleReportView } from "@/components/co-may/quan-ly/cycle-report-view";

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ reportId: string }>;
  searchParams: Promise<{ owner?: string }>;
}) {
  const { reportId } = await params;
  const { owner } = await searchParams;
  return <CycleReportView role="mentor" reportId={reportId} ownerId={owner} />;
}
