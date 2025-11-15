import { and, count, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { employees, employeeSkills, skills, tracks } from "@/drizzle/schema";
import type { EmployeeLevel } from "@/drizzle/schema";

export type LevelDistributionItem = {
  level: EmployeeLevel;
  count: number;
  percentage: number;
};

export type OverviewMetrics = {
  employees: number;
  skills: number;
  tracks: number;
  averageSkillLevel: number;
  levelDistribution: LevelDistributionItem[];
};

const orderedLevels: EmployeeLevel[] = ["Junior", "Middle", "Senior"];

export async function getOverviewMetrics(workspaceId: string): Promise<OverviewMetrics> {
  const [employeeCountRow] = await db
    .select({ value: count() })
    .from(employees)
    .where(eq(employees.workspaceId, workspaceId));
  const employeeCount = Number(employeeCountRow?.value ?? 0);

  const [skillCountRow] = await db
    .select({ value: count() })
    .from(skills)
    .where(eq(skills.workspaceId, workspaceId));
  const skillCount = Number(skillCountRow?.value ?? 0);

  const [trackCountRow] = await db
    .select({ value: count() })
    .from(tracks)
    .where(eq(tracks.workspaceId, workspaceId));
  const trackCount = Number(trackCountRow?.value ?? 0);

  const skillAssignments = await db
    .select({
      level: employeeSkills.level,
    })
    .from(employeeSkills)
    .innerJoin(employees, eq(employeeSkills.employeeId, employees.id))
    .where(eq(employees.workspaceId, workspaceId));

  const averageSkillLevel =
    skillAssignments.length === 0
      ? 0
      : Math.round((skillAssignments.reduce((sum, entry) => sum + entry.level, 0) / skillAssignments.length) * 10) / 10;

  const levelDistribution = await Promise.all(
    orderedLevels.map(async (level) => {
    const [row] = await db
      .select({ value: count() })
      .from(employees)
    .where(and(eq(employees.workspaceId, workspaceId), eq(employees.level, level)));
    const total = Number(row?.value ?? 0);
    const percentage = employeeCount === 0 ? 0 : Math.round((total / employeeCount) * 100);
    return { level, count: total, percentage };
    }),
  );

  return {
    employees: employeeCount,
    skills: skillCount,
    tracks: trackCount,
    averageSkillLevel,
    levelDistribution,
  };
}
