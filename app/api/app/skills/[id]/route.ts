import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getWorkspaceContextFromRequest } from "@/lib/workspaceContext";
import { findSkillById, updateSkill } from "@/repositories/skillRepository";

const payloadSchema = z.object({
  name: z.string().min(2),
  type: z.enum(["hard", "soft", "product", "data"]),
});

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const context = await getWorkspaceContextFromRequest(request);
  if (!context) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const json = await request.json();
  const parsed = payloadSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, errors: parsed.error.flatten().fieldErrors }, { status: 400 });
  }
  try {
    const existing = await findSkillById(params.id);
    if (!existing || existing.workspaceId !== context.workspace.id) {
      return NextResponse.json({ ok: false, message: "Навык не найден" }, { status: 404 });
    }
    const skill = await updateSkill(params.id, parsed.data);
    return NextResponse.json({ ok: true, skill });
  } catch (error) {
    return NextResponse.json({ ok: false, message: (error as Error).message }, { status: 400 });
  }
}
