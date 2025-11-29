import { NextRequest, NextResponse } from "next/server";
import { getWorkspaceContextFromRequest } from "@/lib/workspaceContext";
import { authRequiredError, internalError, respondWithApiError } from "@/services/apiError";
import { getActionCenter } from "@/services/actionCenterService";
import { isAdmin, isOwner, requireMember } from "@/services/rbac";

export async function GET(request: NextRequest) {
  const context = await getWorkspaceContextFromRequest(request);
  if (!context) return respondWithApiError(authRequiredError());
  try {
    const member = await requireMember(context.workspace.id, context.user.id);
    const roleFlags = {
      isOwner: isOwner(member),
      isAdmin: isAdmin(member),
      isHR: member.role === "admin" || member.role === "owner",
      isManager: member.role !== "member", // по умолчанию owner/admin считаем управляющими, member — нет
    };
    const items = await getActionCenter({ workspaceId: context.workspace.id, userId: context.user.id, roleFlags });
    return NextResponse.json({ ok: true, items });
  } catch (error) {
    return respondWithApiError(await internalError(error, { route: "action-center" }));
  }
}
