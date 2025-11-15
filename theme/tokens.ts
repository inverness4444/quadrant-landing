export const themeTokens = {
  colors: {
    primary: "#f44336",
    primaryAccent: "#ff7043",
    background: "#f5f6fb",
    surface: "#ffffff",
    text: "#1f1f29",
    muted: "#667085",
    border: "#e3e6ef",
    link: "#1f55b5",
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
