/* eslint-disable @typescript-eslint/no-explicit-any */
import { randomUUID } from "crypto";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it } from "vitest";
import { SESSION_COOKIE } from "@/lib/session";
import { createUser } from "@/repositories/userRepository";
import { createWorkspace } from "@/repositories/workspaceRepository";
import { createMember } from "@/repositories/memberRepository";
import { ensureDefaultTestPlan } from "@/tests/utils/planTestHelper";
import { resetWorkspaceData } from "@/tests/utils/dbCleaner";

describe("manager home API", () => {
  beforeEach(async () => {
    await resetWorkspaceData({ includePlans: true });
  });

  it("returns manager home payload", async () => {
    const plan = await ensureDefaultTestPlan();
    const user = await createUser({ email: `mgrapi+${randomUUID()}@example.com`, passwordHash: "hash", name: "Manager API" });
    const workspace = await createWorkspace({ name: "Manager API", ownerUserId: user.id, size: "10-50", planId: plan?.id });
    await createMember({ userId: user.id, workspaceId: workspace.id, role: "owner" });

    const { GET } = await import("@/app/api/app/manager/home/route");
    const request = new NextRequest(new URL("http://localhost/api/app/manager/home"));
    request.cookies.set(SESSION_COOKIE, user.id);
    const response = await GET(request);
    expect(response.status).toBe(200);
    const json = (await response.json()) as any;
    expect(json.ok).toBe(true);
    expect(json.summary).toBeTruthy();
    expect(json.employees).toBeTruthy();
    expect(json.actions).toBeTruthy();
  });
});
