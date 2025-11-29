import { notFound } from "next/navigation";
import TeamProfileClient from "@/components/app/team/TeamProfileClient";
import { requireWorkspaceContext } from "@/lib/workspaceContext";
import { getWorkspaceQuests } from "@/services/questService";
import { getTeamAssessmentSummary, getWorkspaceCycles } from "@/services/assessmentService";
import { getTeamProfile } from "@/services/teamProfileService";
import { computeTeamNeedsSummary } from "@/services/movesService";
import { getWorkspacePilotRuns } from "@/services/pilotService";

type PageParams = {
  params: Promise<{ id: string }>;
};

export default async function TeamProfilePage({ params }: PageParams) {
  const { id } = await params;
  const { workspace } = await requireWorkspaceContext();
  const profile = await getTeamProfile(workspace.id, id);
  if (!profile) {
    return notFound();
  }
  const teamQuests = await getWorkspaceQuests(workspace.id, { teamId: id });
  const cycles = await getWorkspaceCycles(workspace.id);
  const cycle = cycles.find((entry) => entry.status === "active") ?? cycles[0];
  const assessmentSummary = cycle ? await getTeamAssessmentSummary(cycle.id, id).catch(() => null) : null;
  const movesSummary = await computeTeamNeedsSummary({ teamId: id, workspaceId: workspace.id }).catch(() => null);
  const pilotRuns = await getWorkspacePilotRuns(workspace.id);
  const pilotForTeam = pilotRuns.find((run) => run.teams.some((team) => team.teamId === id)) ?? null;
  return (
    <TeamProfileClient
      teamId={id}
      workspaceName={workspace.name}
      initialProfile={profile}
      teamQuests={teamQuests}
      assessmentSummary={assessmentSummary}
      movesSummary={movesSummary ?? undefined}
      pilotRun={pilotForTeam ? { id: pilotForTeam.id, name: pilotForTeam.name } : undefined}
    />
  );
}
