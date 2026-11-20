import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  ReactNode,
} from "react";
import { Theme, legacyThemeIds, themeConfig, themeScheme } from "./themeConfig";
import { defaultTheme } from "./theme-constants";
import { ThemeContext } from "./theme-context";

const STORAGE_KEY = "theme";
const DARK_THEME: Theme = "midnight";
/** Aether's former standalone Void/Cleanroom key; migrated once into STORAGE_KEY. */
const LEGACY_FUI_KEY = "portfolio-fui-theme";
const DARK_QUERY = "(prefers-color-scheme: dark)";

function readStoredTheme(): Theme | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return migrateLegacyFuiTheme();
    if (raw in themeConfig) return raw as Theme;
    return legacyThemeIds[raw] ?? null;
  } catch {
    return null; // Storage can be disabled.
  }
}

function migrateLegacyFuiTheme(): Theme | null {
  const legacy = localStorage.getItem(LEGACY_FUI_KEY);
  if (legacy === null) return null;
  const theme: Theme | null =
    legacy === "cleanroom"
      ? defaultTheme
      : legacy === "void"
        ? DARK_THEME
        : null;
  localStorage.removeItem(LEGACY_FUI_KEY);
  if (theme) localStorage.setItem(STORAGE_KEY, theme);
  return theme;
}

function systemPrefersDark(): boolean {
  try {
    return window.matchMedia?.(DARK_QUERY).matches ?? false;
  } catch {
    return false;
  }
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  Object.entries(themeConfig[theme]).forEach(([key, value]) => {
    root.style.setProperty(`--color-${key}`, value);
  });
  root.dataset.theme = theme;
  root.style.colorScheme = themeScheme[theme];
}

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  // True once the visitor picked a theme (now or in an earlier visit).
  const chosen = useRef<boolean>(false);
  const [currentTheme, setCurrentTheme] = useState<Theme>(() => {
    if (typeof window === "undefined") return defaultTheme;
    const stored = readStoredTheme();
    if (stored) {
      chosen.current = true;
      return stored;
    }
    return systemPrefersDark() ? DARK_THEME : defaultTheme;
  });

  useLayoutEffect(() => {
    applyTheme(currentTheme);
  }, [currentTheme]);

  // Follow OS appearance changes until the visitor chooses a theme.
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    let query: MediaQueryList;
    try {
      query = window.matchMedia(DARK_QUERY);
    } catch {
      return;
    }
    const onChange = (event: MediaQueryListEvent) => {
      if (chosen.current) return;
      setCurrentTheme(event.matches ? DARK_THEME : defaultTheme);
    };
    query.addEventListener?.("change", onChange);
    return () => query.removeEventListener?.("change", onChange);
  }, []);

  const setTheme = useCallback((theme: Theme) => {
    chosen.current = true;
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      /* Keep in-memory preference. */
    }
    setCurrentTheme(theme);
  }, []);

  return (
    <ThemeContext.Provider
      value={{
        currentTheme,
        colors: themeConfig[currentTheme] || themeConfig[defaultTheme],
        setTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};
