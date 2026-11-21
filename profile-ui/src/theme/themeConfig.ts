export type Theme = "sunrise" | "midnight";

/** Color scheme each theme declares on the root (drives native controls and scrollbars). */
export const themeScheme: Record<Theme, "light" | "dark"> = {
  sunrise: "light",
  midnight: "dark",
};

/** Every theme other than the dark one is light. */
export const isDarkTheme = (theme: Theme): boolean =>
  themeScheme[theme] === "dark";

/** Theme ids that were persisted by earlier versions, mapped to their replacement. */
export const legacyThemeIds: Record<string, Theme> = {
  ocean: "midnight",
  woodland: "sunrise",
};

/** What the visitor picked; "system" follows the OS and resolves to a Theme. */
export type ThemePreference = "light" | "dark" | "system";

/** Value persisted under the `theme` key for each preference (existing ids are kept). */
export const storedThemeValue: Record<ThemePreference, string> = {
  light: "sunrise",
  dark: "midnight",
  system: "system",
};

/** Parses a persisted `theme` value (current, "system" or legacy id); null when unusable. */
export function parseStoredTheme(raw: string | null): ThemePreference | null {
  if (!raw) return null;
  if (raw === "system") return "system";
  const id = raw in themeConfig ? (raw as Theme) : legacyThemeIds[raw];
  if (!id) return null;
  return isDarkTheme(id) ? "dark" : "light";
}

/** Resolves a preference to a concrete theme given the OS colour scheme. */
export function resolveTheme(
  preference: ThemePreference,
  systemDark: boolean,
): Theme {
  if (preference === "system") return systemDark ? "midnight" : "sunrise";
  return preference === "dark" ? "midnight" : "sunrise";
}

export interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  border: string;
  borderLight: string;
  success: string;
  warning: string;
  error: string;
  info: string;
  shadow: string;
}

export const themeConfig: Record<Theme, ThemeColors> = {
  sunrise: {
    // Studio daylight: cobalt ink on cool paper.
    primary: "#244CE4",
    secondary: "#52617C",
    accent: "#FFFFFF",
    background: "#F3F5FA",
    surface: "#FFFFFF",
    text: "#17243C",
    textSecondary: "#52617C",
    border: "#CCD3E1",
    borderLight: "#E3E7F0",
    success: "#147348",
    warning: "#8A5700",
    error: "#B52D3A",
    info: "#244CE4",
    shadow: "rgba(23, 36, 60, 0.12)",
  },
  midnight: {
    // Studio night: ink surfaces, lifted cobalt for contrast, pale lime accent.
    // Text on background #0E1628 / surface #16213A: text 15.96/14.15, textSecondary 8.93/7.92,
    // primary #8AA4FF 7.59/6.73, accent (text on primary) #0E1628 on #8AA4FF 7.59.
    primary: "#8AA4FF",
    secondary: "#DCE99B",
    accent: "#0E1628",
    background: "#0E1628",
    surface: "#16213A",
    text: "#EEF1F8",
    textSecondary: "#AAB7D0",
    border: "#56688A",
    borderLight: "#2A3956",
    success: "#4FD195",
    warning: "#F0B44C",
    error: "#FF8D98",
    info: "#8AA4FF",
    shadow: "rgba(0, 0, 0, 0.4)",
  },
};
