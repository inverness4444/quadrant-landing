import type { SkillLevelScale } from "@/drizzle/schema";

export type EmployeeSkillSnapshot = {
  employeeId: string;
  employeeName: string;
  teamId?: string | null;
  teamName?: string | null;
  skillId: string;
  skillName: string;
  level: SkillLevelScale | null;
};

export type SkillGapForEmployee = {
  employeeId: string;
  employeeName: string;
  teamName?: string | null;
  skillId: string;
  skillName: string;
  currentLevel: SkillLevelScale | null;
  targetLevel: SkillLevelScale;
  delta: number;
  weight: number;
};

export type SkillGapAggregate = {
  skillId: string;
  skillName: string;
  avgDelta: number;
  maxDelta: number;
  affectedEmployeesCount: number;
};

export type ProfileMatchScore = {
  employeeId: string;
  employeeName: string;
  teamName?: string | null;
  profileId: string;
  profileName: string;
  matchPercent: number;
  coveragePercent: number;
  totalWeightedDelta: number;
};

export type ProfileWithItems = {
  id: string;
  name: string;
  description: string | null;
  roleCode: string | null;
  items: Array<{ id: string; skillId: string; skillName: string; targetLevel: number; weight: number }>;
};
