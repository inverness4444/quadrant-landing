import { loadWorkspaceSkillSnapshot, getWorkspaceSkillMap } from "@/services/skillMapService";
import type { EmployeeRiskProfile, RiskItem } from "@/services/types/analytics";
import { ensureRiskCase } from "@/services/riskCenterService";
import { findWorkspaceById } from "@/repositories/workspaceRepository";
import type { RiskLevel } from "@/drizzle/schema";
import { logger } from "@/services/logger";

export async function getWorkspaceRiskOverview(workspaceId: string, limit = 5): Promise<RiskItem[]> {
  const skillMap = await getWorkspaceSkillMap(workspaceId);
  const risks: RiskItem[] = [];

  for (const skill of skillMap.skills) {
    const artifactLoad = skill.artifactCount ?? 0;
    if (skill.busFactor <= 2) {
      const owners = skill.keyHolders;
      const ownerNames = owners.map((owner) => owner.name).join(", ");
      const baseDescription =
        skill.busFactor <= 1
          ? `Только ${ownerNames || "один человек"} владеет навыком ${skill.name}`
          : `Всего ${skill.busFactor} человека владеют ${skill.name}`;
      const artifactNote =
        artifactLoad > 0 ? ` По этому навыку уже ${artifactLoad} артефактов в работе.` : "";
      risks.push({
        id: `skill-${skill.skillId}`,
        kind: "skill",
        severity: skill.busFactor <= 1 ? "high" : "medium",
        title: `Навык ${skill.name} под угрозой`,
        description: `${baseDescription}${artifactNote}`,
        metricValue: skill.busFactor,
        metricLabel: "bus factor",
        affectedSkills: [skill.skillId],
        affectedEmployees: owners.map((owner) => ({
          employeeId: owner.employeeId,
          name: owner.name,
          position: owner.position,
        })),
      });
    } else if (skill.coverage < 20) {
      risks.push({
        id: `coverage-${skill.skillId}`,
        kind: "bus_factor",
        severity: "medium",
        title: `Недостаточное покрытие навыком ${skill.name}`,
        description: `Только ${skill.coverage}% команды владеет ${skill.name}`,
        metricValue: skill.coverage,
        metricLabel: "% сотрудников",
        affectedSkills: [skill.skillId],
        affectedEmployees: skill.keyHolders.map((owner) => ({
          employeeId: owner.employeeId,
          name: owner.name,
          position: owner.position,
        })),
      });
    }
    if (skill.coverage < 30 && artifactLoad >= 6) {
      risks.push({
        id: `load-${skill.skillId}`,
        kind: "workload",
        severity: "medium",
        title: `Навык ${skill.name} перегружен задачами`,
        description: `По ${skill.name} ведётся ${artifactLoad} активных артефактов при покрытии ${skill.peopleCount} человек.`,
        metricValue: artifactLoad,
        metricLabel: "artifacts",
        affectedSkills: [skill.skillId],
        affectedEmployees: skill.keyHolders.map((owner) => ({
          employeeId: owner.employeeId,
          name: owner.name,
          position: owner.position,
        })),
      });
    }
  }

  const exclusiveOwnership = new Map<string, string[]>();
  for (const risk of risks.filter((item) => item.kind === "skill" && item.metricValue === 1)) {
    for (const employee of risk.affectedEmployees) {
      const list = exclusiveOwnership.get(employee.employeeId) ?? [];
      list.push(risk.affectedSkills?.[0] ?? "");
      exclusiveOwnership.set(employee.employeeId, list);
    }
  }
  for (const [employeeId, skillIds] of exclusiveOwnership.entries()) {
    const count = skillIds.length;
    const owner = risks
      .flatMap((item) => item.affectedEmployees)
      .find((employee) => employee.employeeId === employeeId);
    if (!owner || count === 0) continue;
    risks.push({
      id: `owner-${employeeId}`,
      kind: "bus_factor",
      severity: count >= 2 ? "high" : "medium",
      title: `${owner.name} держит ${count} критичных навыков`,
      description: "Если этот человек уйдёт, команда потеряет несколько критичных компетенций",
      metricValue: count,
      metricLabel: "critical skills",
      affectedSkills: skillIds,
      affectedEmployees: [owner],
    });
  }

  const topRisks = [...risks]
    .sort((a, b) => severityWeight(b.severity) - severityWeight(a.severity) || (b.metricValue ?? 0) - (a.metricValue ?? 0))
    .slice(0, Math.max(1, limit));
  void autoCreateRiskCases(workspaceId, topRisks);
  return topRisks;
}

