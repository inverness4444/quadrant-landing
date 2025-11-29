import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getWorkspaceContextFromRequest } from "@/lib/workspaceContext";
import { authRequiredError, forbiddenError, internalError, respondWithApiError } from "@/services/apiError";
import { updateWorkspaceProgramStatus } from "@/services/programService";
import { requireRole } from "@/services/rbac";

const bodySchema = z.object({
  status: z.enum(["draft", "active", "paused", "completed"]),
  actualEndAt: z.string().optional().nullable(),
});

type Params = { params: { id: string } };

export async function POST(request: NextRequest, { params }: Params) {
  const context = await getWorkspaceContextFromRequest(request);
  if (!context) return respondWithApiError(authRequiredError());
  try {
    await requireRole(context.workspace.id, context.user.id, ["owner", "admin"]);
  } catch {
    return respondWithApiError(forbiddenError());
  }
  try {
    const body = bodySchema.parse(await request.json());
    const program = await updateWorkspaceProgramStatus({
      workspaceId: context.workspace.id,
      programId: params.id,
      status: body.status,
      actualEndAt: body.actualEndAt ?? undefined,
    });
    return NextResponse.json({ ok: true, program });
  } catch (error) {
    return respondWithApiError(await internalError(error, { route: "programs:status" }));
  }
}
