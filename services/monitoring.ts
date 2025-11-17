import { env } from "@/config/env";
import { logger } from "@/services/logger";

type MonitoringContext = Record<string, unknown>;

const monitoringEnabled = Boolean(env.monitoring.dsn);
const providerLabel = env.monitoring.provider ?? "console";

function serializeError(error: unknown) {
  if (error instanceof Error) {
    return { name: error.name, message: error.message, stack: error.stack };
  }
  if (typeof error === "string") {
    return { message: error };
  }
  return { message: "Unknown error" };
}

export function trackEvent(name: string, payload?: MonitoringContext) {
  const entry = { event: name, ...payload };
  if (!monitoringEnabled) {
    logger.info(`[event:${name}]`, entry);
    return;
  }
  logger.info(`[monitoring:${providerLabel}] event`, entry);
}

export function trackError(error: unknown, context?: MonitoringContext) {
  const payload = { ...serializeError(error), ...context };
  if (!monitoringEnabled) {
    logger.error("Captured error", payload);
    return;
  }
  logger.error(`[monitoring:${providerLabel}] error`, payload);
}