export async function getEmployeeRiskProfile(
  workspaceId: string,
  employeeId: string,
): Promise<EmployeeRiskProfile | null> {
  const snapshot = await loadWorkspaceSkillSnapshot(workspaceId);
  const employee = snapshot.employees.find((item) => item.id === employeeId);
  if (!employee) {
    return null;
  }
  const assignments = snapshot.assignments.filter((row) => row.employeeId === employeeId);
  const assignmentsBySkill = new Map<string, { owners: Set<string>; name: string }>();
  for (const assignment of snapshot.assignments) {
    const stat = assignmentsBySkill.get(assignment.skillId) ?? { owners: new Set<string>(), name: assignment.skillName };
    stat.owners.add(assignment.employeeId);
    assignmentsBySkill.set(assignment.skillId, stat);
  }
  const employeeMap = new Map(snapshot.employees.map((item) => [item.id, item]));
  const riskItems: RiskItem[] = [];
  for (const assignment of assignments) {
    const stat = assignmentsBySkill.get(assignment.skillId);
    const ownersCount = stat?.owners.size ?? 0;
    if (ownersCount <= 0) continue;
    if (ownersCount > 2) continue;
    const severity = ownersCount === 1 ? "high" : "medium";
    riskItems.push({
      id: `employee-${employeeId}-${assignment.skillId}`,
      kind: "bus_factor",
      severity,
      title: `Навык ${assignment.skillName} зависит от ${employee.name}`,
      description:
        ownersCount === 1
          ? `${employee.name} единственный владеет ${assignment.skillName}`
          : `Навык ${assignment.skillName} покрыт только ${ownersCount} людьми`,
      metricValue: ownersCount,
      metricLabel: "bus factor",
      affectedSkills: [assignment.skillId],
      affectedEmployees: Array.from(stat?.owners ?? []).map((ownerId) => {
        const owner = employeeMap.get(ownerId);
        return {
          employeeId: ownerId,
          name: owner?.name ?? "Сотрудник",
          position: owner?.position ?? "",
        };
      }),
    });
  }
  const riskScore = riskItems.reduce((sum, item) => sum + severityWeight(item.severity) * 10, 0);
  void autoCreateRiskCases(workspaceId, riskItems);
  return {
    employeeId: employee.id,
    name: employee.name,
    position: employee.position,
    level: employee.level,
    riskScore,
    criticalSkills: riskItems,
  };
}

function severityWeight(severity: RiskItem["severity"]) {
  if (severity === "high") return 3;
  if (severity === "medium") return 2;
  return 1;
}

async function autoCreateRiskCases(workspaceId: string, risks: RiskItem[]) {
  if (risks.length === 0) return;
  const workspace = await findWorkspaceById(workspaceId);
  const ownerUserId = workspace?.ownerUserId;
  for (const risk of risks) {
    const level: RiskLevel = risk.severity === "high" ? "high" : "medium";
    for (const employee of risk.affectedEmployees) {
      try {
        await ensureRiskCase({
          workspaceId,
          employeeId: employee.employeeId,
          level,
          source: "engine",
          title: risk.title,
          reason: risk.description,
          recommendation: recommendationFromRisk(risk),
          ownerUserId: ownerUserId ?? undefined,
        });
      } catch (error) {
        logger.warn("risk_case_auto_create_failed", {
          workspaceId,
          employeeId: employee.employeeId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }
}

function recommendationFromRisk(risk: RiskItem) {
  if (risk.kind === "workload") {
    return "Перераспределите нагрузку и убедитесь, что ключевые задачи покрыты другими коллегами.";
  }
  if (risk.kind === "bus_factor" || risk.kind === "skill") {
    return "Назначьте напарника и запустите пилот/квест для передачи знаний по критичным навыкам.";
  }
  return "Назначьте 1:1 и сформируйте план снижения риска с руководителем.";
}
