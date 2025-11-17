import { NextRequest, NextResponse } from "next/server";
import { getWorkspaceContextFromRequest } from "@/lib/workspaceContext";
import { requireRole } from "@/services/rbac";
import { listMembersByWorkspace } from "@/repositories/memberRepository";
import { authRequiredError, forbiddenError, respondWithApiError } from "@/services/apiError";

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
  const members = await listMembersByWorkspace(context.workspace.id);
  return NextResponse.json({ ok: true, members });
}
