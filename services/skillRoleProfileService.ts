import { and, eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import { db } from "@/lib/db";
import { skillRoleProfileItems, skillRoleProfiles, skills } from "@/drizzle/schema";

export type SkillRoleProfileDTO = {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
  roleCode: string | null;
  items: Array<{ id: string; skillId: string; skillName: string; targetLevel: number; weight: number }>;
};

export async function listSkillRoleProfiles(workspaceId: string): Promise<SkillRoleProfileDTO[]> {
  const profiles = await db.select().from(skillRoleProfiles).where(eq(skillRoleProfiles.workspaceId, workspaceId));
  const items = await db
    .select({
      id: skillRoleProfileItems.id,
      profileId: skillRoleProfileItems.profileId,
      skillId: skillRoleProfileItems.skillId,
      targetLevel: skillRoleProfileItems.targetLevel,
      weight: skillRoleProfileItems.weight,
      skillName: skills.name,
    })
    .from(skillRoleProfileItems)
    .innerJoin(skills, eq(skillRoleProfileItems.skillId, skills.id));
  const grouped = new Map<string, SkillRoleProfileDTO["items"]>();
  items.forEach((item) => {
    const arr = grouped.get(item.profileId) ?? [];
    arr.push({
      id: item.id,
      skillId: item.skillId,
      skillName: item.skillName,
      targetLevel: item.targetLevel,
      weight: item.weight,
    });
    grouped.set(item.profileId, arr);
  });
  return profiles.map((profile) => ({
    ...profile,
    description: profile.description ?? null,
    roleCode: profile.roleCode ?? null,
    items: grouped.get(profile.id) ?? [],
  }));
}

export async function upsertSkillRoleProfile(input: {
  workspaceId: string;
  id?: string;
  name: string;
  description?: string | null;
  roleCode?: string | null;
  items: Array<{ skillId: string; targetLevel: number; weight: number }>;
}): Promise<SkillRoleProfileDTO> {
  const profileId = input.id ?? randomUUID();
  const now = new Date();
  const existing = await db.query.skillRoleProfiles.findFirst({
    where: and(eq(skillRoleProfiles.id, profileId), eq(skillRoleProfiles.workspaceId, input.workspaceId)),
  });
  if (existing) {
    db.update(skillRoleProfiles)
      .set({
        name: input.name,
        description: input.description ?? null,
        roleCode: input.roleCode ?? null,
        updatedAt: now,
      })
      .where(eq(skillRoleProfiles.id, profileId))
      .run();
    db.delete(skillRoleProfileItems).where(eq(skillRoleProfileItems.profileId, profileId)).run();
  } else {
    db.insert(skillRoleProfiles)
      .values({
        id: profileId,
        workspaceId: input.workspaceId,
        name: input.name,
        description: input.description ?? null,
        roleCode: input.roleCode ?? null,
        createdAt: now,
        updatedAt: now,
      })
      .run();
  }
  for (const item of input.items) {
    db.insert(skillRoleProfileItems)
      .values({
        id: randomUUID(),
        profileId,
        skillId: item.skillId,
        targetLevel: item.targetLevel,
        weight: item.weight,
      })
      .run();
  }
  const profiles = await listSkillRoleProfiles(input.workspaceId);
  const profile = profiles.find((p) => p.id === profileId);
  if (!profile) throw new Error("FAILED_TO_SAVE_PROFILE");
  return profile;
}
