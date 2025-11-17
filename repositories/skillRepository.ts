import { randomUUID } from "crypto";
import { asc, and, eq } from "drizzle-orm";
import { sql } from "drizzle-orm/sql";
import { db } from "@/lib/db";
import { skills } from "@/drizzle/schema";

const now = () => new Date().toISOString();

type SkillType = "hard" | "soft" | "product" | "data";

export type SkillListFilters = {
  page: number;
  pageSize: number;
  search?: string;
  type?: SkillType | "all";
};

export async function listSkills(workspaceId: string) {
  return db.select().from(skills).where(eq(skills.workspaceId, workspaceId)).orderBy(asc(skills.name));
}

export async function listSkillsPaginated(workspaceId: string, filters: SkillListFilters) {
  const page = Math.max(1, filters.page || 1);
  const pageSize = Math.min(100, Math.max(1, filters.pageSize || 20));
  let where = eq(skills.workspaceId, workspaceId);
  if (filters.type && filters.type !== "all") {
    const typeFilter = and(where, eq(skills.type, filters.type));
    if (typeFilter) {
      where = typeFilter;
    }
  }
  if (filters.search) {
    const term = `%${filters.search.toLowerCase()}%`;
    const searchFilter = and(where, sql`lower(${skills.name}) like ${term}`);
    if (searchFilter) {
      where = searchFilter;
    }
  }
  const [{ count }] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(skills)
    .where(where);
  const items = await db
    .select()
    .from(skills)
    .where(where)
    .orderBy(asc(skills.name))
    .limit(pageSize)
    .offset((page - 1) * pageSize);
  return {
    skills: items,
    total: Number(count ?? 0),
    page,
    pageSize,
  };
}

export async function createSkill(workspaceId: string, data: { name: string; type: SkillType }) {
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

export async function updateSkill(skillId: string, data: { name: string; type: SkillType }) {
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
