import { NextRequest, NextResponse } from "next/server";
import { getWorkspaceContextFromRequest } from "@/lib/workspaceContext";
import { authRequiredError, internalError, respondWithApiError } from "@/services/apiError";
import { getUnreadNotifications } from "@/services/notificationService";

export async function GET(request: NextRequest) {
  const context = await getWorkspaceContextFromRequest(request);
  if (!context) return respondWithApiError(authRequiredError());
  try {
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get("limit");
    const items = await getUnreadNotifications({
      workspaceId: context.workspace.id,
      userId: context.user.id,
      limit: limit ? Number(limit) : undefined,
    });
    return NextResponse.json({ ok: true, items, notifications: items });
  } catch (error) {
    return respondWithApiError(await internalError(error, { route: "notifications:unread" }));
  }
}
