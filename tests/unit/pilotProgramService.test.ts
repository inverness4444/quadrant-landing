import { randomUUID } from "crypto";
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { employees } from "@/drizzle/schema";
import { createMember } from "@/repositories/memberRepository";
import { createUser } from "@/repositories/userRepository";
import { createWorkspace } from "@/repositories/workspaceRepository";
import { ensureDefaultTestPlan } from "@/tests/utils/planTestHelper";
import { resetWorkspaceData } from "@/tests/utils/dbCleaner";
import { createOrUpdatePilot, getPilotById, setPilotStatus, updatePilotParticipants } from "@/services/pilotProgramService";

describe("pilotProgramService", () => {
  let workspaceId: string;
  let userId: string;
  let employeeId: string;

  beforeEach(async () => {
    await resetWorkspaceData({ includePlans: true });
    const plan = await ensureDefaultTestPlan();
    const user = await createUser({ email: `pilot+${randomUUID()}@example.com`, passwordHash: "hash", name: "Pilot Owner" });
    userId = user.id;
    const ws = await createWorkspace({ name: "Pilot WS", ownerUserId: userId, planId: plan?.id });
    workspaceId = ws.id;
    await createMember({ userId, workspaceId, role: "owner" });
    employeeId = randomUUID();
    db.insert(employees)
      .values({
        id: employeeId,
        workspaceId,
        name: "Employee",
        position: "Dev",
        level: "Middle",
        primaryTrackId: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .run();
  });

  it("creates and updates pilot and status", async () => {
    const pilot = await createOrUpdatePilot({
      workspaceId,
      ownerId: userId,
      name: "Pilot A",
      description: "Desc",
      status: "draft",
    });
    expect(pilot.id).toBeTruthy();
    expect(pilot.status).toBe("draft");

    const updated = await createOrUpdatePilot({
      workspaceId,
      ownerId: userId,
      pilotId: pilot.id,
      name: "Pilot A+",
      description: "New",
      status: "planned",
    });
    expect(updated.name).toBe("Pilot A+");
    expect(updated.status).toBe("planned");

    const statusChanged = await setPilotStatus({ workspaceId, pilotId: pilot.id, status: "active" });
    expect(statusChanged.pilot.status).toBe("active");
  });

  it("syncs participants", async () => {
    const pilot = await createOrUpdatePilot({
      workspaceId,
      ownerId: userId,
      name: "Pilot B",
    });
    const saved = await updatePilotParticipants({ workspaceId, pilotId: pilot.id, employeeIds: [employeeId] });
    expect(saved.length).toBe(1);
    expect(saved[0]?.employeeId).toBe(employeeId);

    const removed = await updatePilotParticipants({ workspaceId, pilotId: pilot.id, employeeIds: [] });
    expect(removed.length).toBe(0);

    const detail = await getPilotById({ workspaceId, pilotId: pilot.id });
    expect(detail.participants.length).toBe(0);
  });
});
