import { db } from "@/lib/db";
import {
  artifactSkills,
  artifacts,
  employeeSkills,
  employees,
  integrations,
  invites,
  members,
  skills,
  trackLevels,
  tracks,
  users,
  workspaces,
  plans,
} from "@/drizzle/schema";

type ResetOptions = {
  includePlans?: boolean;
};

export async function resetWorkspaceData({ includePlans = false }: ResetOptions = {}) {
  await db.delete(artifactSkills).run();
  await db.delete(artifacts).run();
  await db.delete(employeeSkills).run();
  await db.delete(employees).run();
  await db.delete(integrations).run();
  await db.delete(invites).run();
  await db.delete(members).run();
  await db.delete(trackLevels).run();
  await db.delete(tracks).run();
  await db.delete(skills).run();
  await db.delete(workspaces).run();
  await db.delete(users).run();
  if (includePlans) {
    await db.delete(plans).run();
  }
}
