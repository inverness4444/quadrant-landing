import { logger } from "@/services/logger";

const provider = process.env.MONITORING_PROVIDER;
const dsn = process.env.MONITORING_DSN;

export const monitoringService = {
  captureMessage(message: string, context?: Record<string, unknown>) {
    if (!provider || !dsn) {
      logger.info(message, context);
      return;
    }
    logger.info(`[monitoring:${provider}] ${message}`, context);
  },
  captureException(error: unknown, context?: Record<string, unknown>) {
    const payload = { error: error instanceof Error ? error.message : String(error), ...context };
    if (!provider || !dsn) {
      logger.error("Captured exception", payload);
      return;
    }
    logger.error(`[monitoring:${provider}] exception`, payload);
  },
};
