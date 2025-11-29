import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getWorkspaceContextFromRequest } from "@/lib/workspaceContext";
import {
  createPilotRun,
  getWorkspacePilotRuns,
} from "@/services/pilotService";
import { requireRole } from "@/services/rbac";
import {
  authRequiredError,
  forbiddenError,
  internalError,
  respondWithApiError,
  validationError,
} from "@/services/apiError";
import { listTracks } from "@/repositories/trackRepository";

const createSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  teamIds: z.array(z.string()).default([]),
});

export async function GET(request: NextRequest) {
  const context = await getWorkspaceContextFromRequest(request);
  if (!context) {
    return respondWithApiError(authRequiredError());
  }
  try {
    await requireRole(context.workspace.id, context.user.id, ["owner", "admin"]);
  } catch {
    return respondWithApiError(forbiddenError());
  }
  try {
    const runs = await getWorkspacePilotRuns(context.workspace.id);
    return NextResponse.json({ ok: true, runs });
  } catch (error) {
    return respondWithApiError(await internalError(error, { route: "pilot:runs:list" }));
  }
}

export async function POST(request: NextRequest) {
  const context = await getWorkspaceContextFromRequest(request);
  if (!context) {
    return respondWithApiError(authRequiredError());
  }
  try {
    await requireRole(context.workspace.id, context.user.id, ["owner", "admin"]);
  } catch {
    return respondWithApiError(forbiddenError());
  }
  const json = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(json);
  if (!parsed.success) {
    return respondWithApiError(validationError(parsed.error.flatten().fieldErrors));
  }
  try {
    const teamIds = parsed.data.teamIds ?? [];
    const knownTeams = await listTracks(context.workspace.id);
    const existingTeamIds = new Set(knownTeams.map((team) => team.id));
    const safeTeamIds = teamIds.filter((id) => existingTeamIds.has(id));
    const run = await createPilotRun({
      workspaceId: context.workspace.id,
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      teamIds: safeTeamIds,
      ownerUserId: context.user.id,
    });
    return NextResponse.json({ ok: true, run });
  } catch (error) {
    return respondWithApiError(await internalError(error, { route: "pilot:runs:create" }));
  }
}
