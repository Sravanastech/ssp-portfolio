import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/theme/theme-context";
import { cv } from "@/theme/cssVars";

export function MobileMenuAppearance() {
  const { currentTheme, setTheme } = useTheme();
  const isDark = currentTheme === "midnight";

  return (
    <div
      className="flex items-center justify-between gap-3 py-1.5 pl-3 pr-1.5 rounded-xl border"
      style={{
        backgroundColor: cv.background,
        borderColor: cv.border,
      }}
    >
      <span
        id="mobile-appearance-label"
        className="text-sm font-bold"
        style={{ color: cv.text }}
      >
        Appearance
      </span>
      <div
        role="group"
        aria-labelledby="mobile-appearance-label"
        className="menu-segmented"
      >
        <button
          type="button"
          aria-pressed={!isDark}
          onClick={() => setTheme("sunrise")}
        >
          <Sun className="w-3.5 h-3.5" aria-hidden="true" />
          Light
        </button>
        <button
          type="button"
          aria-pressed={isDark}
          onClick={() => setTheme("midnight")}
        >
          <Moon className="w-3.5 h-3.5" aria-hidden="true" />
          Dark
        </button>
      </div>
    </div>
  );
}
