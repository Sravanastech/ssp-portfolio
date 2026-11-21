import { useRef } from "react";
import { Palette } from "lucide-react";
import {
  toggleAppearance,
  useAppearanceOpen,
  useAppearanceSeen,
} from "./appearanceStore";

export const APPEARANCE_PANEL_ID = "appearance-panel";

/** Header button that opens the Appearance panel; shows a dot until first opened. */
export default function AppearanceTrigger() {
  const ref = useRef<HTMLButtonElement>(null);
  const open = useAppearanceOpen();
  const seen = useAppearanceSeen();
  return (
    <button
      ref={ref}
      type="button"
      className="studio-menu-trigger appearance-trigger"
      data-appearance-trigger
      aria-label="Appearance"
      aria-haspopup="dialog"
      aria-expanded={open}
      aria-controls={APPEARANCE_PANEL_ID}
      onClick={() => toggleAppearance(ref.current)}
    >
      <Palette size={20} aria-hidden="true" />
      {!seen && (
        <span
          className="appearance-hint-dot"
          data-testid="appearance-hint"
          aria-hidden="true"
        />
      )}
    </button>
  );
}
