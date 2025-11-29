import { NextRequest, NextResponse } from "next/server";
import { getWorkspaceContextFromRequest } from "@/lib/workspaceContext";
import { authRequiredError, internalError, respondWithApiError } from "@/services/apiError";
import { getManagerHome } from "@/services/managerHomeService";

export async function GET(request: NextRequest) {
  const context = await getWorkspaceContextFromRequest(request);
  if (!context) {
    return respondWithApiError(authRequiredError());
  }
  try {
    const data = await getManagerHome({ workspaceId: context.workspace.id, userId: context.user.id });
    return NextResponse.json({ ok: true, ...data });
  } catch (error) {
    return respondWithApiError(await internalError(error, { route: "manager:home" }));
  }
}
