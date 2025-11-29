import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getWorkspaceContextFromRequest } from "@/lib/workspaceContext";
import { authRequiredError, internalError, respondWithApiError, validationError } from "@/services/apiError";
import { markNotificationRead } from "@/services/notificationService";

const paramsSchema = z.object({ id: z.string() });

export async function PATCH(_request: NextRequest, { params }: { params: { id: string } }) {
  const context = await getWorkspaceContextFromRequest();
  if (!context) return respondWithApiError(authRequiredError());
  const parsed = paramsSchema.safeParse(params);
  if (!parsed.success) return respondWithApiError(validationError(parsed.error.flatten().fieldErrors));
  try {
    await markNotificationRead({ workspaceId: context.workspace.id, userId: context.user.id, notificationId: parsed.data.id });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return respondWithApiError(await internalError(error, { route: "notifications:patch" }));
  }
}
