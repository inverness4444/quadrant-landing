import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getWorkspaceContextFromRequest } from "@/lib/workspaceContext";
import { suggestTeamForProject } from "@/services/staffingService";
import { requireMember } from "@/services/rbac";
import {
  authRequiredError,
  forbiddenError,
  internalError,
  respondWithApiError,
  validationError,
} from "@/services/apiError";

const payloadSchema = z.object({
  requiredSkills: z
    .array(
      z.object({
        skillId: z.string(),
        minLevel: z.number().min(1).max(5).optional(),
        weight: z.number().positive().max(10).optional(),
      }),
    )
    .min(1, "Нужно указать хотя бы один навык"),
});

export async function POST(request: NextRequest) {
  const context = await getWorkspaceContextFromRequest(request);
  if (!context) {
    return respondWithApiError(authRequiredError());
  }
  try {
    await requireMember(context.workspace.id, context.user.id);
  } catch {
    return respondWithApiError(forbiddenError());
  }
  const json = await request.json();
  const parsed = payloadSchema.safeParse(json);
  if (!parsed.success) {
    return respondWithApiError(validationError(parsed.error.flatten().fieldErrors));
  }
  try {
    const result = await suggestTeamForProject(context.workspace.id, parsed.data.requiredSkills);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    if ((error as Error).message === "SKILL_NOT_IN_WORKSPACE") {
      return respondWithApiError(validationError({ requiredSkills: ["Навык не найден в текущем workspace"] }));
    }
    return respondWithApiError(await internalError(error, { route: "analytics:staffing" }));
  }
}
