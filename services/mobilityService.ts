import { buildAssignmentIndex } from "@/services/analyticsHelpers";
import { loadWorkspaceSkillSnapshot } from "@/services/skillMapService";
import type { GrowthPathSuggestion, ReplacementCandidate } from "@/services/types/analytics";

const levelWeight: Record<"Junior" | "Middle" | "Senior", number> = {
  Junior: 0,
  Middle: 1,
  Senior: 2,
};

type GrowthTemplate = {
  id: string;
  title: string;
  requirements: Array<{ skillName: string; level: number }>;
  recommendations: (missing: GrowthPathSuggestion["missingSkills"]) => string[];
};

// TODO: заменить статические профили реальными данными из ролевых матриц, когда подключим интеграции.
const growthTemplates: GrowthTemplate[] = [
  {
    id: "backend-lead",
    title: "Lead Backend Engineer",
    requirements: [
      { skillName: "Golang", level: 4 },
      { skillName: "System Design", level: 4 },
      { skillName: "Leadership", level: 3 },
    ],
    recommendations: (missing) => [
      "Возьмите инициативу по архитектуре ключевого сервиса",
      ...missing.map((item) => `Прокачать ${item.name} до уровня ${item.targetLevel}`),
    ],
  },
  {
    id: "product-lead",
    title: "Product Lead",
    requirements: [
      { skillName: "Product Discovery", level: 4 },
      { skillName: "Data Analysis", level: 4 },
      { skillName: "Storytelling", level: 3 },
    ],
    recommendations: (missing) => [
      "Соберите кросс-функциональную команду для пилота",
      ...missing.map((item) => `Добавить опыт с компетенцией «${item.name}»`),
    ],
  },
  {
    id: "platform-architect",
    title: "Platform Architect",
    requirements: [
      { skillName: "Kubernetes", level: 4 },
      { skillName: "AWS", level: 4 },
      { skillName: "Leadership", level: 3 },
    ],
    recommendations: (missing) => [
      "Вести техради и обзоры архитектуры",
      ...missing.map((item) => `Назначить проект с фокусом на ${item.name}`),
    ],
  },
];

