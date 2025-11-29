import { NextResponse } from "next/server";
import { getWorkspaceContextFromRequest } from "@/lib/workspaceContext";
import { authRequiredError, respondWithApiError, internalError } from "@/services/apiError";
import { markAllNotificationsRead } from "@/services/notificationService";

export async function POST() {
  try {
    const context = await getWorkspaceContextFromRequest();
    if (!context) return respondWithApiError(authRequiredError());
    await markAllNotificationsRead({ workspaceId: context.workspace.id, userId: context.user.id });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return respondWithApiError(await internalError(error, { route: "notifications:mark-all-read" }));
  }
}
