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
  const user = await createUser({ email: `tplapi+${randomUUID()}@example.com`, passwordHash: "hash", name: "Tpl API" });
  const workspace = await createWorkspace({ name: "WS", ownerUserId: user.id, size: "10-50", planId: plan?.id });
  await createMember({ userId: user.id, workspaceId: workspace.id, role: "owner" });
  return { user, workspace };
}

describe("pilot template API", () => {
  beforeEach(async () => {
    await resetWorkspaceData({ includePlans: true });
  });

  it("lists templates", async () => {
    const { user } = await seedWorkspace();
    const { GET } = await import("@/app/api/app/pilot-templates/route");
    const req = new NextRequest(new URL("http://localhost/api/app/pilot-templates"));
    req.cookies.set(SESSION_COOKIE, user.id);
    const res = await GET(req);
    expect(res.status).toBe(200);
  });
});
