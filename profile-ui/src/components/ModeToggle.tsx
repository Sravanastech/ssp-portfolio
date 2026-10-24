import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/theme/theme-context";

export default function ModeToggle() {
  const { currentTheme, setTheme } = useTheme();
  const dark = currentTheme === "midnight";
  return (
    <button
      type="button"
      className="studio-menu-trigger mode-toggle"
      aria-label={`Switch to ${dark ? "light" : "dark"} mode`}
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
