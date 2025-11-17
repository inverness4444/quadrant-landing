import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/services/rbac";
import { getWorkspaceContextFromRequest } from "@/lib/workspaceContext";
import { findInviteById, markExpired } from "@/repositories/inviteRepository";
import {
  authRequiredError,
  forbiddenError,
  notFoundError,
  respondWithApiError,
} from "@/services/apiError";

type RouteContext = { params: Promise<{ id: string }> };

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const context = await getWorkspaceContextFromRequest(request);
  if (!context) {
    return respondWithApiError(authRequiredError());
  }
  try {
    await requireRole(context.workspace.id, context.user.id, ["owner", "admin"]);
  } catch {
    return respondWithApiError(forbiddenError());
  }
  const invite = await findInviteById(id);
  if (!invite || invite.workspaceId !== context.workspace.id) {
    return respondWithApiError(notFoundError("Приглашение не найдено"));
  }
  await markExpired(id);
  return NextResponse.json({ ok: true });
}
