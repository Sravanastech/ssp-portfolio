export type Theme = "woodland" | "sunrise" | "ocean";

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
  ocean: {
    // Turquoise & Black
    primary: "#1DB5D8",
    secondary: "#000000",
    accent: "#0F1419",
    background: "#0F1419",
    surface: "#1A1F2E",
    text: "#E8EAED",
    textSecondary: "#9CA3AF",
    border: "#2D2E35",
    borderLight: "#3F414B",
    success: "#10B981",
    warning: "#F59E0B",
    error: "#FF6B6B",
    info: "#1DB5D8",
    shadow: "rgba(29, 181, 216, 0.2)",
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
    thin: 100,
    light: 300,
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    extrabold: 800,
    black: 900,
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
