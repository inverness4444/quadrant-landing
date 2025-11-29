import { randomUUID } from "crypto";
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { employees, employeeSkills, skillRoleProfileItems, skillRoleProfiles, skills, tracks } from "@/drizzle/schema";
import { createUser } from "@/repositories/userRepository";
import { createWorkspace } from "@/repositories/workspaceRepository";
import { ensureDefaultTestPlan } from "@/tests/utils/planTestHelper";
import { resetWorkspaceData } from "@/tests/utils/dbCleaner";
import {
  aggregateSkillGaps,
  computeProfileMatchScores,
  getEmployeeSkillSnapshots,
  getProfileGapsForTeam,
} from "@/services/skillsAnalyticsService";

async function seedWorkspace() {
  const plan = await ensureDefaultTestPlan();
  const user = await createUser({ email: `skills+${randomUUID()}@example.com`, passwordHash: "hash", name: "Skills" });
  const workspace = await createWorkspace({ name: "Skills WS", ownerUserId: user.id, size: "10-50", planId: plan?.id });
  return { workspaceId: workspace.id };
}

describe("skillsAnalyticsService", () => {
  beforeEach(async () => {
    await resetWorkspaceData({ includePlans: true });
  });

  it("aggregates gaps", () => {
    const result = aggregateSkillGaps({
      gaps: [
        { employeeId: "e1", employeeName: "A", teamName: null, skillId: "s1", skillName: "JS", currentLevel: 2, targetLevel: 4, delta: 2, weight: 1 },
        { employeeId: "e2", employeeName: "B", teamName: null, skillId: "s1", skillName: "JS", currentLevel: 1, targetLevel: 4, delta: 3, weight: 1 },
      ],
    });
    expect(result[0]?.avgDelta).toBeCloseTo(2.5);
    expect(result[0]?.affectedEmployeesCount).toBe(2);
  });

  it("returns gaps for team", async () => {
    const { workspaceId } = await seedWorkspace();
    const trackId = randomUUID();
    db.insert(tracks)
      .values({ id: trackId, workspaceId, name: "Team A", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
      .run();
    const skillId = randomUUID();
    db.insert(skills)
      .values({ id: skillId, workspaceId, name: "Golang", type: "hard", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
      .run();
    const employeeId = randomUUID();
    db.insert(employees)
      .values({
        id: employeeId,
        workspaceId,
        name: "Dev",
        position: "Backend",
        level: "Middle",
        primaryTrackId: trackId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .run();
    db.insert(employeeSkills)
      .values({ employeeId, skillId, level: 2 })
      .run();
    const profileId = randomUUID();
    db.insert(skillRoleProfiles)
      .values({
        id: profileId,
        workspaceId,
        name: "Senior Backend",
        description: null,
        roleCode: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .run();
    db.insert(skillRoleProfileItems)
      .values({ id: randomUUID(), profileId, skillId, targetLevel: 4, weight: 1 })
      .run();

    const gaps = await getProfileGapsForTeam({ workspaceId, profileId, teamId: trackId });
    expect(gaps.length).toBe(1);
    expect(gaps[0]?.delta).toBe(2);
  });

  it("computes match scores", async () => {
    const { workspaceId } = await seedWorkspace();
    const trackId = randomUUID();
    db.insert(tracks)
      .values({ id: trackId, workspaceId, name: "Team B", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
      .run();
    const skillId = randomUUID();
    db.insert(skills)
      .values({ id: skillId, workspaceId, name: "React", type: "hard", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
      .run();
    const employeeId = randomUUID();
    db.insert(employees)
      .values({
        id: employeeId,
        workspaceId,
        name: "FE Dev",
        position: "Frontend",
        level: "Middle",
        primaryTrackId: trackId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .run();
    db.insert(employeeSkills)
      .values({ employeeId, skillId, level: 4 })
      .run();
    const profileId = randomUUID();
    db.insert(skillRoleProfiles)
      .values({ id: profileId, workspaceId, name: "Senior FE", description: null, roleCode: null, createdAt: new Date(), updatedAt: new Date() })
      .run();
    db.insert(skillRoleProfileItems)
      .values({ id: randomUUID(), profileId, skillId, targetLevel: 4, weight: 1 })
      .run();

    const scores = await computeProfileMatchScores({ workspaceId, profileId, teamId: trackId });
    expect(scores.length).toBe(1);
    expect(scores[0]?.matchPercent).toBe(100);
  });

  it("returns snapshots", async () => {
    const { workspaceId } = await seedWorkspace();
    const trackId = randomUUID();
    db.insert(tracks)
      .values({ id: trackId, workspaceId, name: "Team C", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
      .run();
    const skillId = randomUUID();
    db.insert(skills)
      .values({ id: skillId, workspaceId, name: "SQL", type: "hard", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
      .run();
    const employeeId = randomUUID();
    db.insert(employees)
      .values({
        id: employeeId,
        workspaceId,
        name: "Data",
        position: "Data",
        level: "Middle",
        primaryTrackId: trackId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .run();
    db.insert(employeeSkills)
      .values({ employeeId, skillId, level: 3 })
      .run();

    const snapshots = await getEmployeeSkillSnapshots({ workspaceId, teamId: trackId });
    expect(snapshots.length).toBe(1);
    expect(snapshots[0]?.skillName).toBe("SQL");
  });
});
