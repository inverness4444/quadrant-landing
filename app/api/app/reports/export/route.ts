import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getWorkspaceContextFromRequest } from "@/lib/workspaceContext";
import { getExportData } from "@/services/reportService";
import { requireMember } from "@/services/rbac";
import {
  authRequiredError,
  forbiddenError,
  internalError,
  respondWithApiError,
  validationError,
} from "@/services/apiError";

const boolParam = z
  .enum(["true", "false"])
  .optional()
  .transform((value) => {
    if (value === undefined) return undefined;
    return value === "true";
  });

const schema = z.object({
  includeEmployees: boolParam,
  includeSkills: boolParam,
  includeLinks: boolParam,
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

  const params = schema.safeParse({
    includeEmployees: request.nextUrl.searchParams.get("includeEmployees") ?? undefined,
    includeSkills: request.nextUrl.searchParams.get("includeSkills") ?? undefined,
    includeLinks: request.nextUrl.searchParams.get("includeLinks") ?? undefined,
  });
  if (!params.success) {
    return respondWithApiError(validationError(params.error.flatten().fieldErrors));
  }
  const options = {
    includeEmployees: params.data.includeEmployees ?? true,
    includeSkills: params.data.includeSkills ?? true,
    includeLinks: params.data.includeLinks ?? true,
  };
  try {
    const data = await getExportData(context.workspace.id, options);
    return NextResponse.json(data);
  } catch (error) {
    return respondWithApiError(await internalError(error, { route: "reports:export" }));
  }
}
