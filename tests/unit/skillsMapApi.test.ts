/* eslint-disable @typescript-eslint/no-explicit-any */
import { randomUUID } from "crypto";
import { NextRequest } from "next/server";
import { describe, expect, it, beforeEach } from "vitest";
import { SESSION_COOKIE } from "@/lib/session";
import { db } from "@/lib/db";
import { employees, employeeSkills, skills, skillRoleProfileItems, skillRoleProfiles, tracks } from "@/drizzle/schema";
import { createUser } from "@/repositories/userRepository";
import { createWorkspace } from "@/repositories/workspaceRepository";
import { createMember } from "@/repositories/memberRepository";
import { ensureDefaultTestPlan } from "@/tests/utils/planTestHelper";
import { resetWorkspaceData } from "@/tests/utils/dbCleaner";

async function seedWorkspace() {
  const plan = await ensureDefaultTestPlan();
  const user = await createUser({ email: `skillsmap+${randomUUID()}@example.com`, passwordHash: "hash", name: "SkillsMap" });
  const workspace = await createWorkspace({ name: "SkillsMap WS", ownerUserId: user.id, planId: plan?.id });
  await createMember({ userId: user.id, workspaceId: workspace.id, role: "owner" });
  return { user, workspace };
}

describe("skills map API", () => {
  beforeEach(async () => {
    await resetWorkspaceData({ includePlans: true });
  });

  it("returns snapshots without profile", async () => {
    const { user, workspace } = await seedWorkspace();
    const trackId = randomUUID();
    db.insert(tracks)
      .values({ id: trackId, workspaceId: workspace.id, name: "Team", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
      .run();
    const skillId = randomUUID();
    db.insert(skills)
      .values({ id: skillId, workspaceId: workspace.id, name: "JS", type: "hard", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
      .run();
    const employeeId = randomUUID();
    db.insert(employees)
      .values({
        id: employeeId,
        workspaceId: workspace.id,
        name: "Dev",
        position: "Frontend",
        level: "Middle",
        primaryTrackId: trackId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .run();
    db.insert(employeeSkills)
      .values({ employeeId, skillId, level: 3 })
      .run();

    const { GET } = await import("@/app/api/app/skills/map/route");
    const request = new NextRequest(new URL("http://localhost/api/app/skills/map"));
    request.cookies.set(SESSION_COOKIE, user.id);
    const response = await GET(request);
    expect(response.status).toBe(200);
    const json = (await response.json()) as any;
    expect(json.ok).toBe(true);
    expect(json.snapshots?.length).toBeGreaterThan(0);
  });

  it("returns gaps with profile", async () => {
    const { user, workspace } = await seedWorkspace();
    const trackId = randomUUID();
    db.insert(tracks)
      .values({ id: trackId, workspaceId: workspace.id, name: "Team", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
      .run();
    const skillId = randomUUID();
    db.insert(skills)
      .values({ id: skillId, workspaceId: workspace.id, name: "SQL", type: "hard", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
      .run();
    const employeeId = randomUUID();
    db.insert(employees)
      .values({
        id: employeeId,
        workspaceId: workspace.id,
        name: "Analyst",
        position: "Data",
        level: "Middle",
        primaryTrackId: trackId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .run();
    db.insert(employeeSkills)
      .values({ employeeId, skillId, level: 1 })
      .run();
    const profileId = randomUUID();
    db.insert(skillRoleProfiles)
      .values({ id: profileId, workspaceId: workspace.id, name: "Data Senior", description: null, roleCode: null, createdAt: new Date(), updatedAt: new Date() })
      .run();
    db.insert(skillRoleProfileItems)
      .values({ id: randomUUID(), profileId, skillId, targetLevel: 4, weight: 1 })
      .run();

    const { GET } = await import("@/app/api/app/skills/map/route");
    const request = new NextRequest(new URL(`http://localhost/api/app/skills/map?profileId=${profileId}&teamId=${trackId}`));
    request.cookies.set(SESSION_COOKIE, user.id);
    const response = await GET(request);
    const json = (await response.json()) as any;
    expect(response.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.profileGaps?.length).toBeGreaterThan(0);
    expect(json.gapAggregates?.length).toBeGreaterThan(0);
  });
});
