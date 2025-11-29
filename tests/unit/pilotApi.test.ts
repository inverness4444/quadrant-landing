import { randomUUID } from "crypto";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it } from "vitest";
import { createMember } from "@/repositories/memberRepository";
import { createUser } from "@/repositories/userRepository";
import { createWorkspace } from "@/repositories/workspaceRepository";
import { ensureDefaultTestPlan } from "@/tests/utils/planTestHelper";
import { resetWorkspaceData } from "@/tests/utils/dbCleaner";
import { SESSION_COOKIE } from "@/lib/session";
import { createTrack } from "@/repositories/trackRepository";

async function seedWorkspace() {
  const plan = await ensureDefaultTestPlan();
  const user = await createUser({
    email: `pilot-api-${randomUUID()}@example.com`,
    passwordHash: "hash",
    name: "Pilot API",
  });
  const workspace = await createWorkspace({
    name: "Pilot API",
    ownerUserId: user.id,
    planId: plan?.id ?? null,
  });
  await createMember({ userId: user.id, workspaceId: workspace.id, role: "owner" });
  const track = await createTrack(workspace.id, { name: "Пилотная команда", levels: [{ name: "L1", description: "" }] });
  return { user, workspace, trackId: track?.id };
}

describe("pilot API", () => {
  beforeEach(async () => {
    await resetWorkspaceData({ includePlans: true });
  });

  it.skip("creates pilot run via POST /pilot/runs", async () => {
  const { user, trackId } = await seedWorkspace();
    const { POST } = await import("@/app/api/app/pilot/runs/route");
    const request = new NextRequest(new URL("http://localhost/api/app/pilot/runs"), {
      method: "POST",
      body: JSON.stringify({ name: "Пилот API", description: "Описание", teamIds: trackId ? [trackId] : [] }),
      headers: new Headers({ "content-type": "application/json" }),
    });
    request.cookies.set(SESSION_COOKIE, user.id);
    const response = await POST(request);
    expect(response.status).toBe(200);
    const json = (await response.json()) as { ok?: boolean; run?: { id?: string } };
    expect(json.ok).toBe(true);
    expect(json.run?.id).toBeDefined();
  });

  it("updates step status via PATCH", async () => {
  const { user } = await seedWorkspace();
    const { POST } = await import("@/app/api/app/pilot/runs/route");
    const request = new NextRequest(new URL("http://localhost/api/app/pilot/runs"), {
      method: "POST",
      body: JSON.stringify({ name: "Пилот API", description: "Описание", teamIds: [] }),
      headers: new Headers({ "content-type": "application/json" }),
    });
    request.cookies.set(SESSION_COOKIE, user.id);
    const createResp = await POST(request);
    const json = (await createResp.json()) as { run?: { id: string; steps: Array<{ id: string }> } };
    const runId = json.run?.id as string;
    const stepId = json.run?.steps?.[0]?.id as string;
    const { PATCH } = await import("@/app/api/app/pilot/runs/[id]/steps/[stepId]/route");
    const patchReq = new NextRequest(new URL(`http://localhost/api/app/pilot/runs/${runId}/steps/${stepId}`), {
      method: "PATCH",
      body: JSON.stringify({ status: "done" }),
      headers: new Headers({ "content-type": "application/json" }),
    });
    patchReq.cookies.set(SESSION_COOKIE, user.id);
    const patchResp = await PATCH(patchReq, { params: { id: runId, stepId } });
    expect(patchResp.status).toBe(200);
    const patchJson = (await patchResp.json()) as { ok?: boolean; step?: { status?: string } };
    expect(patchJson.step?.status).toBe("done");
  });
});
