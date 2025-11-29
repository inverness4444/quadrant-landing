import { NextRequest, NextResponse } from "next/server";
import { getWorkspaceContextFromRequest } from "@/lib/workspaceContext";
import { suggestQuestsFromRisks } from "@/services/questService";
import {
  authRequiredError,
  internalError,
  respondWithApiError,
} from "@/services/apiError";

export async function GET(request: NextRequest) {
  const context = await getWorkspaceContextFromRequest(request);
  if (!context) {
    return respondWithApiError(authRequiredError());
  }
  try {
    const suggestions = await suggestQuestsFromRisks(context.workspace.id);
    return NextResponse.json({ ok: true, suggestions });
  } catch (error) {
    return respondWithApiError(await internalError(error, { route: "quests:suggestions" }));
  }
}
