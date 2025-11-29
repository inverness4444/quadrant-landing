import ManagerAssessmentsClient from "@/components/app/assessments/ManagerAssessmentsClient";
import { requireWorkspaceContext } from "@/lib/workspaceContext";

type PageParams = { params: Promise<{ id: string }> };

export default async function ManagerAssessmentsPage({ params }: PageParams) {
  const { id } = await params;
  await requireWorkspaceContext();
  return <ManagerAssessmentsClient cycleId={id} />;
}
