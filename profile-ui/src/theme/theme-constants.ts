import { Theme, ThemeColors, themeConfig } from "./themeConfig";

export interface ThemeContextType {
  currentTheme: Theme;
  colors: ThemeColors;
  setTheme: (theme: Theme) => void;
}

export const defaultTheme: Theme = "sunrise";
export const defaultValue: ThemeContextType = {
  currentTheme: defaultTheme,
  colors: themeConfig[defaultTheme],
  setTheme: () => {},
};
