import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getWorkspaceContextFromRequest } from "@/lib/workspaceContext";
import { findTrackLevelById, findTrackById, updateTrackLevel } from "@/repositories/trackRepository";

const payloadSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().min(2).optional(),
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
  if (!parsed.data.name && !parsed.data.description) {
    return NextResponse.json({ ok: false, message: "Нет изменений" }, { status: 400 });
  }
  try {
    const existingLevel = await findTrackLevelById(params.id);
    if (!existingLevel) {
      return NextResponse.json({ ok: false, message: "Уровень не найден" }, { status: 404 });
    }
    const track = await findTrackById(existingLevel.trackId);
    if (!track || track.workspaceId !== context.workspace.id) {
      return NextResponse.json({ ok: false, message: "Уровень не найден" }, { status: 404 });
    }
    const level = await updateTrackLevel(params.id, parsed.data);
    return NextResponse.json({ ok: true, level });
  } catch (error) {
    return NextResponse.json({ ok: false, message: (error as Error).message }, { status: 400 });
  }
}
