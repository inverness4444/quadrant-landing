import { randomUUID } from "crypto";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it } from "vitest";
import { resetWorkspaceData } from "@/tests/utils/dbCleaner";
import { ensureDefaultTestPlan } from "@/tests/utils/planTestHelper";
import { createUser } from "@/repositories/userRepository";
import { createWorkspace } from "@/repositories/workspaceRepository";
import { createMember } from "@/repositories/memberRepository";
import { createPilotWithDefaultSteps } from "@/services/pilotService";
import { SESSION_COOKIE } from "@/lib/session";

async function setupWorkspace() {
  const plan = await ensureDefaultTestPlan();
  const user = await createUser({
    email: `pilot-api-${randomUUID()}@example.com`,
    passwordHash: "hash",
    name: "Pilot API",
  });
  const workspace = await createWorkspace({
    name: "Pilot API WS",
    ownerUserId: user.id,
    planId: plan?.id ?? null,
  });
  await createMember({ userId: user.id, workspaceId: workspace.id, role: "owner" });
  return { user, workspace };
}

describe("pilot steps API", () => {
  beforeEach(async () => {
    await resetWorkspaceData({ includePlans: true });
  });

  it("updates step status via PATCH", async () => {
    const { user, workspace } = await setupWorkspace();
    const summary = await createPilotWithDefaultSteps(workspace.id, {
      name: "API Пилот",
      status: "active",
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString(),
      goals: "Проверка API",
    });
    const targetStep = summary.steps[0];
    const { PATCH } = await import("@/app/api/app/pilot/steps/route");
    const request = new NextRequest(new URL("http://localhost/api/app/pilot/steps"), {
      method: "PATCH",
      body: JSON.stringify({ stepId: targetStep.id, status: "done", notes: "Завершено" }),
      headers: new Headers({ "content-type": "application/json" }),
    });
    request.cookies.set(SESSION_COOKIE, user.id);
    const response = await PATCH(request);
    expect(response.status).toBe(200);
    const json = (await response.json()) as { ok?: boolean; step?: { status: string; notes?: string } };
    expect(json.ok).toBe(true);
    expect(json.step?.status).toBe("done");
    expect(json.step?.notes).toBe("Завершено");
  });
});
