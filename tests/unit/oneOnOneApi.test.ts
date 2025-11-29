import { randomUUID } from "crypto";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { SESSION_COOKIE } from "@/lib/session";
import { employees } from "@/drizzle/schema";
import { createMember } from "@/repositories/memberRepository";
import { createUser } from "@/repositories/userRepository";
import { createWorkspace } from "@/repositories/workspaceRepository";
import { ensureDefaultTestPlan } from "@/tests/utils/planTestHelper";
import { resetWorkspaceData } from "@/tests/utils/dbCleaner";

describe("one-on-ones API", () => {
  let userId: string;
  let workspaceId: string;
  let employeeId: string;

  beforeEach(async () => {
    await resetWorkspaceData({ includePlans: true });
    const plan = await ensureDefaultTestPlan();
    const user = await createUser({ email: `oooapi+${randomUUID()}@example.com`, passwordHash: "hash", name: "Mgr" });
    userId = user.id;
    const ws = await createWorkspace({ name: "WS", ownerUserId: userId, planId: plan?.id });
    workspaceId = ws.id;
    await createMember({ userId, workspaceId, role: "owner" });
    employeeId = randomUUID();
    db.insert(employees)
      .values({
        id: employeeId,
        workspaceId,
        name: "Emp",
        position: "Dev",
        level: "Senior",
        primaryTrackId: null,
        trackLevelId: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .run();
  });

  it("creates and fetches one-on-one", async () => {
    const { POST, GET: LIST } = await import("@/app/api/app/one-on-ones/route");
    const req = new NextRequest(new URL("http://localhost/api/app/one-on-ones"), {
      method: "POST",
      body: JSON.stringify({ employeeId, scheduledAt: new Date().toISOString() }),
      headers: new Headers({ "content-type": "application/json" }),
    });
    req.cookies.set(SESSION_COOKIE, userId);
    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = (await res.json()) as { oneOnOne?: { id: string } };
    expect(json.oneOnOne?.id).toBeTruthy();

    const listReq = new NextRequest(new URL("http://localhost/api/app/one-on-ones"));
    listReq.cookies.set(SESSION_COOKIE, userId);
    const listRes = await LIST(listReq);
    expect(listRes.status).toBe(200);
  });
});
