"use client";

type EventPayload = Record<string, string | number | boolean | undefined>;

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    plausible?: (event: string, options?: { props?: EventPayload }) => void;
  }
}

const provider = process.env.NEXT_PUBLIC_ANALYTICS_PROVIDER;

export function trackEvent(event: string, payload?: EventPayload) {
  if (!provider || provider === "none") {
    if (process.env.NODE_ENV !== "production") {
      console.info("[analytics]", event, payload);
    }
    return;
  }

  if (provider === "ga" && typeof window !== "undefined" && window.gtag) {
    window.gtag("event", event, payload ?? {});
    return;
  }

  if (provider === "plausible" && typeof window !== "undefined" && window.plausible) {
    window.plausible(event, { props: payload });
    return;
  }

  if (process.env.NODE_ENV !== "production") {
    console.info("[analytics-fallback]", event, payload);
  }
}
