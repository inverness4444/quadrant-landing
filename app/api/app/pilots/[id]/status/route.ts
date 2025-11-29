import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getWorkspaceContextFromRequest } from "@/lib/workspaceContext";
import { authRequiredError, forbiddenError, internalError, respondWithApiError, validationError } from "@/services/apiError";
import { requireRole } from "@/services/rbac";
import { setPilotStatus } from "@/services/pilotProgramService";

const statusSchema = z.object({
  status: z.enum(["draft", "planned", "active", "completed", "cancelled", "archived"]),
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
  const parsed = statusSchema.safeParse(body);
  if (!parsed.success) {
    return respondWithApiError(validationError(parsed.error.flatten().fieldErrors));
  }
  try {
    const result = await setPilotStatus({
      workspaceId: context.workspace.id,
      pilotId: params.id,
      status: parsed.data.status,
    });
    return NextResponse.json({ ok: true, pilot: result.pilot, participants: result.participants });
  } catch (error) {
    return respondWithApiError(await internalError(error, { route: "pilots:set-status", meta: { pilotId: params.id } }));
  }
}
