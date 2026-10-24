import { Check } from "lucide-react";
import { useTheme } from "@/theme/theme-context";
import { themeConfig } from "@/theme/themeConfig";

const themes = [
  { value: "woodland", label: "Green" },
  { value: "sunrise", label: "Light" },
  { value: "midnight", label: "Dark" },
] as const;

export default function ThemeSwitcher() {
  const { currentTheme, setTheme } = useTheme();
  return (
    <div className="theme-switcher" role="group" aria-label="Color palette">
      {themes.map(({ value, label }) => (
        <button
          key={value}
          type="button"
          className="theme-choice focus:ring-2 focus:ring-offset-2"
          aria-label={`${label} theme`}
          aria-pressed={currentTheme === value}
          onClick={() => setTheme(value)}
        >
          <span className="palette-swatch" aria-hidden="true">
            {[
              themeConfig[value].background,
              themeConfig[value].primary,
              themeConfig[value].text,
            ].map((color, index) => (
              <i key={index} style={{ backgroundColor: color }} />
            ))}
          </span>
          <span>{label}</span>
          <Check size={14} className="choice-check" aria-hidden="true" />
        </button>
      ))}
    </div>
  );
}
