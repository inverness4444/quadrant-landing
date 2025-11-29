import { NextRequest, NextResponse } from "next/server";
import { getWorkspaceContextFromRequest } from "@/lib/workspaceContext";
import { authRequiredError, forbiddenError, internalError, respondWithApiError } from "@/services/apiError";
import { requireMember } from "@/services/rbac";
import { getPilotById } from "@/services/pilotProgramService";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const context = await getWorkspaceContextFromRequest(request);
  if (!context) return respondWithApiError(authRequiredError());
  try {
    await requireMember(context.workspace.id, context.user.id);
  } catch {
    return respondWithApiError(forbiddenError());
  }
  try {
    const data = await getPilotById({ workspaceId: context.workspace.id, pilotId: params.id });
    return NextResponse.json({ ok: true, pilot: data.pilot, participants: data.participants });
  } catch (error) {
    return respondWithApiError(await internalError(error, { route: "pilots:detail", meta: { pilotId: params.id } }));
  }
}
