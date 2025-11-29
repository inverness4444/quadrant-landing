import ProgramsPageClient from "@/components/app/programs/ProgramsPageClient";
import { requireWorkspaceContext } from "@/lib/workspaceContext";
import { listTemplates } from "@/services/programService";
import { listWorkspacePrograms } from "@/services/programService";

export default async function ProgramsPage() {
  const { workspace } = await requireWorkspaceContext();
  const [templates, programs] = await Promise.all([listTemplates(), listWorkspacePrograms(workspace.id)]);
  return <ProgramsPageClient templates={templates} programs={programs} workspaceName={workspace.name} />;
}
