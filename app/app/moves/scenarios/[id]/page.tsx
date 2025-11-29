import { notFound, redirect } from "next/navigation";
import MoveScenarioClient from "@/components/app/moves/MoveScenarioClient";
import { requireWorkspaceContext } from "@/lib/workspaceContext";
import { getMoveScenarioById } from "@/services/movesService";

type PageParams = { params: Promise<{ id: string }> };

export default async function MoveScenarioPage({ params }: PageParams) {
  const context = await requireWorkspaceContext();
  if (context.member.role !== "owner" && context.member.role !== "admin") {
    redirect("/app");
  }
  const { id } = await params;
  const scenario = await getMoveScenarioById(id, context.workspace.id);
  if (!scenario) return notFound();
  return <MoveScenarioClient scenario={scenario} />;
}
