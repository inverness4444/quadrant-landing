import { randomUUID } from "crypto";
import { beforeEach, describe, expect, it } from "vitest";
import { createMember } from "@/repositories/memberRepository";
import { createUser } from "@/repositories/userRepository";
import { createWorkspace } from "@/repositories/workspaceRepository";
import { ensureDefaultTestPlan } from "@/tests/utils/planTestHelper";
import { resetWorkspaceData } from "@/tests/utils/dbCleaner";
import { createNotification, getUnreadNotifications, markNotificationRead } from "@/services/notificationService";

describe("notificationService", () => {
  let workspaceId: string;
  let userId: string;

  beforeEach(async () => {
    await resetWorkspaceData({ includePlans: true });
    const plan = await ensureDefaultTestPlan();
    const user = await createUser({ email: `notify+${randomUUID()}@example.com`, passwordHash: "hash", name: "Notify" });
    userId = user.id;
    const ws = await createWorkspace({ name: "WS", ownerUserId: userId, planId: plan?.id });
    workspaceId = ws.id;
    await createMember({ userId, workspaceId, role: "owner" });
  });

  it("creates and fetches unread notifications", async () => {
    const notif = await createNotification({
      workspaceId,
      userId,
      type: "system",
      title: "Test",
      body: "Body",
      priority: 1,
    });
    expect(notif.priority).toBe(1);
    const unread = await getUnreadNotifications({ workspaceId, userId });
    expect(unread.length).toBe(1);
    await markNotificationRead({ workspaceId, userId, notificationId: notif.id });
    const unreadAfter = await getUnreadNotifications({ workspaceId, userId });
    expect(unreadAfter.length).toBe(0);
  });
});
