import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getWorkspaceContextFromRequest } from "@/lib/workspaceContext";
import { authRequiredError, forbiddenError, internalError, respondWithApiError, validationError } from "@/services/apiError";
import { getRiskCaseById, updateRiskCaseStatus } from "@/services/riskCenterService";
import { requireMember } from "@/services/rbac";

const statusEnum = z.enum(["open", "monitoring", "resolved"]);

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const context = await getWorkspaceContextFromRequest(request);
  if (!context) {
    return respondWithApiError(authRequiredError());
  }
  const member = await requireMember(context.workspace.id, context.user.id).catch(() => null);
  if (!member) {
    return respondWithApiError(forbiddenError());
  }
  const body = await request.json().catch(() => null);
  const parsed = z
    .object({
      status: statusEnum,
      resolutionNote: z.string().optional(),
    })
    .safeParse(body);
  if (!parsed.success) {
    return respondWithApiError(validationError(parsed.error.flatten().fieldErrors));
  }
  try {
    const existing = await getRiskCaseById(context.workspace.id, params.id);
    if (existing.ownerUserId && existing.ownerUserId !== context.user.id && member.role === "member") {
      return respondWithApiError(forbiddenError());
    }
    const updated = await updateRiskCaseStatus({
      workspaceId: context.workspace.id,
      caseId: params.id,
      status: parsed.data.status,
      resolutionNote: parsed.data.resolutionNote,
      resolvedByUserId: context.user.id,
    });
    return NextResponse.json({ ok: true, case: updated });
  } catch (error) {
    return respondWithApiError(await internalError(error, { route: "risk-center:cases:updateStatus" }));
  }
}
