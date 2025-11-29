import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getWorkspaceContextFromRequest } from "@/lib/workspaceContext";
import { getWorkspaceArtifacts } from "@/services/artifactService";
import { requireMember } from "@/services/rbac";
import {
  authRequiredError,
  forbiddenError,
  internalError,
  respondWithApiError,
  validationError,
} from "@/services/apiError";

const querySchema = z.object({
  type: z.string().optional(),
  employeeId: z.string().optional(),
  skillId: z.string().optional(),
  integrationId: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).optional(),
});

export async function GET(request: NextRequest) {
  const context = await getWorkspaceContextFromRequest(request);
  if (!context) {
    return respondWithApiError(authRequiredError());
  }
  try {
    await requireMember(context.workspace.id, context.user.id);
  } catch {
    return respondWithApiError(forbiddenError());
  }
  const parsed = querySchema.safeParse({
    type: request.nextUrl.searchParams.get("type") ?? undefined,
    employeeId: request.nextUrl.searchParams.get("employeeId") ?? undefined,
    skillId: request.nextUrl.searchParams.get("skillId") ?? undefined,
    integrationId: request.nextUrl.searchParams.get("integrationId") ?? undefined,
    limit: request.nextUrl.searchParams.get("limit") ?? undefined,
  });
  if (!parsed.success) {
    return respondWithApiError(validationError(parsed.error.flatten().fieldErrors));
  }
  try {
    const artifacts = await getWorkspaceArtifacts(context.workspace.id, parsed.data);
    return NextResponse.json({ ok: true, artifacts });
  } catch (error) {
    return respondWithApiError(await internalError(error, { route: "app/artifacts:list" }));
  }
}
