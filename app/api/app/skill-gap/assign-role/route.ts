import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getWorkspaceContextFromRequest } from "@/lib/workspaceContext";
import { authRequiredError, forbiddenError, internalError, respondWithApiError, validationError } from "@/services/apiError";
import { requireRole } from "@/services/rbac";
import { assignRoleToEmployee } from "@/services/skillGapService";

const schema = z.object({
  employeeId: z.string(),
  roleProfileId: z.string(),
  isPrimary: z.boolean().optional(),
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
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return respondWithApiError(validationError(parsed.error.flatten().fieldErrors));
  }
  try {
    const assignment = await assignRoleToEmployee({
      workspaceId: context.workspace.id,
      employeeId: parsed.data.employeeId,
      roleProfileId: parsed.data.roleProfileId,
      isPrimary: parsed.data.isPrimary,
    });
    return NextResponse.json({ ok: true, assignment });
  } catch (error) {
    return respondWithApiError(await internalError(error, { route: "skill-gap:assign-role" }));
  }
}
