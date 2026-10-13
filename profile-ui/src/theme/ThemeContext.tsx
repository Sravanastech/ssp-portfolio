import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { Theme, themeConfig } from "./themeConfig";
import {
  defaultTheme,
  defaultValue,
  ThemeContextType,
} from "./theme-constants";

const ThemeContext = createContext<ThemeContextType>(defaultValue);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [currentTheme, setCurrentTheme] = useState<Theme>(() => {
    if (typeof window === "undefined") return defaultTheme;
    let stored: Theme | null = null;
    try {
      stored = localStorage.getItem("theme") as Theme | null;
    } catch {
      /* Storage can be disabled. */
    }
    return stored && Object.keys(themeConfig).includes(stored)
      ? stored
      : defaultTheme;
  });

  useEffect(() => {
    try {
      localStorage.setItem("theme", currentTheme);
    } catch {
      /* Keep in-memory preference. */
    }
    applyTheme(currentTheme);
  }, [currentTheme]);

  const applyTheme = (theme: Theme) => {
    const root = document.documentElement;
    const colors = themeConfig[theme];

    Object.entries(colors).forEach(([key, value]) => {
      root.style.setProperty(`--color-${key}`, value);
    });

    root.dataset.theme = theme;
    root.style.colorScheme = theme === "ocean" ? "dark" : "light";
  };

  return (
    <ThemeContext.Provider
      value={{
        currentTheme,
        colors: themeConfig[currentTheme] || themeConfig[defaultTheme],
        setTheme: setCurrentTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    return defaultValue;
  }
  return context;
};
