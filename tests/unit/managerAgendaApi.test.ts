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

async function seedWorkspace() {
  const plan = await ensureDefaultTestPlan();
  const user = await createUser({ email: `agendaapi+${randomUUID()}@example.com`, passwordHash: "hash", name: "Agenda API" });
  const workspace = await createWorkspace({ name: "Agenda API", ownerUserId: user.id, size: "10-50", planId: plan?.id });
  await createMember({ userId: user.id, workspaceId: workspace.id, role: "owner" });
  return { user, workspace };
}

describe("manager agenda API", () => {
  beforeEach(async () => {
    await resetWorkspaceData({ includePlans: true });
  });

  it("returns days", async () => {
    const { user } = await seedWorkspace();
    const { GET } = await import("@/app/api/app/manager/agenda/route");
    const request = new NextRequest(new URL("http://localhost/api/app/manager/agenda"));
    request.cookies.set(SESSION_COOKIE, user.id);
    const response = await GET(request);
    expect(response.status).toBe(200);
    const json = (await response.json()) as any;
    expect(json.ok).toBe(true);
    expect(Array.isArray(json.days)).toBe(true);
  });
});
