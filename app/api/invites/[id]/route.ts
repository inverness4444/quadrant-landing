import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/services/rbac";
import { getWorkspaceContextFromRequest } from "@/lib/workspaceContext";
import { findInviteById, markExpired } from "@/repositories/inviteRepository";

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const context = await getWorkspaceContextFromRequest(request);
  if (!context) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  try {
    await requireRole(context.workspace.id, context.user.id, ["owner", "admin"]);
  } catch {
    return NextResponse.json({ ok: false }, { status: 403 });
  }
  const { id } = params;
  const invite = await findInviteById(id);
  if (!invite || invite.workspaceId !== context.workspace.id) {
    return NextResponse.json({ ok: false }, { status: 404 });
  }
  await markExpired(id);
  return NextResponse.json({ ok: true });
}
