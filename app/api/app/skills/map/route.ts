import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getWorkspaceContextFromRequest } from "@/lib/workspaceContext";
import { authRequiredError, internalError, respondWithApiError, validationError } from "@/services/apiError";
import {
  aggregateSkillGaps,
  computeProfileMatchScores,
  getEmployeeSkillSnapshots,
  getProfileGapsForTeam,
  getProfileWithItems,
} from "@/services/skillsAnalyticsService";

const querySchema = z.object({
  teamId: z.string().optional(),
  profileId: z.string().optional(),
});

export async function GET(request: NextRequest) {
  const context = await getWorkspaceContextFromRequest(request);
  if (!context) {
    return respondWithApiError(authRequiredError());
  }
  const parsed = querySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams.entries()));
  if (!parsed.success) {
    return respondWithApiError(validationError(parsed.error.flatten().fieldErrors));
  }
  const { teamId, profileId } = parsed.data;
  try {
    const snapshots = await getEmployeeSkillSnapshots({ workspaceId: context.workspace.id, teamId: teamId || undefined });
    if (!profileId) {
      return NextResponse.json({ ok: true, snapshots });
    }
    const profile = await getProfileWithItems(context.workspace.id, profileId);
    if (!profile) {
      return respondWithApiError(validationError({ profileId: ["Профиль не найден"] }));
    }
    const gaps = teamId
      ? await getProfileGapsForTeam({ workspaceId: context.workspace.id, profileId, teamId })
      : await getProfileGapsForAllTeams(context.workspace.id, profileId);
    const gapAggregates = aggregateSkillGaps({ gaps });
    const profileMatchScores = await computeProfileMatchScores({ workspaceId: context.workspace.id, profileId, teamId: teamId || undefined });
    return NextResponse.json({ ok: true, snapshots, profileId, profileGaps: gaps, gapAggregates, profileMatchScores });
  } catch (error) {
    return respondWithApiError(await internalError(error, { route: "skills:map" }));
  }
}

async function getProfileGapsForAllTeams(workspaceId: string, profileId: string) {
  // find all teams that have employees
  const snapshots = await getEmployeeSkillSnapshots({ workspaceId });
  const teams = Array.from(new Set(snapshots.map((s) => s.teamId).filter(Boolean))) as string[];
  const gapsArrays = await Promise.all(teams.map((teamId) => getProfileGapsForTeam({ workspaceId, profileId, teamId })));
  return gapsArrays.flat();
}
