import { db } from "@/lib/db";
import {
  artifactAssignees,
  artifactSkills,
  artifacts,
  employeeSkills,
  employeeRoleAssignments,
  employeeSkillRatings,
  developmentGoalCheckins,
  developmentGoals,
  employees,
  integrations,
  invites,
  members,
  riskCases,
  notifications,
  pilotStepStatuses,
  pilotSteps,
  pilots,
  roleProfiles,
  roleProfileSkillRequirements,
  skills,
  trackLevels,
  tracks,
  users,
  workspaces,
  plans,
  onboardingStates,
} from "@/drizzle/schema";

type ResetOptions = {
  includePlans?: boolean;
};

export async function resetWorkspaceData({ includePlans = false }: ResetOptions = {}) {
  await safeDelete(onboardingStates);
  await safeDelete(pilotStepStatuses);
  await safeDelete(pilotSteps);
  await safeDelete(pilots);
  await safeDelete(artifactAssignees);
  await safeDelete(artifactSkills);
  await safeDelete(artifacts);
  await safeDelete(employeeSkills);
  await safeDelete(employeeSkillRatings);
  await safeDelete(developmentGoalCheckins);
  await safeDelete(developmentGoals);
  await safeDelete(employeeRoleAssignments);
  await safeDelete(roleProfileSkillRequirements);
  await safeDelete(roleProfiles);
  await safeDelete(employees);
  await safeDelete(riskCases);
  await safeDelete(notifications);
  await safeDelete(integrations);
  await safeDelete(invites);
  await safeDelete(members);
  await safeDelete(trackLevels);
  await safeDelete(tracks);
  await safeDelete(skills);
  if (includePlans) {
    await db.update(workspaces).set({ planId: null }).run();
  }
  await safeDelete(workspaces);
  await safeDelete(users);
  if (includePlans) {
    await safeDelete(plans);
  }
}

async function safeDelete(table: unknown) {
  try {
    await db.delete(table as never).run();
  } catch (error) {
    if (!(error instanceof Error) || !error.message.includes("no such table")) {
      throw error;
    }
  }
}
