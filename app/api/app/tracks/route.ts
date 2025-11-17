import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getWorkspaceContextFromRequest } from "@/lib/workspaceContext";
import { createTrack } from "@/repositories/trackRepository";
import { requireRole } from "@/services/rbac";
import {
  authRequiredError,
  forbiddenError,
  internalError,
  respondWithApiError,
  validationError,
} from "@/services/apiError";

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
    return respondWithApiError(authRequiredError());
  }
  try {
    await requireRole(context.workspace.id, context.user.id, ["owner", "admin"]);
  } catch {
    return respondWithApiError(forbiddenError());
  }
  const json = await request.json();
  const parsed = payloadSchema.safeParse(json);
  if (!parsed.success) {
    return respondWithApiError(validationError(parsed.error.flatten().fieldErrors));
  }
  try {
    const track = await createTrack(context.workspace.id, parsed.data);
    return NextResponse.json({ ok: true, track });
  } catch (error) {
    return respondWithApiError(await internalError(error, { route: "tracks:create" }));
  }
}
