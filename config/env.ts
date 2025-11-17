import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  DATABASE_URL: z.string().optional(),
  BASE_URL: z.string().optional(),
  DEMO_ENABLED: z
    .union([z.boolean(), z.string()])
    .optional()
    .transform((value) => {
      if (typeof value === "boolean") return value;
      if (typeof value === "string") {
        return ["1", "true", "yes", "on"].includes(value.toLowerCase());
      }
      return undefined;
    }),
  CONTACT_SMTP_HOST: z.string().optional(),
  CONTACT_SMTP_PORT: z.coerce.number().optional(),
  CONTACT_SMTP_USER: z.string().optional(),
  CONTACT_SMTP_PASS: z.string().optional(),
  CONTACT_RECIPIENT_EMAIL: z.string().optional(),
  ADMIN_USERNAME: z.string().optional(),
  ADMIN_PASSWORD: z.string().optional(),
  DEMO_EMAIL: z.string().email().optional(),
  DEMO_PASSWORD: z.string().optional(),
  MONITORING_DSN: z.string().optional(),
  MONITORING_PROVIDER: z.string().optional(),
  FEATURE_FLAGS: z.string().optional(),
});

type ParsedEnv = z.infer<typeof envSchema>;

type FeatureFlags = Record<string, boolean>;

function parseFeatureFlags(raw: string | undefined): FeatureFlags {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      return Object.entries(parsed).reduce<FeatureFlags>((acc, [key, value]) => {
        acc[key] = Boolean(value);
        return acc;
      }, {});
    }
  } catch {
    // ignore malformed flags
  }
  return {};
}

function ensure<T extends keyof ParsedEnv>(
  parsed: ParsedEnv,
  key: T,
  fallback?: NonNullable<ParsedEnv[T]>,
): NonNullable<ParsedEnv[T]> {
  const value = parsed[key];
  if (value) {
    return value as NonNullable<ParsedEnv[T]>;
  }
  if (parsed.NODE_ENV === "production") {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  if (typeof fallback === "undefined") {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return fallback;
}

const cached = (() => {
  const parsed = envSchema.parse(process.env);
  const featureFlags = parseFeatureFlags(parsed.FEATURE_FLAGS);
  const databaseUrl = ensure(parsed, "DATABASE_URL", "file:./data/quadrant.db");
  const baseUrl = ensure(parsed, "BASE_URL", "http://localhost:3000");
  const demoEnabled =
    typeof parsed.DEMO_ENABLED === "boolean" ? parsed.DEMO_ENABLED : parsed.NODE_ENV !== "production";

  return {
    nodeEnv: parsed.NODE_ENV,
    isProduction: parsed.NODE_ENV === "production",
    isTest: parsed.NODE_ENV === "test",
    databaseUrl,
    baseUrl,
    smtp: {
      host: parsed.CONTACT_SMTP_HOST ?? null,
      port: parsed.CONTACT_SMTP_PORT ?? null,
      user: parsed.CONTACT_SMTP_USER ?? null,
      pass: parsed.CONTACT_SMTP_PASS ?? null,
      recipient: parsed.CONTACT_RECIPIENT_EMAIL ?? null,
    },
    admin: {
      username: parsed.ADMIN_USERNAME ?? null,
      password: parsed.ADMIN_PASSWORD ?? null,
    },
    demo: {
      email: parsed.DEMO_EMAIL ?? null,
      password: parsed.DEMO_PASSWORD ?? null,
      enabled: demoEnabled,
    },
    monitoring: {
      dsn: parsed.MONITORING_DSN ?? null,
      provider: parsed.MONITORING_PROVIDER ?? null,
    },
    featureFlags,
  };
})();

export const env = cached;
export type AppEnv = typeof env;
