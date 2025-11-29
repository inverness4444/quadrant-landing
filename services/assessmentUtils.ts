import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { employees } from "@/drizzle/schema";

export async function resolveEmployeeForWorkspace(workspaceId: string, name: string | null) {
  if (name) {
    const found = await db.query.employees.findFirst({
      where: and(eq(employees.workspaceId, workspaceId), eq(employees.name, name)),
    });
    if (found) return found;
  }
  return db.query.employees.findFirst({ where: eq(employees.workspaceId, workspaceId) });
}