export async function findPotentialReplacements(
  workspaceId: string,
  employeeId: string,
  limit = 5,
): Promise<ReplacementCandidate[]> {
  const snapshot = await loadWorkspaceSkillSnapshot(workspaceId);
  const employeeMap = new Map(snapshot.employees.map((employee) => [employee.id, employee]));
  const target = employeeMap.get(employeeId);
  if (!target) {
    return [];
  }
  const assignmentsByEmployee = buildAssignmentIndex(snapshot);
  const targetAssignments = assignmentsByEmployee.get(employeeId) ?? [];
  const targetSkillMap = new Map(targetAssignments.map((assignment) => [assignment.skillId, assignment]));
  const targetSkillWeight =
    targetAssignments.reduce((sum, assignment) => sum + assignment.skillLevel, 0) || targetAssignments.length || 1;
  const maxArtifacts = Math.max(...snapshot.employees.map((employee) => snapshot.artifactCountByEmployee.get(employee.id) ?? 0), 0);

  if (targetAssignments.length === 0) {
    return snapshot.employees
      .filter((candidate) => candidate.id !== employeeId)
      .map<ReplacementCandidate>((candidate) => {
        const levelDiff = Math.abs(levelWeight[target.level] - levelWeight[candidate.level]);
        const readiness = levelWeight[candidate.level] >= levelWeight[target.level] ? "ready" : "stretch";
        const artifactEvidence = snapshot.artifactCountByEmployee.get(candidate.id) ?? 0;
        const similarityScore = Math.round((Math.max(0.6, 1 - levelDiff * 0.3) * 100));
        return {
          employeeId: candidate.id,
          name: candidate.name,
          position: candidate.position,
          level: candidate.level,
          similarityScore,
          readiness,
          overlapScore: 0,
          sharedSkills: [],
          missingSkills: [],
          artifactEvidence,
        };
      })
      .sort((a, b) => b.similarityScore - a.similarityScore)
      .slice(0, Math.max(1, limit));
  }

  const candidates: ReplacementCandidate[] = snapshot.employees
    .filter((candidate) => candidate.id !== employeeId)
    .map((candidate) => {
      const candidateAssignments = assignmentsByEmployee.get(candidate.id) ?? [];
      const candidateSkillMap = new Map(candidateAssignments.map((assignment) => [assignment.skillId, assignment]));
      const sharedSkills = candidateAssignments.filter((assignment) => targetSkillMap.has(assignment.skillId));
      if (sharedSkills.length === 0) {
        return null;
      }
      const sharedDetails = sharedSkills.map((assignment) => {
        const targetSkill = targetSkillMap.get(assignment.skillId)!;
        return {
          skillId: assignment.skillId,
          name: assignment.skillName,
          level: assignment.skillLevel,
          targetLevel: targetSkill.skillLevel,
          overlap: Math.min(assignment.skillLevel, targetSkill.skillLevel),
        };
      });
      const overlapValue = sharedDetails.reduce((sum, detail) => sum + detail.overlap, 0);
      const overlapScoreRaw = overlapValue / targetSkillWeight;
      const overlapScore = Math.max(0, Math.min(1, overlapScoreRaw));
      const levelDiff = Math.abs(levelWeight[target.level] - levelWeight[candidate.level]);
      const levelScore = Math.max(0.6, 1 - levelDiff * 0.2);
      const artifactEvidence = snapshot.artifactCountByEmployee.get(candidate.id) ?? 0;
      const artifactScore = maxArtifacts === 0 ? 0.5 : artifactEvidence / maxArtifacts;
      const similarityScore = Math.round((overlapScore * 0.7 + levelScore * 0.2 + artifactScore * 0.1) * 100);
      const readiness = overlapScore >= 0.7 && levelWeight[candidate.level] >= levelWeight[target.level] ? "ready" : "stretch";
      const missingSkills = targetAssignments
        .filter((assignment) => {
          const candidateSkill = candidateSkillMap.get(assignment.skillId);
          if (!candidateSkill) return true;
          return candidateSkill.skillLevel < assignment.skillLevel - 1;
        })
        .map((assignment) => ({
          skillId: assignment.skillId,
          name: assignment.skillName,
          targetLevel: assignment.skillLevel,
        }));
      return {
        employeeId: candidate.id,
        name: candidate.name,
        position: candidate.position,
        level: candidate.level,
        similarityScore,
        readiness,
        overlapScore: Math.round(overlapScore * 100) / 100,
        sharedSkills: sharedDetails.map(({ overlap, ...rest }) => {
          void overlap;
          return rest;
        }),
        missingSkills,
        artifactEvidence,
      };
    })
    .filter((candidate): candidate is ReplacementCandidate => Boolean(candidate))
    .sort((a, b) => b.similarityScore - a.similarityScore)
    .slice(0, Math.max(1, limit));

  return candidates;
}

export async function suggestGrowthPaths(
  workspaceId: string,
  employeeId: string,
  limit = 3,
): Promise<GrowthPathSuggestion[]> {
  const snapshot = await loadWorkspaceSkillSnapshot(workspaceId);
  const employee = snapshot.employees.find((item) => item.id === employeeId);
  if (!employee) {
    return [];
  }
  const skillByName = new Map(snapshot.skills.map((skill) => [skill.name.toLowerCase(), skill]));
  const assignmentsByEmployee = buildAssignmentIndex(snapshot);
  const employeeAssignments = assignmentsByEmployee.get(employeeId) ?? [];
  const levelBySkillId = new Map(employeeAssignments.map((assignment) => [assignment.skillId, assignment.skillLevel]));

  const suggestions: GrowthPathSuggestion[] = [];
  for (const template of growthTemplates) {
    const requirements = template.requirements
      .map((requirement) => {
        const skill = skillByName.get(requirement.skillName.toLowerCase());
        return {
          skillId: skill?.id ?? null,
          name: requirement.skillName,
          targetLevel: requirement.level,
        };
      })
      .filter((requirement) => requirement.skillId !== null);
    if (requirements.length === 0) continue;
    const missingSkills = requirements
      .filter((requirement) => {
        const currentLevel = levelBySkillId.get(requirement.skillId!);
        return !currentLevel || currentLevel < requirement.targetLevel;
      })
      .map((requirement) => ({
        skillId: requirement.skillId,
        name: requirement.name,
        currentLevel: levelBySkillId.get(requirement.skillId!) ?? null,
        targetLevel: requirement.targetLevel,
      }));
    const coverage = 1 - missingSkills.length / requirements.length;
    const readinessScore = Math.max(0, Math.min(1, coverage));
    suggestions.push({
      targetRoleId: template.id,
      targetRoleName: template.title,
      readinessScore,
      missingSkills,
      recommendedActions: template.recommendations(missingSkills),
    });
  }

  return suggestions.sort((a, b) => b.readinessScore - a.readinessScore).slice(0, Math.max(1, limit));
}
