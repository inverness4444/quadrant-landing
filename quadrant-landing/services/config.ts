import { env } from "@/config/env";

export const config = {
  environment: env.environment,
  baseUrl: env.baseUrl,
  demoEnabled: env.demo.enabled,
  telemetryEnabled: !env.telemetryDisabled,
  featureFlags: env.featureFlags,
};

export type AppConfig = typeof config;
