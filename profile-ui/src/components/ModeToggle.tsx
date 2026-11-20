import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/theme/theme-context";
import { isDarkTheme } from "@/theme/themeConfig";

/** The one light/dark control; each paradigm maps it to its own palette. */
export default function ModeToggle() {
  const { currentTheme, setTheme } = useTheme();
  const dark = isDarkTheme(currentTheme);
  return (
    <button
      type="button"
      role="switch"
      aria-checked={dark}
      className="studio-menu-trigger mode-toggle"
      aria-label="Dark mode"
      onClick={() => setTheme(dark ? "sunrise" : "midnight")}
    >
      {dark ? (
        <Sun size={20} aria-hidden="true" />
      ) : (
        <Moon size={20} aria-hidden="true" />
      )}
    </button>
  );
}
