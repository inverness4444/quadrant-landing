import type { Config } from "tailwindcss";
import { themeTokens } from "./theme/tokens";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./content/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        "brand-primary": themeTokens.colors.primary,
        "brand-accent": themeTokens.colors.primaryAccent,
        "brand-muted": themeTokens.colors.background,
        "brand-border": themeTokens.colors.border,
        "brand-bg": themeTokens.colors.surface,
        "brand-text": themeTokens.colors.text,
        "brand-link": themeTokens.colors.link,
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "-apple-system", "sans-serif"],
      },
      spacing: {
        xs: themeTokens.spacing.xs,
        sm: themeTokens.spacing.sm,
        md: themeTokens.spacing.md,
        lg: themeTokens.spacing.lg,
        xl: themeTokens.spacing.xl,
      },
    },
  },
  plugins: [],
};

export default config;
