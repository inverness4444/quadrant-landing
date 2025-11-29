import { NextRequest, NextResponse } from "next/server";
import { getWorkspaceContextFromRequest } from "@/lib/workspaceContext";
import { authRequiredError, forbiddenError, internalError, respondWithApiError } from "@/services/apiError";
import { getCompanyHealthSnapshot } from "@/services/analyticsService";
import { requireRole } from "@/services/rbac";

export async function GET(request: NextRequest) {
  const context = await getWorkspaceContextFromRequest(request);
  if (!context) return respondWithApiError(authRequiredError());
  try {
    await requireRole(context.workspace.id, context.user.id, ["owner", "admin"]);
  } catch {
    return respondWithApiError(forbiddenError());
  }
  try {
    const snapshot = await getCompanyHealthSnapshot(context.workspace.id);
    const lines: string[] = [];
    lines.push("section,key,value");
    const push = (section: string, key: string, value: string | number | null) => {
      lines.push(`${section},${key},${value ?? ""}`);
    };
    push("programs", "total", snapshot.programs.total);
    push("programs", "active", snapshot.programs.active);
    push("programs", "completed", snapshot.programs.completed);
    push("programs", "withOutcomes", snapshot.programs.withOutcomes);
    push("skillGap", "rolesTracked", snapshot.skillGap.rolesTracked);
    push("skillGap", "avgGapKeyRoles", snapshot.skillGap.avgGapKeyRoles ?? "");
    push("skillGap", "fullyCoveredEmployeesPct", snapshot.skillGap.fullyCoveredEmployeesPct ?? "");
    push("skillGap", "skillsWithoutRatings", snapshot.skillGap.skillsWithoutRatings);
    push("feedback", "activeSurveys", snapshot.feedback.activeSurveys);
    push("feedback", "avgResponseRate", snapshot.feedback.avgResponseRate ?? "");
    push("feedback", "lastPulseSentAt", snapshot.feedback.lastPulseSentAt ?? "");
    push("feedback", "lastPulseSentiment", snapshot.feedback.lastPulseSentiment ?? "");
    push("oneOnOnes", "last30dCount", snapshot.oneOnOnes.last30dCount);
    push("oneOnOnes", "employeesWithoutRecent1on1", snapshot.oneOnOnes.employeesWithoutRecent1on1);
    push("goals", "activeGoals", snapshot.goals.activeGoals);
    push("goals", "overdueGoals", snapshot.goals.overdueGoals);
    push("goals", "completedLast30d", snapshot.goals.completedLast30d);
    push("outcomes", "programsWithOutcomes", snapshot.outcomes.programsWithOutcomes);
    push("outcomes", "pilotsWithOutcomes", snapshot.outcomes.pilotsWithOutcomes);
    push("reports", "lastQuarterReportId", snapshot.reports.lastQuarterReportId ?? "");
    push("reports", "lastQuarterLabel", snapshot.reports.lastQuarterLabel ?? "");
    push("reports", "hasCurrentQuarterDraft", snapshot.reports.hasCurrentQuarterDraft);
    const csv = lines.join("\n");
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": "attachment; filename=\"company-health.csv\"",
      },
    });
  } catch (error) {
    return respondWithApiError(await internalError(error, { route: "analytics:health-company-export" }));
  }
}

