import { notFound } from "next/navigation";
import AssessmentCycleAdminClient from "@/components/app/assessments/AssessmentCycleAdminClient";
import { requireWorkspaceContext } from "@/lib/workspaceContext";
import { getCycleById, getWorkspaceAssessmentSummary } from "@/services/assessmentService";

type PageParams = { params: Promise<{ id: string }> };

export default async function AssessmentCyclePage({ params }: PageParams) {
  const { workspace } = await requireWorkspaceContext();
  const { id } = await params;
  const cycle = await getCycleById(id, workspace.id);
  if (!cycle) return notFound();
  const summary = await getWorkspaceAssessmentSummary(id, workspace.id);
  return <AssessmentCycleAdminClient cycle={cycle} summary={summary} />;
}
