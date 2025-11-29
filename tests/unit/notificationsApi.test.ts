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
import { createNotification } from "@/services/notificationService";

async function seedWorkspace() {
  const plan = await ensureDefaultTestPlan();
  const user = await createUser({ email: `notifapi+${randomUUID()}@example.com`, passwordHash: "hash", name: "Notif API" });
  const workspace = await createWorkspace({ name: "WS", ownerUserId: user.id, size: "10-50", planId: plan?.id });
  await createMember({ userId: user.id, workspaceId: workspace.id, role: "owner" });
  return { user, workspace };
}

describe("notifications API", () => {
  beforeEach(async () => {
    await resetWorkspaceData({ includePlans: true });
  });

  it("returns list and settings", async () => {
    const { user, workspace } = await seedWorkspace();
    await createNotification({ workspaceId: workspace.id, userId: user.id, type: "system", title: "Hi", body: "Test" });
    const { GET } = await import("@/app/api/app/notifications/route");
    const req = new NextRequest(new URL("http://localhost/api/app/notifications"));
    req.cookies.set(SESSION_COOKIE, user.id);
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = (await res.json()) as any;
    expect(json.ok).toBe(true);
    expect(json.items?.length ?? json.notifications?.length).toBeGreaterThan(0);

    const settingsRoute = await import("@/app/api/app/notifications/settings/route");
    const reqSettings = new NextRequest(new URL("http://localhost/api/app/notifications/settings"));
    reqSettings.cookies.set(SESSION_COOKIE, user.id);
    const resSettings = await settingsRoute.GET(reqSettings as any);
    expect(resSettings.status).toBe(200);
  });
});
