import { randomUUID } from "crypto";
import { describe, expect, it, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { employees, skills, tracks, integrations, invites } from "@/drizzle/schema";
import { createUser } from "@/repositories/userRepository";
import { createWorkspace } from "@/repositories/workspaceRepository";
import { createMember } from "@/repositories/memberRepository";
import {
  getOnboardingState,
  recomputeOnboardingState,
  type OnboardingStatePayload,
} from "@/services/onboardingService";
import { resetWorkspaceData } from "../utils/dbCleaner";
import { SESSION_COOKIE } from "@/lib/session";
import { GET } from "@/app/api/app/onboarding/route";

async function createWorkspaceWithOwner() {
  const user = await createUser({
    email: `owner-${randomUUID()}@example.com`,
    passwordHash: "hash",
    name: "Owner",
  });
  const workspace = await createWorkspace({
    name: `Workspace ${Date.now()}`,
    ownerUserId: user.id,
  });
  await createMember({
    userId: user.id,
    workspaceId: workspace.id,
    role: "owner",
  });
  return { user, workspace };
}

describe("onboarding service", () => {
  beforeEach(async () => {
    await resetWorkspaceData({ includePlans: false });
  });

  it("creates default state when none exists", async () => {
    const { workspace } = await createWorkspaceWithOwner();
    const state = await getOnboardingState(workspace.id);
    expect(state.isCompleted).toBe(false);
    expect(state.steps).toEqual({
      invitedMembers: false,
      createdEmployee: false,
      createdSkill: false,
      createdTrack: false,
      connectedIntegration: false,
    });
  });

  it("recompute marks all steps as complete when data is present", async () => {
    const { workspace } = await createWorkspaceWithOwner();
    const timestamp = new Date().toISOString();
    await db
      .insert(employees)
      .values({
        id: randomUUID(),
        workspaceId: workspace.id,
        name: "Engineer",
        position: "Backend",
        level: "Middle",
        createdAt: timestamp,
        updatedAt: timestamp,
      })
      .run();
    await db
      .insert(skills)
      .values({
        id: randomUUID(),
        workspaceId: workspace.id,
        name: "TypeScript",
        type: "hard",
        createdAt: timestamp,
        updatedAt: timestamp,
      })
      .run();
    await db
      .insert(tracks)
      .values({
        id: randomUUID(),
        workspaceId: workspace.id,
        name: "Engineering",
        createdAt: timestamp,
        updatedAt: timestamp,
      })
      .run();
    await db
      .insert(integrations)
      .values({
        id: randomUUID(),
        workspaceId: workspace.id,
        type: "github",
        status: "connected",
        config: "{}",
        createdAt: timestamp,
        updatedAt: timestamp,
      })
      .run();
    await db
      .insert(invites)
      .values({
        id: randomUUID(),
        workspaceId: workspace.id,
        email: `invite-${randomUUID()}@example.com`,
        role: "member",
        token: randomUUID(),
        status: "pending",
        expiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
        createdAt: timestamp,
        updatedAt: timestamp,
      })
      .run();
    const collaborator = await createUser({
      email: `member-${randomUUID()}@example.com`,
      passwordHash: "hash",
      name: "Member",
    });
    await createMember({
      userId: collaborator.id,
      workspaceId: workspace.id,
      role: "member",
    });

    const state = await recomputeOnboardingState(workspace.id);
    expect(state.isCompleted).toBe(true);
    expect(Object.values(state.steps).every(Boolean)).toBe(true);
  });

  it("API GET returns onboarding state for authenticated member", async () => {
    const { user, workspace } = await createWorkspaceWithOwner();
    const request = new NextRequest(new URL("http://localhost/api/app/onboarding"), {
      headers: {
        cookie: `${SESSION_COOKIE}=${user.id}`,
      },
    });
    const response = await GET(request);
    expect(response.status).toBe(200);
    const payload = (await response.json()) as OnboardingStatePayload;
    expect(payload.workspaceId).toBe(workspace.id);
    expect(payload.steps.createdEmployee).toBe(false);
  });

  it("API GET requires authentication", async () => {
    const request = new NextRequest(new URL("http://localhost/api/app/onboarding"));
    const response = await GET(request);
    expect(response.status).toBe(401);
  });
});
