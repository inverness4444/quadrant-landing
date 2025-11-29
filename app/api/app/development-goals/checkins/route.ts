import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getWorkspaceContextFromRequest } from "@/lib/workspaceContext";
import { authRequiredError, forbiddenError, internalError, respondWithApiError, validationError } from "@/services/apiError";
import { requireMember } from "@/services/rbac";
import { addCheckin } from "@/services/developmentPlanService";

const schema = z.object({
  goalId: z.string(),
  employeeId: z.string(),
  note: z.string().min(1),
  status: z.string().optional().nullable(),
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
    const checkin = await addCheckin({
      workspaceId: context.workspace.id,
      employeeId: parsed.data.employeeId,
      goalId: parsed.data.goalId,
      createdBy: context.user.id,
      note: parsed.data.note,
      status: parsed.data.status ?? null,
    });
    return NextResponse.json({ ok: true, checkin });
  } catch (error) {
    return respondWithApiError(await internalError(error, { route: "development-goals:checkins" }));
  }
}
