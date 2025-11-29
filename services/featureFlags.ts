import { config } from "@/services/config";

type FeatureFlagKey =
  | "feedbackEnabled"
  | "analyticsEnabled"
  | "pilotsEnabled"
  | "quarterlyReportsEnabled"
  | "oneOnOnesEnabled";

const defaultFlags: Record<FeatureFlagKey, boolean> = {
  feedbackEnabled: true,
  analyticsEnabled: true,
  pilotsEnabled: true,
  quarterlyReportsEnabled: true,
  oneOnOnesEnabled: true,
};

export function isFeatureEnabled(flag: FeatureFlagKey) {
  const envValue = config.featureFlags[flag];
  if (typeof envValue === "boolean") return envValue;
  return defaultFlags[flag];
}

export function getAllFlags() {
  return { ...defaultFlags, ...config.featureFlags };
}
