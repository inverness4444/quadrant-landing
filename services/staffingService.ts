import { buildAssignmentIndex } from "@/services/analyticsHelpers";
import { loadWorkspaceSkillSnapshot, getWorkspaceSkillMap } from "@/services/skillMapService";
import type {
  ProjectStaffingResult,
  ProjectStaffingSuggestion,
  RiskItem,
  SkillRequirement,
} from "@/services/types/analytics";

export async function suggestTeamForProject(
  workspaceId: string,
  requiredSkills: SkillRequirement[],
): Promise<ProjectStaffingResult> {
  if (requiredSkills.length === 0) {
    return { candidates: [], warnings: [] };
  }
  const snapshot = await loadWorkspaceSkillSnapshot(workspaceId);
  const skillMap = await getWorkspaceSkillMap(workspaceId);
  const assignmentIndex = buildAssignmentIndex(snapshot);
  const skillMetaById = new Map(snapshot.skills.map((skill) => [skill.id, skill]));
  const unknownSkill = requiredSkills.find((requirement) => !skillMetaById.has(requirement.skillId));
  if (unknownSkill) {
    throw new Error("SKILL_NOT_IN_WORKSPACE");
  }
  const resolvedRequirements = requiredSkills.map((requirement) => ({
    ...requirement,
    minLevel: clampLevel(requirement.minLevel ?? 3),
    weight: requirement.weight ?? 1,
    meta: skillMetaById.get(requirement.skillId)!,
  }));
  const totalWeight = resolvedRequirements.reduce((sum, requirement) => sum + (requirement.weight ?? 1), 0) || 1;
  const skillSummaryById = new Map(skillMap.skills.map((summary) => [summary.skillId, summary]));

  const candidates: ProjectStaffingSuggestion[] = snapshot.employees
    .map((employee) => {
      const assignments = assignmentIndex.get(employee.id) ?? [];
      const skillVector = new Map(assignments.map((assignment) => [assignment.skillId, assignment]));
      let fitAccumulator = 0;
      const matchingSkills: ProjectStaffingSuggestion["matchingSkills"] = [];
      const missingSkills: ProjectStaffingSuggestion["missingSkills"] = [];
      const riskFlags: string[] = [];
      for (const requirement of resolvedRequirements) {
        const skillEntry = skillVector.get(requirement.skillId);
        const weightShare = (requirement.weight ?? 1) / totalWeight;
        if (skillEntry) {
          const contribution = Math.min(skillEntry.skillLevel / requirement.minLevel, 1);
          fitAccumulator += contribution * weightShare;
          matchingSkills.push({
            skillId: requirement.skillId,
            name: requirement.meta.name,
            level: skillEntry.skillLevel,
            requiredLevel: requirement.minLevel,
            contribution: Math.round(contribution * weightShare * 100) / 100,
          });
          const summary = skillSummaryById.get(requirement.skillId);
          if (summary && summary.busFactor <= 2 && skillEntry.skillLevel >= requirement.minLevel) {
            const severityText =
              summary.busFactor <= 1 ? "единственный владелец" : `только ${summary.busFactor} человека`;
            riskFlags.push(`При выходе ${employee.name} останется ${severityText} по ${summary.name}`);
          }
        } else {
          missingSkills.push({
            skillId: requirement.skillId,
            name: requirement.meta.name,
            requiredLevel: requirement.minLevel,
          });
        }
      }
      const fitScore = Math.round(fitAccumulator * 100);
      if (fitScore === 0 && matchingSkills.length === 0) {
        return null;
      }
      return {
        employeeId: employee.id,
        name: employee.name,
        position: employee.position,
        level: employee.level,
        fitScore,
        matchingSkills,
        missingSkills,
        riskFlags,
        availability: "unknown", // TODO: подключить данные о загрузке / capacity, когда появится интеграция.
      };
    })
    .filter((candidate): candidate is ProjectStaffingSuggestion => Boolean(candidate))
    .sort((a, b) => b.fitScore - a.fitScore)
    .slice(0, 10);

  const warnings: RiskItem[] = [];
  for (const requirement of resolvedRequirements) {
    const summary = skillSummaryById.get(requirement.skillId);
    if (!summary || summary.busFactor > 1) continue;
    warnings.push({
      id: `staffing-${requirement.skillId}`,
      kind: "transition",
      severity: summary.busFactor <= 1 ? "high" : "medium",
      title: `Навык ${summary.name} нельзя изымать из текущей команды`,
      description:
        summary.busFactor === 0
          ? `Навык ${summary.name} пока не подтверждён ни у одного сотрудника`
          : summary.busFactor === 1
          ? `Только ${summary.keyHolders[0]?.name ?? "один человек"} владеет ${summary.name}`
          : `Навык ${summary.name} покрыт всего ${summary.busFactor} людьми`,
      metricValue: summary.busFactor,
      metricLabel: "bus factor",
      affectedSkills: [summary.skillId],
      affectedEmployees: summary.keyHolders.map((holder) => ({
        employeeId: holder.employeeId,
        name: holder.name,
        position: holder.position,
      })),
    });
  }

  return {
    candidates,
    warnings,
  };
}

function clampLevel(level: number) {
  if (Number.isNaN(level)) {
    return 3;
  }
  return Math.min(5, Math.max(1, Math.round(level)));
}
