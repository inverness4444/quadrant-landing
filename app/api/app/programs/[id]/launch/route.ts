import { NextRequest, NextResponse } from "next/server";
import { getWorkspaceContextFromRequest } from "@/lib/workspaceContext";
import { authRequiredError, forbiddenError, internalError, respondWithApiError } from "@/services/apiError";
import { launchProgram } from "@/services/programService";
import { requireRole } from "@/services/rbac";

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
    const program = await launchProgram({ workspaceId: context.workspace.id, programId: params.id });
    return NextResponse.json({ ok: true, program });
  } catch (error) {
    return respondWithApiError(await internalError(error, { route: "programs:launch" }));
  }
}
