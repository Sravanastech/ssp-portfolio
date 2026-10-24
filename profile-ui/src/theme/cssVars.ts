import type { ThemeColors } from "./themeConfig";

/** Theme roles as CSS custom property references, written to :root by ThemeProvider. */
export const cv: ThemeColors = {
  primary: "var(--color-primary)",
  secondary: "var(--color-secondary)",
  accent: "var(--color-accent)",
  background: "var(--color-background)",
  surface: "var(--color-surface)",
  text: "var(--color-text)",
  textSecondary: "var(--color-textSecondary)",
  border: "var(--color-border)",
  borderLight: "var(--color-borderLight)",
  success: "var(--color-success)",
  warning: "var(--color-warning)",
  error: "var(--color-error)",
  info: "var(--color-info)",
  shadow: "var(--color-shadow)",
};

/** A theme role at a given opacity (0-100), resolved by the browser so it follows the active theme. */
export const tint = (role: keyof ThemeColors, percent: number): string =>
  `color-mix(in srgb, var(--color-${role}) ${percent}%, transparent)`;
