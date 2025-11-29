import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getWorkspaceContextFromRequest } from "@/lib/workspaceContext";
import { createCycle, getWorkspaceCycles } from "@/services/assessmentService";
import { requireRole } from "@/services/rbac";
import {
  authRequiredError,
  forbiddenError,
  internalError,
  respondWithApiError,
  validationError,
} from "@/services/apiError";

const createSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional().nullable(),
  startsAt: z.string().optional().nullable(),
  endsAt: z.string().optional().nullable(),
  teamIds: z.array(z.string()).optional(),
});

export async function GET(request: NextRequest) {
  const context = await getWorkspaceContextFromRequest(request);
  if (!context) {
    return respondWithApiError(authRequiredError());
  }
  try {
    const cycles = await getWorkspaceCycles(context.workspace.id);
    return NextResponse.json({ ok: true, cycles });
  } catch (error) {
    return respondWithApiError(await internalError(error, { route: "assessments:cycles:list" }));
  }
}

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
  const json = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(json);
  if (!parsed.success) {
    return respondWithApiError(validationError(parsed.error.flatten().fieldErrors));
  }
  try {
    const cycle = await createCycle({
      workspaceId: context.workspace.id,
      createdByUserId: context.user.id,
      ...parsed.data,
    });
    return NextResponse.json({ ok: true, cycle });
  } catch (error) {
    return respondWithApiError(await internalError(error, { route: "assessments:cycles:create" }));
  }
}
