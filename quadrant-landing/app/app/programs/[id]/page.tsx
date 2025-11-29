import { notFound } from "next/navigation";
import ProgramDetailClient from "@/components/app/programs/ProgramDetailClient";
import { requireWorkspaceContext } from "@/lib/workspaceContext";
import { getWorkspaceProgram } from "@/services/programService";

type PageParams = { params: Promise<{ id: string }> };

export default async function ProgramDetailPage({ params }: PageParams) {
  const { workspace } = await requireWorkspaceContext();
  const { id } = await params;
  const program = await getWorkspaceProgram(workspace.id, id);
  if (!program) return notFound();
  return <ProgramDetailClient program={program} />;
}
