import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getWorkspaceContextFromRequest } from "@/lib/workspaceContext";
import { createEmployee } from "@/repositories/employeeRepository";

const payloadSchema = z.object({
  name: z.string().min(2),
  position: z.string().min(2),
  level: z.enum(["Junior", "Middle", "Senior"]),
  primaryTrackId: z.string().optional().nullable(),
  trackLevelId: z.string().optional().nullable(),
  skills: z
    .array(
      z.object({
        skillId: z.string(),
        level: z.number().min(1).max(5),
      }),
    )
    .optional(),
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
    const employee = await createEmployee(context.workspace.id, parsed.data);
    return NextResponse.json({ ok: true, employee });
  } catch (error) {
    return NextResponse.json({ ok: false, message: (error as Error).message }, { status: 400 });
  }
}
