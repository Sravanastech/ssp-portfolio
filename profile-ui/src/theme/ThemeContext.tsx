import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  ReactNode,
} from "react";
import {
  Theme,
  ThemePreference,
  parseStoredTheme,
  resolveTheme,
  storedThemeValue,
  themeConfig,
  themeScheme,
} from "./themeConfig";
import { defaultTheme } from "./theme-constants";
import { ThemeContext } from "./theme-context";

const STORAGE_KEY = "theme";
/** Aether's former standalone Void/Cleanroom key; migrated once into STORAGE_KEY. */
const LEGACY_FUI_KEY = "portfolio-fui-theme";
const DARK_QUERY = "(prefers-color-scheme: dark)";

/** Stored preference; null (nothing stored) behaves like "system". */
function readStoredPreference(): ThemePreference | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return migrateLegacyFuiTheme();
    return parseStoredTheme(raw);
  } catch {
    return null; // Storage can be disabled.
  }
}

function migrateLegacyFuiTheme(): ThemePreference | null {
  const legacy = localStorage.getItem(LEGACY_FUI_KEY);
  if (legacy === null) return null;
  const preference: ThemePreference | null =
    legacy === "cleanroom" ? "light" : legacy === "void" ? "dark" : null;
  localStorage.removeItem(LEGACY_FUI_KEY);
  if (preference)
    localStorage.setItem(STORAGE_KEY, storedThemeValue[preference]);
  return preference;
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
  const [preference, setPreference] = useState<ThemePreference>(() => {
    if (typeof window === "undefined") return "system";
    return readStoredPreference() ?? "system";
  });
  const [systemDark, setSystemDark] = useState<boolean>(() =>
    typeof window === "undefined" ? false : systemPrefersDark(),
  );

  const currentTheme: Theme = resolveTheme(preference, systemDark);

  useLayoutEffect(() => {
    applyTheme(currentTheme);
  }, [currentTheme]);

  // Track OS appearance; it only matters while the preference is "system".
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    let query: MediaQueryList;
    try {
      query = window.matchMedia(DARK_QUERY);
    } catch {
      return;
    }
    const onChange = (event: MediaQueryListEvent) =>
      setSystemDark(event.matches);
    query.addEventListener?.("change", onChange);
    return () => query.removeEventListener?.("change", onChange);
  }, []);

  const setThemePreference = useCallback((next: ThemePreference) => {
    try {
      localStorage.setItem(STORAGE_KEY, storedThemeValue[next]);
    } catch {
      /* Keep in-memory preference. */
    }
    setPreference(next);
  }, []);

  const setTheme = useCallback(
    (theme: Theme) =>
      setThemePreference(themeScheme[theme] === "dark" ? "dark" : "light"),
    [setThemePreference],
  );

  const resetTheme = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* Keep in-memory preference. */
    }
    setPreference("system");
  }, []);

  const value = useMemo(
    () => ({
      currentTheme,
      colors: themeConfig[currentTheme] || themeConfig[defaultTheme],
      setTheme,
      themePreference: preference,
      setThemePreference,
      resetTheme,
    }),
    [currentTheme, preference, setTheme, setThemePreference, resetTheme],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
};
