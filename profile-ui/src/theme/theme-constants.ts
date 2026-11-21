import {
  Theme,
  ThemeColors,
  ThemePreference,
  themeConfig,
} from "./themeConfig";

export interface ThemeContextType {
  currentTheme: Theme;
  colors: ThemeColors;
  setTheme: (theme: Theme) => void;
  /** Light, dark or system (follows the OS). */
  themePreference: ThemePreference;
  setThemePreference: (preference: ThemePreference) => void;
  /** Forget the stored choice and follow the OS again. */
  resetTheme: () => void;
}

export const defaultTheme: Theme = "sunrise";
export const defaultValue: ThemeContextType = {
  currentTheme: defaultTheme,
  colors: themeConfig[defaultTheme],
  setTheme: () => {},
  themePreference: "system",
  setThemePreference: () => {},
  resetTheme: () => {},
};
