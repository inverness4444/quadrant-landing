import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getWorkspaceContextFromRequest } from "@/lib/workspaceContext";
import { updateWorkspaceSettings } from "@/services/auth/authService";

const payloadSchema = z.object({
  name: z.string().min(2),
  size: z.enum(["lt20", "20-100", "100-500", "500+"]),
});

export async function PUT(request: NextRequest) {
  const context = await getWorkspaceContextFromRequest(request);
  if (!context) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const json = await request.json();
  const parsed = payloadSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, errors: parsed.error.flatten().fieldErrors }, { status: 400 });
  }
  await updateWorkspaceSettings(context.workspace.id, parsed.data);
  return NextResponse.json({ ok: true });
}
