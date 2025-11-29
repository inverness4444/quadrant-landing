import { randomUUID } from "crypto";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it } from "vitest";
import { createMember } from "@/repositories/memberRepository";
import { createUser } from "@/repositories/userRepository";
import { createWorkspace } from "@/repositories/workspaceRepository";
import { resetWorkspaceData } from "@/tests/utils/dbCleaner";
import { ensureDefaultTestPlan } from "@/tests/utils/planTestHelper";
import { SESSION_COOKIE } from "@/lib/session";
import { createRiskCase } from "@/services/riskCenterService";
import { db } from "@/lib/db";
import { employees } from "@/drizzle/schema";

async function seed() {
  await ensureDefaultTestPlan();
  const user = await createUser({ email: `manager-api-${randomUUID()}@example.com`, passwordHash: "hash", name: "Manager API" });
  const ws = await createWorkspace({ name: "Manager API WS", ownerUserId: user.id, planId: null });
  await createMember({ userId: user.id, workspaceId: ws.id, role: "owner" });
  const now = new Date().toISOString();
  const employeeId = randomUUID();
  db.insert(employees)
    .values({
      id: employeeId,
      workspaceId: ws.id,
      name: "Tester",
      position: "QA",
      level: "Middle",
      primaryTrackId: null,
      trackLevelId: null,
      createdAt: now,
      updatedAt: now,
    })
    .run();
  await createRiskCase({ workspaceId: ws.id, employeeId, level: "medium", source: "manual", title: "API Risk", ownerUserId: user.id });
  return { ws, user };
}

describe("manager command center API", () => {
  beforeEach(async () => {
    await resetWorkspaceData({ includePlans: true });
  });

  it("returns snapshot for manager", async () => {
  const { user } = await seed();
    const { GET } = await import("@/app/api/app/manager/command-center/route");
    const request = new NextRequest(new URL("http://localhost/api/app/manager/command-center"));
    request.cookies.set(SESSION_COOKIE, user.id);
    const response = await GET(request);
    expect(response.status).toBe(200);
    const json = (await response.json()) as { summary?: { employeesAtRisk?: number } };
    expect(json.summary?.employeesAtRisk).toBe(1);
    expect(json.summary?.employeesTotal).toBe(1);
  });
});
