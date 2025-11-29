import { NextRequest, NextResponse } from "next/server";
import { getWorkspaceContextFromRequest } from "@/lib/workspaceContext";
import { authRequiredError, internalError, respondWithApiError } from "@/services/apiError";
import { getQuarterlyReportById } from "@/services/quarterlyReportService";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const context = await getWorkspaceContextFromRequest(request);
  if (!context) return respondWithApiError(authRequiredError());
  try {
    const result = await getQuarterlyReportById({ workspaceId: context.workspace.id, reportId: params.id });
    if (!result?.payload) {
      return NextResponse.json({ ok: false, error: { message: "Payload not found" } }, { status: 404 });
    }
    const rows: string[] = [];
    const pushRow = (key: string, value: string | number | null | undefined) => {
      rows.push(`"${key}";"${value ?? ""}"`);
    };
    const payload = result.payload;
    pushRow("period", `Q${payload.period.quarter} ${payload.period.year}`);
    pushRow("headcount_total", payload.headcount.totalEmployees);
    pushRow("headcount_active", payload.headcount.activeEmployees);
    pushRow("roles_total", payload.roles.totalRoles);
    payload.roles.employeesPerRole.forEach((role) => pushRow(`role_${role.roleName}`, role.count));
    pushRow("skills_tracked", payload.skills.trackedSkills);
    payload.skills.avgSkillLevelByRole.forEach((r) => pushRow(`avg_skill_${r.roleName}`, r.avgLevel));
    if (payload.developmentGoals) {
      pushRow("goals_active", payload.developmentGoals.activeGoals);
    }
    payload.pilots.pilotSummaries.forEach((p) => pushRow(`pilot_${p.name}_${p.status}`, p.participants));
    const csv = rows.join("\n");
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename=quarterly-${payload.period.year}-Q${payload.period.quarter}.csv`,
      },
    });
  } catch (error) {
    return respondWithApiError(await internalError(error, { route: "quarterly:export-csv", meta: { id: params.id } }));
  }
}
