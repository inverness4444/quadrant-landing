import { NextRequest, NextResponse } from "next/server";
import { getWorkspaceContextFromRequest } from "@/lib/workspaceContext";
import { authRequiredError, forbiddenError, internalError, respondWithApiError } from "@/services/apiError";
import { getManagerAgendaSnapshot } from "@/services/managerAgendaService";
import { requireMember } from "@/services/rbac";

export async function GET(request: NextRequest) {
  const context = await getWorkspaceContextFromRequest(request);
  if (!context) return respondWithApiError(authRequiredError());
  try {
    const member = await requireMember(context.workspace.id, context.user.id);
    if (member.role === "member") {
      return respondWithApiError(forbiddenError());
    }
    const snapshot = await getManagerAgendaSnapshot({ workspaceId: context.workspace.id, managerId: context.user.id });
    return NextResponse.json({ ok: true, snapshot });
  } catch (error) {
    return respondWithApiError(await internalError(error, { route: "manager:agenda" }));
  }
}

