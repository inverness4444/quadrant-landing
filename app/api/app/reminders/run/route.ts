import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getWorkspaceContextFromRequest } from "@/lib/workspaceContext";
import { ensureDefaultReminderRules, runAllRemindersForWorkspace, runMeetingReminders, runPilotReminders, runReportReminders } from "@/services/reminderService";
import { requireRole } from "@/services/rbac";
import { authRequiredError, forbiddenError, internalError, respondWithApiError, validationError } from "@/services/apiError";

const schema = z.object({
  scope: z.enum(["all", "pilot", "meetings", "reports"]).optional(),
});

export async function POST(request: NextRequest) {
  const context = await getWorkspaceContextFromRequest(request);
  if (!context) return respondWithApiError(authRequiredError());
  try {
    await requireRole(context.workspace.id, context.user.id, ["owner", "admin"]);
  } catch {
    return respondWithApiError(forbiddenError());
  }
  const json = await request.json().catch(() => null);
  const parsed = schema.safeParse(json ?? {});
  if (!parsed.success) {
    return respondWithApiError(validationError(parsed.error.flatten().fieldErrors));
  }
  try {
    await ensureDefaultReminderRules(context.workspace.id);
    const scope = parsed.data.scope ?? "all";
    let created = 0;
    if (scope === "all") {
      const result = await runAllRemindersForWorkspace(context.workspace.id, "all");
      created = result.created;
    } else if (scope === "pilot") {
      created = await runPilotReminders(context.workspace.id);
    } else if (scope === "meetings") {
      created = await runMeetingReminders(context.workspace.id);
    } else if (scope === "reports") {
      created = await runReportReminders(context.workspace.id);
    }
    return NextResponse.json({ ok: true, created, scope });
  } catch (error) {
    return respondWithApiError(await internalError(error, { route: "reminders:run" }));
  }
}
