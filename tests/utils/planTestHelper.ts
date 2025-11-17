import { ensureDefaultPlanSeeded } from "@/repositories/planRepository";

export async function ensureDefaultTestPlan() {
  return ensureDefaultPlanSeeded();
}
