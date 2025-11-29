import { NextRequest, NextResponse } from "next/server";
import { getWorkspaceContextFromRequest } from "@/lib/workspaceContext";
import { getUserNotifications, markAllNotificationsRead } from "@/services/notificationService";
import { authRequiredError, internalError, respondWithApiError } from "@/services/apiError";

export async function GET(request: NextRequest) {
  const context = await getWorkspaceContextFromRequest(request);
  if (!context) return respondWithApiError(authRequiredError());
  try {
    const { searchParams } = new URL(request.url);
    const onlyUnread = searchParams.get("onlyUnread") === "true";
    const limit = searchParams.get("limit");
    const offset = searchParams.get("offset");
    const result = await getUserNotifications({
      workspaceId: context.workspace.id,
      userId: context.user.id,
      onlyUnread,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    });
    return NextResponse.json({ ok: true, notifications: result.items, items: result.items, total: result.total, unreadCount: result.unreadCount });
  } catch (error) {
    return respondWithApiError(await internalError(error, { route: "notifications:list" }));
  }
}

export async function PATCH(request: NextRequest) {
  const context = await getWorkspaceContextFromRequest(request);
  if (!context) return respondWithApiError(authRequiredError());
  await markAllNotificationsRead({ workspaceId: context.workspace.id, userId: context.user.id });
  return NextResponse.json({ ok: true });
}
