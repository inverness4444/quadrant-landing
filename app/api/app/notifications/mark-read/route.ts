import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getWorkspaceContextFromRequest } from "@/lib/workspaceContext";
import { authRequiredError, internalError, respondWithApiError, validationError } from "@/services/apiError";
import { markNotificationRead } from "@/services/notificationService";

const schema = z.object({ notificationId: z.string() });

export async function POST(request: NextRequest) {
  const context = await getWorkspaceContextFromRequest(request);
  if (!context) return respondWithApiError(authRequiredError());
  const json = await request.json().catch(() => null);
  const parsed = schema.safeParse(json);
  if (!parsed.success) return respondWithApiError(validationError(parsed.error.flatten().fieldErrors));
  try {
    await markNotificationRead({
      workspaceId: context.workspace.id,
      userId: context.user.id,
      notificationId: parsed.data.notificationId,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return respondWithApiError(await internalError(error, { route: "notifications:mark-read" }));
  }
}
