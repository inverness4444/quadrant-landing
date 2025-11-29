import { NextRequest, NextResponse } from "next/server";
import { getWorkspaceContextFromRequest } from "@/lib/workspaceContext";
import { suggestMoveScenarioFromRisks } from "@/services/movesService";
import { requireRole } from "@/services/rbac";
import {
  authRequiredError,
  forbiddenError,
  internalError,
  respondWithApiError,
  validationError,
} from "@/services/apiError";

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
  const payload = (await request.json().catch(() => null)) as { teamId?: string | null; cycleId?: string | null } | null;
  if (!payload) {
    return respondWithApiError(validationError({ body: ["Некорректный запрос"] }));
  }
  try {
    const scenario = await suggestMoveScenarioFromRisks({
      workspaceId: context.workspace.id,
      createdByUserId: context.user.id,
      teamId: payload.teamId ?? undefined,
      cycleId: payload.cycleId ?? undefined,
    });
    return NextResponse.json({ ok: true, scenario });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ошибка генерации сценария";
    if (message.includes("Недостаточно данных")) {
      return respondWithApiError(
        validationError({
          data: [message],
        }),
      );
    }
    return respondWithApiError(await internalError(error, { route: "moves:suggest-scenario", teamId: payload.teamId ?? "all" }));
  }
}
