export const themeTokens = {
  colors: {
    primary: "#5d5fef",
    primaryAccent: "#8b5cf6",
    background: "#f3f4f8",
    surface: "#ffffff",
    text: "#0b1220",
    muted: "#6b7280",
    border: "#e2e6f2",
    link: "#4c6ef5",
  },
  typography: {
    h1: { size: "2.75rem", lineHeight: "1.2", weight: 600 },
    h2: { size: "2.25rem", lineHeight: "1.25", weight: 600 },
    h3: { size: "1.5rem", lineHeight: "1.3", weight: 600 },
    body: { size: "1rem", lineHeight: "1.6", weight: 400 },
    small: { size: "0.875rem", lineHeight: "1.5", weight: 500 },
  },
  spacing: {
    xs: "0.5rem",
    sm: "1rem",
    md: "1.5rem",
    lg: "2.5rem",
    xl: "4rem",
  },
  breakpoints: {
    mobile: "360px",
    tablet: "768px",
    desktop: "1280px",
  },
};

export type ThemeTokens = typeof themeTokens;
