import { randomUUID } from "crypto";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it } from "vitest";
import { resetWorkspaceData } from "@/tests/utils/dbCleaner";
import { ensureDefaultTestPlan } from "@/tests/utils/planTestHelper";
import { createUser } from "@/repositories/userRepository";
import { createWorkspace } from "@/repositories/workspaceRepository";
import { createMember } from "@/repositories/memberRepository";
import { db } from "@/lib/db";
import { employees } from "@/drizzle/schema";
import { SESSION_COOKIE } from "@/lib/session";
import { createRiskCase } from "@/services/riskCenterService";

async function seedWorkspace() {
  await ensureDefaultTestPlan();
  const user = await createUser({ email: `risk-api+${randomUUID()}@example.com`, passwordHash: "hash", name: "Risk API" });
  const ws = await createWorkspace({ name: "Risk API WS", ownerUserId: user.id, planId: null });
  await createMember({ userId: user.id, workspaceId: ws.id, role: "owner" });
  const employeeId = randomUUID();
  const now = new Date().toISOString();
  db.insert(employees)
    .values({
      id: employeeId,
      workspaceId: ws.id,
      name: "API Emp",
      position: "Engineer",
      level: "Middle",
      primaryTrackId: null,
      trackLevelId: null,
      createdAt: now,
      updatedAt: now,
    })
    .run();
  return { ws, user, employeeId };
}

describe("risk center API", () => {
  beforeEach(async () => {
    await resetWorkspaceData({ includePlans: true });
  });

  it("returns risk cases list", async () => {
    const { ws, user, employeeId } = await seedWorkspace();
    await createRiskCase({ workspaceId: ws.id, employeeId, level: "high", source: "manual", title: "API Risk" });
    const { GET } = await import("@/app/api/app/risk-center/cases/route");
    const request = new NextRequest(new URL("http://localhost/api/app/risk-center/cases"));
    request.cookies.set(SESSION_COOKIE, user.id);
    const response = await GET(request);
    expect(response.status).toBe(200);
    const json = (await response.json()) as { ok?: boolean; items?: Array<{ id: string }> };
    expect(json.ok).toBe(true);
    expect(json.items?.length).toBeGreaterThan(0);
  });

  it("updates case status via API", async () => {
    const { ws, user, employeeId } = await seedWorkspace();
    const riskCase = await createRiskCase({ workspaceId: ws.id, employeeId, level: "medium", source: "manual", title: "Status risk" });
    const { PATCH } = await import("@/app/api/app/risk-center/cases/[id]/status/route");
    const request = new NextRequest(new URL(`http://localhost/api/app/risk-center/cases/${riskCase.id}/status`), {
      method: "PATCH",
      body: JSON.stringify({ status: "resolved", resolutionNote: "handled" }),
      headers: new Headers({ "content-type": "application/json" }),
    });
    request.cookies.set(SESSION_COOKIE, user.id);
    const response = await PATCH(request, { params: { id: riskCase.id } });
    expect(response.status).toBe(200);
    const json = (await response.json()) as { ok?: boolean; case?: { status?: string } };
    expect(json.ok).toBe(true);
    expect(json.case?.status).toBe("resolved");
  });
});
