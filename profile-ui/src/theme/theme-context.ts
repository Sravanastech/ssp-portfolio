import { createContext, useContext } from "react";
import { ThemeContextType, defaultValue } from "./theme-constants";

export const ThemeContext = createContext<ThemeContextType>(defaultValue);

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    return defaultValue;
  }
  return context;
};
