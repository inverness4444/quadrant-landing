import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getWorkspaceContextFromRequest } from "@/lib/workspaceContext";
import { createTrack } from "@/repositories/trackRepository";

const payloadSchema = z.object({
  name: z.string().min(2),
  levels: z
    .array(
      z.object({
        name: z.string().min(2),
        description: z.string().min(2),
      }),
    )
    .min(1),
});

export async function POST(request: NextRequest) {
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
    const track = await createTrack(context.workspace.id, parsed.data);
    return NextResponse.json({ ok: true, track });
  } catch (error) {
    return NextResponse.json({ ok: false, message: (error as Error).message }, { status: 400 });
  }
}
