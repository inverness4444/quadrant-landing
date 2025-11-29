import { randomUUID } from "crypto";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it } from "vitest";
import { SESSION_COOKIE } from "@/lib/session";
import { createMember } from "@/repositories/memberRepository";
import { createUser } from "@/repositories/userRepository";
import { createWorkspace } from "@/repositories/workspaceRepository";
import { ensureDefaultTestPlan } from "@/tests/utils/planTestHelper";
import { resetWorkspaceData } from "@/tests/utils/dbCleaner";

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
  return { user, workspace };
}

describe("pilot program API", () => {
  beforeEach(async () => {
    await resetWorkspaceData({ includePlans: true });
  });

  it("creates pilot via POST /api/app/pilots and reads detail", async () => {
    const { user } = await seedWorkspace();
    const { POST } = await import("@/app/api/app/pilots/route");
    const request = new NextRequest(new URL("http://localhost/api/app/pilots"), {
      method: "POST",
      body: JSON.stringify({ name: "API Pilot", description: "desc" }),
      headers: new Headers({ "content-type": "application/json" }),
    });
    request.cookies.set(SESSION_COOKIE, user.id);
    const response = await POST(request);
    expect(response.status).toBe(200);
    const json = (await response.json()) as { ok?: boolean; pilot?: { id: string } };
    expect(json.ok).toBe(true);
    const pilotId = json.pilot?.id as string;

    const { GET } = await import("@/app/api/app/pilots/[id]/route");
    const getReq = new NextRequest(new URL(`http://localhost/api/app/pilots/${pilotId}`));
    getReq.cookies.set(SESSION_COOKIE, user.id);
    const detailResp = await GET(getReq, { params: { id: pilotId } });
    expect(detailResp.status).toBe(200);
    const detailJson = (await detailResp.json()) as { pilot?: { id: string } };
    expect(detailJson.pilot?.id).toBe(pilotId);
  });
});
