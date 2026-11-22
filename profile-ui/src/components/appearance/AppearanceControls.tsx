import type { ChangeEvent, ReactNode } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { useParadigm, type Paradigm } from "@/theme/ParadigmContext";
import { useTheme } from "@/theme/theme-context";
import type { ThemePreference } from "@/theme/themeConfig";
import { useMotionSetting } from "./useMotionSetting";

const STYLES: { id: Paradigm; label: string; description: string }[] = [
  { id: "studio", label: "Studio", description: "Calm, editorial layout" },
  { id: "kinetic", label: "Kinetic", description: "Bold, high-energy type" },
  { id: "aether", label: "Aether", description: "Cinematic sci-fi HUD" },
];

const THEMES: { id: ThemePreference; label: string; icon: ReactNode }[] = [
  { id: "light", label: "Light", icon: <Sun size={16} aria-hidden="true" /> },
  { id: "dark", label: "Dark", icon: <Moon size={16} aria-hidden="true" /> },
  {
    id: "system",
    label: "System",
    icon: <Monitor size={16} aria-hidden="true" />,
  },
];

function centerOf(element: Element | null) {
  const rect = element?.getBoundingClientRect();
  return rect && (rect.width || rect.height)
    ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
    : undefined;
}

/** Style, theme and motion sections plus reset; identical in every paradigm. */
export default function AppearanceControls() {
  const { paradigm, setParadigm, prefetchKinetic, prefetchAether } =
    useParadigm();
  const { themePreference, setThemePreference, resetTheme } = useTheme();
  const motion = useMotionSetting();

  const prefetchFor = (id: Paradigm) =>
    id === "kinetic"
      ? prefetchKinetic
      : id === "aether"
        ? prefetchAether
        : undefined;

  const selectStyle =
    (id: Paradigm) => (event: ChangeEvent<HTMLInputElement>) => {
      if (id === paradigm) return;
      setParadigm(id, centerOf(event.currentTarget.parentElement));
    };

  const reset = (event: React.MouseEvent<HTMLButtonElement>) => {
    resetTheme();
    motion.set(false);
    if (paradigm !== "aether")
      setParadigm("aether", centerOf(event.currentTarget));
  };

  return (
    <div className="appearance-body">
      <section className="appearance-section">
        <h3 id="appearance-style-label" className="appearance-label">
          Style
        </h3>
        <div
          role="radiogroup"
          aria-labelledby="appearance-style-label"
          className="appearance-cards"
        >
          {STYLES.map(({ id, label, description }) => {
            const prefetch = prefetchFor(id);
            return (
              <label
                key={id}
                className="appearance-card"
                data-style={id}
                onPointerEnter={prefetch}
                onTouchStart={prefetch}
              >
                <input
                  type="radio"
                  name="appearance-style"
                  value={id}
                  checked={paradigm === id}
                  onChange={selectStyle(id)}
                  onFocus={prefetch}
                  aria-labelledby={`appearance-style-${id}`}
                  aria-describedby={`appearance-style-${id}-desc`}
                />
                <span
                  className="appearance-swatch"
                  data-swatch={id}
                  aria-hidden="true"
                >
                  <i />
                  <i />
                  <i />
                </span>
                <span
                  id={`appearance-style-${id}`}
                  className="appearance-card-title"
                >
                  {label}
                </span>
                <span
                  id={`appearance-style-${id}-desc`}
                  className="appearance-card-desc"
                >
                  {description}
                </span>
              </label>
            );
          })}
        </div>
      </section>

      <section className="appearance-section">
        <h3 id="appearance-theme-label" className="appearance-label">
          Theme
        </h3>
        <div
          role="radiogroup"
          aria-labelledby="appearance-theme-label"
          className="appearance-segmented"
        >
          {THEMES.map(({ id, label, icon }) => (
            <label key={id} className="appearance-segment">
              <input
                type="radio"
                name="appearance-theme"
                value={id}
                checked={themePreference === id}
                onChange={() => setThemePreference(id)}
              />
              {icon}
              <span>{label}</span>
            </label>
          ))}
        </div>
      </section>

      <section className="appearance-section appearance-row">
        <div className="appearance-row-text">
          <h3 id="appearance-motion-label" className="appearance-label">
            Reduce motion
          </h3>
          <p id="appearance-motion-hint" className="appearance-hint">
            {motion.locked
              ? "Set by your device"
              : "Calms animations and transitions"}
          </p>
        </div>
        <button
          type="button"
          role="switch"
          className="appearance-switch"
          aria-checked={motion.reduced}
          aria-labelledby="appearance-motion-label"
          aria-describedby="appearance-motion-hint"
          disabled={motion.locked}
          onClick={() => motion.set(!motion.reduced)}
        >
          <span className="appearance-switch-thumb" aria-hidden="true" />
        </button>
      </section>

      <button type="button" className="appearance-reset" onClick={reset}>
        Reset to defaults
      </button>
    </div>
  );
}
