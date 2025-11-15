import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/services/rbac";
import { getWorkspaceContextFromRequest } from "@/lib/workspaceContext";
import { createInvite, listInvitesByWorkspace } from "@/repositories/inviteRepository";
import { sendInviteEmail } from "@/services/inviteEmail";
import { z } from "zod";

const payloadSchema = z.object({
  email: z.string().email(),
  role: z.enum(["admin", "member"]).default("member"),
});

export async function GET(request: NextRequest) {
  const context = await getWorkspaceContextFromRequest(request);
  if (!context) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  try {
    await requireRole(context.workspace.id, context.user.id, ["owner", "admin"]);
  } catch {
    return NextResponse.json({ ok: false }, { status: 403 });
  }
  const invites = await listInvitesByWorkspace(context.workspace.id);
  return NextResponse.json({ ok: true, invites });
}

export async function POST(request: NextRequest) {
  const context = await getWorkspaceContextFromRequest(request);
  if (!context) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  try {
    await requireRole(context.workspace.id, context.user.id, ["owner", "admin"]);
  } catch {
    return NextResponse.json({ ok: false }, { status: 403 });
  }
  const json = await request.json();
  const parsed = payloadSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, errors: parsed.error.flatten().fieldErrors }, { status: 400 });
  }
  const invite = await createInvite({
    workspaceId: context.workspace.id,
    email: parsed.data.email,
    role: parsed.data.role,
  });
  await sendInviteEmail({
    email: invite.email,
    workspaceName: context.workspace.name,
    token: invite.token,
  });
  return NextResponse.json({ ok: true, invite });
}
