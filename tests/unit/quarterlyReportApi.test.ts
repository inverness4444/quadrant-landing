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
  const user = await createUser({ email: `qrapi+${randomUUID()}@example.com`, passwordHash: "hash", name: "QR API" });
  const workspace = await createWorkspace({ name: "QR API", ownerUserId: user.id, size: "10-50", planId: plan?.id });
  await createMember({ userId: user.id, workspaceId: workspace.id, role: "owner" });
  return { user, workspace };
}

describe("quarterly report API", () => {
  beforeEach(async () => {
    await resetWorkspaceData({ includePlans: true });
  });

  it("returns report with summary", async () => {
    const { user } = await seedWorkspace();
    const { GET } = await import("@/app/api/app/reports/quarterly/route");
    const req = new NextRequest(new URL("http://localhost/api/app/reports/quarterly?year=2024&quarter=1"));
    req.cookies.set(SESSION_COOKIE, user.id);
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = (await res.json()) as any;
    expect(json.ok).toBe(true);
    expect(json.report).toBeTruthy();
    expect(json.summary).toBeTruthy();
  });
});
