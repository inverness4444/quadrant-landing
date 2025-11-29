const env = process.env;

type FeatureFlags = Partial<{
  feedbackEnabled: boolean;
  analyticsEnabled: boolean;
  pilotsEnabled: boolean;
  quarterlyReportsEnabled: boolean;
  oneOnOnesEnabled: boolean;
}>;

function parseBool(value: string | undefined) {
  if (value === undefined) return undefined;
  return value === "true" || value === "1";
}

export const config = {
  environment: env.ENVIRONMENT || env.NODE_ENV || "development",
  baseUrl: env.BASE_URL || "http://localhost:3000",
  demoEnabled: parseBool(env.DEMO_ENABLED) ?? true,
  featureFlags: {
    feedbackEnabled: parseBool(env.FEATURE_FEEDBACK_ENABLED),
    analyticsEnabled: parseBool(env.FEATURE_ANALYTICS_ENABLED),
    pilotsEnabled: parseBool(env.FEATURE_PILOTS_ENABLED),
    quarterlyReportsEnabled: parseBool(env.FEATURE_Q_REPORTS_ENABLED),
    oneOnOnesEnabled: parseBool(env.FEATURE_ONE_ON_ONES_ENABLED),
  } satisfies FeatureFlags,
};
