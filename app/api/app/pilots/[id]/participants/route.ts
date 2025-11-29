import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getWorkspaceContextFromRequest } from "@/lib/workspaceContext";
import { authRequiredError, forbiddenError, internalError, respondWithApiError, validationError } from "@/services/apiError";
import { requireRole } from "@/services/rbac";
import { updatePilotParticipants } from "@/services/pilotProgramService";

const participantsSchema = z.object({
  employeeIds: z.array(z.string()).default([]),
});

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const context = await getWorkspaceContextFromRequest(request);
  if (!context) return respondWithApiError(authRequiredError());
  try {
    await requireRole(context.workspace.id, context.user.id, ["owner", "admin"]);
  } catch {
    return respondWithApiError(forbiddenError());
  }
  const body = await request.json().catch(() => null);
  const parsed = participantsSchema.safeParse(body);
  if (!parsed.success) {
    return respondWithApiError(validationError(parsed.error.flatten().fieldErrors));
  }
  try {
    const participants = await updatePilotParticipants({
      workspaceId: context.workspace.id,
      pilotId: params.id,
      employeeIds: parsed.data.employeeIds,
    });
    return NextResponse.json({ ok: true, participants });
  } catch (error) {
    return respondWithApiError(await internalError(error, { route: "pilots:update-participants", meta: { pilotId: params.id } }));
  }
}
