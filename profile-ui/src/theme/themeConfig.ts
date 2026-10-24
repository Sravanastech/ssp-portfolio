export type Theme = "woodland" | "sunrise" | "midnight";

/** Color scheme each theme declares on the root (drives native controls and scrollbars). */
export const themeScheme: Record<Theme, "light" | "dark"> = {
  woodland: "light",
  sunrise: "light",
  midnight: "dark",
};

/** Theme ids that were persisted by earlier versions, mapped to their replacement. */
export const legacyThemeIds: Record<string, Theme> = {
  ocean: "midnight",
};

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
  woodland: {
    // Sulu (light sage) & Deep Fir (dark forest green)
    primary: "#0D3F35",
    secondary: "#4A7C72",
    accent: "#F5F9F7",
    background: "#F9FCFB",
    surface: "#FFFFFF",
    text: "#0D3F35",
    textSecondary: "#2D5A50",
    border: "#D4E0DC",
    borderLight: "#E8EFED",
    success: "#059669",
    warning: "#D97706",
    error: "#DC2626",
    info: "#0284C7",
    shadow: "rgba(13, 63, 53, 0.15)",
  },
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

export const typographyConfig = {
  fontFamily: {
    primary: '"Space Grotesk", sans-serif',
    display: '"Space Grotesk", sans-serif',
    mono: '"IBM Plex Mono", "Monaco", "Courier New", monospace',
  },
  fontSize: {
    xs: "0.75rem",
    sm: "0.875rem",
    base: "1rem",
    lg: "1.125rem",
    xl: "1.25rem",
    "2xl": "1.5rem",
    "3xl": "1.875rem",
    "4xl": "2.25rem",
    "5xl": "3rem",
  },
  fontWeight: {
    // Only Space Grotesk 400/500/700 are loaded (font-synthesis: none), so nothing above 700.
    normal: 400,
    medium: 500,
    bold: 700,
  },
};

export const spacingConfig = {
  xs: "0.25rem",
  sm: "0.5rem",
  md: "1rem",
  lg: "1.5rem",
  xl: "2rem",
  "2xl": "3rem",
  "3xl": "4rem",
  "4xl": "6rem",
};
