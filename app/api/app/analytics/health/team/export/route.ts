import { NextRequest, NextResponse } from "next/server";
import { getWorkspaceContextFromRequest } from "@/lib/workspaceContext";
import { authRequiredError, forbiddenError, internalError, respondWithApiError } from "@/services/apiError";
import { getTeamHealthSnapshot } from "@/services/analyticsService";
import { requireRole } from "@/services/rbac";

export async function GET(request: NextRequest) {
  const context = await getWorkspaceContextFromRequest(request);
  if (!context) return respondWithApiError(authRequiredError());
  try {
    await requireRole(context.workspace.id, context.user.id, ["owner", "admin"]);
  } catch {
    const member = context.member;
    if (!member || member.role === "member") {
      return respondWithApiError(forbiddenError());
    }
  }
  try {
    const snapshot = await getTeamHealthSnapshot({ workspaceId: context.workspace.id, managerId: context.user.id });
    const lines: string[] = [];
    const push = (section: string, key: string, value: string | number | null) => {
      lines.push(`${section},${key},${value ?? ""}`);
    };
    lines.push("section,key,value");
    push("team", "size", snapshot.teamSize);
    push("programs", "activeForTeam", snapshot.programs.activeForTeam);
    push("programs", "completedForTeam", snapshot.programs.completedForTeam);
    push("skillGap", "avgGapForTeamRoles", snapshot.skillGap.avgGapForTeamRoles ?? "");
    push("feedback", "teamResponseRate", snapshot.feedback.teamResponseRate ?? "");
    push("feedback", "negativeSignalsCount", snapshot.feedback.negativeSignalsCount);
    push("oneOnOnes", "plannedNext7d", snapshot.oneOnOnes.plannedNext7d);
    push("oneOnOnes", "doneLast30d", snapshot.oneOnOnes.doneLast30d);
    push("oneOnOnes", "employeesWithoutRecent1on1", snapshot.oneOnOnes.employeesWithoutRecent1on1);
    push("goals", "employeesWithoutGoals", snapshot.goals.employeesWithoutGoals);
    push("goals", "overdueGoals", snapshot.goals.overdueGoals);
    const csv = lines.join("\n");
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": "attachment; filename=\"team-health.csv\"",
      },
    });
  } catch (error) {
    return respondWithApiError(await internalError(error, { route: "analytics:health-team-export" }));
  }
}

