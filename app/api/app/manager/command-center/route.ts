import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getWorkspaceContextFromRequest } from "@/lib/workspaceContext";
import { authRequiredError, forbiddenError, internalError, respondWithApiError, validationError } from "@/services/apiError";
import { getManagerCommandCenterSnapshot } from "@/services/managerCommandCenterService";
import { requireMember } from "@/services/rbac";

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

  const params = request.nextUrl.searchParams;
  const lookaheadRaw = params.get("lookaheadDays");
  const lookahead = lookaheadRaw ? Number(lookaheadRaw) : undefined;
  const lookaheadSchema = z.number().optional();
  if (lookaheadRaw && !lookaheadSchema.safeParse(lookahead).success) {
    return respondWithApiError(validationError({ lookaheadDays: ["Некорректное значение"] }));
  }

  try {
    const snapshot = await getManagerCommandCenterSnapshot({
      workspaceId: context.workspace.id,
      managerUserId: context.user.id,
      lookaheadDays: lookahead,
    });
    return NextResponse.json({
      summary: snapshot.summary,
      upcoming: snapshot.upcoming,
      risks: snapshot.risks,
      pilots: snapshot.pilots,
      notifications: snapshot.notifications,
    });
  } catch (error) {
    return respondWithApiError(await internalError(error, { route: "manager:command-center" }));
  }
}
