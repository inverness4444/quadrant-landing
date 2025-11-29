import { randomUUID } from "crypto";
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { employees } from "@/drizzle/schema";
import { createMember } from "@/repositories/memberRepository";
import { createUser } from "@/repositories/userRepository";
import { createWorkspace } from "@/repositories/workspaceRepository";
import { ensureDefaultTestPlan } from "@/tests/utils/planTestHelper";
import { resetWorkspaceData } from "@/tests/utils/dbCleaner";
import { addNote, getOneOnOneById, scheduleOneOnOne, updateOneOnOne } from "@/services/oneOnOneService";

describe("oneOnOneService", () => {
  let workspaceId: string;
  let managerId: string;
  let employeeId: string;

  beforeEach(async () => {
    await resetWorkspaceData({ includePlans: true });
    const plan = await ensureDefaultTestPlan();
    const manager = await createUser({ email: `oneonone+${randomUUID()}@example.com`, passwordHash: "hash", name: "Mgr" });
    managerId = manager.id;
    const ws = await createWorkspace({ name: "OOO", ownerUserId: managerId, planId: plan?.id });
    workspaceId = ws.id;
    await createMember({ userId: managerId, workspaceId, role: "owner" });
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

  it("creates and updates one-on-one", async () => {
    const one = await scheduleOneOnOne({ workspaceId, managerId, employeeId, scheduledAt: new Date().toISOString(), durationMinutes: 45 });
    expect(one.id).toBeTruthy();
    const updated = await updateOneOnOne({ workspaceId, oneOnOneId: one.id, managerId, status: "completed" });
    expect(updated?.status).toBe("completed");
  });

  it("adds note and fetches detail", async () => {
    const one = await scheduleOneOnOne({ workspaceId, managerId, employeeId, scheduledAt: new Date().toISOString() });
    const note = await addNote({ workspaceId, oneOnOneId: one.id, authorId: managerId, text: "Discussed goals" });
    expect(note.id).toBeTruthy();
    const detail = await getOneOnOneById({ workspaceId, oneOnOneId: one.id, managerId });
    expect(detail?.notes.length).toBe(1);
  });
});
