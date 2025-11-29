import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getWorkspaceContextFromRequest } from "@/lib/workspaceContext";
import { authRequiredError, internalError, respondWithApiError, validationError } from "@/services/apiError";
import { getOrCreateNotificationSettings, updateNotificationSettings } from "@/services/notificationSettingsService";

const patchSchema = z.object({
  emailEnabled: z.boolean().optional(),
  emailDailyDigest: z.boolean().optional(),
  emailWeeklyDigest: z.boolean().optional(),
  inAppEnabled: z.boolean().optional(),
  timezone: z.string().optional().nullable(),
});

export async function GET() {
  const context = await getWorkspaceContextFromRequest();
  if (!context) return respondWithApiError(authRequiredError());
  try {
    const settings = await getOrCreateNotificationSettings({ workspaceId: context.workspace.id, userId: context.user.id });
    return NextResponse.json({ ok: true, settings });
  } catch (error) {
    return respondWithApiError(await internalError(error, { route: "notifications:settings:get" }));
  }
}

export async function PATCH(request: NextRequest) {
  const context = await getWorkspaceContextFromRequest(request);
  if (!context) return respondWithApiError(authRequiredError());
  const json = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(json ?? {});
  if (!parsed.success) return respondWithApiError(validationError(parsed.error.flatten().fieldErrors));
  try {
    const settings = await updateNotificationSettings({ workspaceId: context.workspace.id, userId: context.user.id, patch: parsed.data });
    return NextResponse.json({ ok: true, settings });
  } catch (error) {
    return respondWithApiError(await internalError(error, { route: "notifications:settings:patch" }));
  }
}
