/* eslint-disable @typescript-eslint/no-explicit-any */
import { randomUUID } from "crypto";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it } from "vitest";
import { createNotification } from "@/services/notificationService";
import { createWorkspace } from "@/repositories/workspaceRepository";
import { createUser } from "@/repositories/userRepository";
import { createMember } from "@/repositories/memberRepository";
import { ensureDefaultTestPlan } from "@/tests/utils/planTestHelper";
import { resetWorkspaceData } from "@/tests/utils/dbCleaner";
import { SESSION_COOKIE } from "@/lib/session";

async function seed() {
  const plan = await ensureDefaultTestPlan();
  const user = await createUser({ email: `notif+${randomUUID()}@example.com`, passwordHash: "hash", name: "Notif" });
  const workspace = await createWorkspace({ name: "WS", ownerUserId: user.id, size: "10-50", planId: plan?.id });
  await createMember({ userId: user.id, workspaceId: workspace.id, role: "owner" });
  return { user, workspace };
}

describe("notifications unread API", () => {
  beforeEach(async () => {
    await resetWorkspaceData({ includePlans: true });
  });

  it("returns unread notifications and marks read", async () => {
    const { user, workspace } = await seed();
    const created = await createNotification({
      workspaceId: workspace.id,
      userId: user.id,
      type: "system",
      title: "Hello",
      body: "Body",
    });
    const { GET } = await import("@/app/api/app/notifications/unread/route");
    const req = new NextRequest(new URL("http://localhost/api/app/notifications/unread"));
    req.cookies.set(SESSION_COOKIE, user.id);
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = (await res.json()) as any;
    expect(json.items?.length ?? 0).toBeGreaterThan(0);

    const { POST } = await import("@/app/api/app/notifications/[id]/read/route");
    const readReq = new NextRequest(new URL(`http://localhost/api/app/notifications/${created.id}/read`));
    readReq.cookies.set(SESSION_COOKIE, user.id);
    const readRes = await POST(readReq as any, { params: { id: created.id } });
    expect(readRes.status).toBe(200);
  });
});
