function log(level: "info" | "warn" | "error", message: string, meta?: Record<string, unknown>) {
  const entry = JSON.stringify({ level, message, ...meta, timestamp: new Date().toISOString() });
  if (level === "info") console.info(entry);
  if (level === "warn") console.warn(entry);
  if (level === "error") console.error(entry);
}

export const logger = {
  info: (message: string, meta?: Record<string, unknown>) => log("info", message, meta),
  warn: (message: string, meta?: Record<string, unknown>) => log("warn", message, meta),
  error: (message: string, meta?: Record<string, unknown>) => log("error", message, meta),
};
