import { NextRequest, NextResponse } from "next/server";
import { getWorkspaceContextFromRequest } from "@/lib/workspaceContext";
import { authRequiredError, internalError, respondWithApiError } from "@/services/apiError";
import { countUnreadNotifications } from "@/services/notificationService";

export async function GET(request: NextRequest) {
  const context = await getWorkspaceContextFromRequest(request);
  if (!context) return respondWithApiError(authRequiredError());
  try {
    const count = await countUnreadNotifications({ workspaceId: context.workspace.id, userId: context.user.id });
    return NextResponse.json({ ok: true, count });
  } catch (error) {
    return respondWithApiError(await internalError(error, { route: "notifications:unread-count" }));
  }
}

