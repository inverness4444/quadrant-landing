import { randomUUID } from "crypto";
import { asc, and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { skills } from "@/drizzle/schema";

const now = () => new Date().toISOString();

export async function listSkills(workspaceId: string) {
  return db.select().from(skills).where(eq(skills.workspaceId, workspaceId)).orderBy(asc(skills.name));
}

export async function createSkill(workspaceId: string, data: { name: string; type: string }) {
  const id = randomUUID();
  const timestamp = now();
  db.insert(skills)
    .values({
      id,
      workspaceId,
      name: data.name,
      type: data.type,
      createdAt: timestamp,
      updatedAt: timestamp,
    })
    .run();
  return { id, workspaceId, name: data.name, type: data.type, createdAt: timestamp, updatedAt: timestamp };
}

export async function updateSkill(skillId: string, data: { name: string; type: string }) {
  const timestamp = now();
  db.update(skills)
    .set({
      name: data.name,
      type: data.type,
      updatedAt: timestamp,
    })
    .where(eq(skills.id, skillId))
    .run();
  return findSkillById(skillId);
}

export async function findSkillById(skillId: string) {
  const [skill] = await db.select().from(skills).where(eq(skills.id, skillId));
  return skill ?? null;
}

export async function deleteSkill(skillId: string) {
  await db.delete(skills).where(eq(skills.id, skillId));
}
