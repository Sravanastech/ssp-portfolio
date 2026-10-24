import type { MouseEvent } from "react";
import { Sparkles, Compass } from "lucide-react";
import { useParadigm, type ParadigmOrigin } from "@/theme/ParadigmContext";

interface ParadigmToggleProps {
  compact?: boolean;
}

export default function ParadigmToggle({
  compact = false,
}: ParadigmToggleProps) {
  const { isKinetic, toggleParadigm, prefetchKinetic } = useParadigm();

  const label = isKinetic ? "Studio" : "Kinetic";
  const Icon = isKinetic ? Compass : Sparkles;
  const ariaLabel = isKinetic
    ? "Switch to Studio minimalist mode"
    : "Switch to Kinetic maximalist mode";

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const origin: ParadigmOrigin =
      rect.width || rect.height
        ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
        : { x: event.clientX, y: event.clientY };
    toggleParadigm(origin);
  };

  return (
    <button
      type="button"
      className="paradigm-toggle"
      aria-pressed={isKinetic}
      aria-label={ariaLabel}
      title={ariaLabel}
      onPointerEnter={prefetchKinetic}
      onFocus={prefetchKinetic}
      onTouchStart={prefetchKinetic}
      onClick={handleClick}
    >
      <Icon className="w-4 h-4" aria-hidden="true" />
      {compact ? null : <span>{label}</span>}
    </button>
  );
}
