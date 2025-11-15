import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getWorkspaceContextFromRequest } from "@/lib/workspaceContext";
import { findTrackById, updateTrack } from "@/repositories/trackRepository";

const payloadSchema = z.object({
  name: z.string().min(2),
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
    const existing = await findTrackById(params.id);
    if (!existing || existing.workspaceId !== context.workspace.id) {
      return NextResponse.json({ ok: false, message: "Трек не найден" }, { status: 404 });
    }
    const track = await updateTrack(params.id, parsed.data);
    return NextResponse.json({ ok: true, track });
  } catch (error) {
    return NextResponse.json({ ok: false, message: (error as Error).message }, { status: 400 });
  }
}
