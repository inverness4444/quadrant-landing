import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole, ensureOwnerChangeAllowed } from "@/services/rbac";
import { getWorkspaceContextFromRequest } from "@/lib/workspaceContext";
import { findMember, updateMemberRole } from "@/repositories/memberRepository";

const schema = z.object({
  role: z.enum(["owner", "admin", "member"]),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const { id } = await params;
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
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, errors: parsed.error.flatten().fieldErrors }, { status: 400 });
  }
  const target = await findMember(context.workspace.id, id);
  if (!target) {
    return NextResponse.json({ ok: false }, { status: 404 });
  }
  if (target.role === "owner" && parsed.data.role !== "owner") {
    try {
      await ensureOwnerChangeAllowed(context.workspace.id, parsed.data.role);
    } catch {
      return NextResponse.json({ ok: false, message: "Нельзя менять роль единственного владельца" }, { status: 400 });
    }
  }
  const updated = await updateMemberRole(context.workspace.id, id, parsed.data.role);
  if (!updated) {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
  return NextResponse.json({ ok: true, member: updated });
}
