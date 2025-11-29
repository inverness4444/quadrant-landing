import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getWorkspaceContextFromRequest } from "@/lib/workspaceContext";
import { authRequiredError, forbiddenError, internalError, respondWithApiError, validationError } from "@/services/apiError";
import { requireMember } from "@/services/rbac";
import { upsertEmployeeSkillRatings } from "@/services/skillGapService";

const ratingSchema = z.object({
  skillCode: z.string(),
  level: z.number().int().min(1).max(5),
  ratedAt: z.string().optional(),
});

const schema = z.object({
  employeeId: z.string(),
  source: z.enum(["self", "manager", "system"]),
  ratings: z.array(ratingSchema),
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
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return respondWithApiError(validationError(parsed.error.flatten().fieldErrors));
  }
  try {
    const ratings = await upsertEmployeeSkillRatings({
      workspaceId: context.workspace.id,
      employeeId: parsed.data.employeeId,
      source: parsed.data.source,
      ratings: parsed.data.ratings,
    });
    return NextResponse.json({ ok: true, ratings });
  } catch (error) {
    return respondWithApiError(await internalError(error, { route: "skill-gap:ratings" }));
  }
}
