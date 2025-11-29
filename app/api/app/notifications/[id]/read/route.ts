import { NextRequest, NextResponse } from "next/server";
import { getWorkspaceContextFromRequest } from "@/lib/workspaceContext";
import { authRequiredError, internalError, respondWithApiError } from "@/services/apiError";
import { markNotificationRead } from "@/services/notificationService";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const context = await getWorkspaceContextFromRequest(request);
  if (!context) return respondWithApiError(authRequiredError());
  try {
    await markNotificationRead({
      workspaceId: context.workspace.id,
      userId: context.user.id,
      notificationId: params.id,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return respondWithApiError(await internalError(error, { route: "notifications:read" }));
  }
}
