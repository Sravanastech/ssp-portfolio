import { lazy, Suspense, type MouseEvent } from "react";
import { useParadigm, type Paradigm } from "@/theme/ParadigmContext";

// Ticker ships in the Kinetic chunk; Studio visitors never download it.
const LazyTicker = lazy(() =>
  import("@/components/KineticStage").then((m) => ({
    default: m.KineticTicker,
  })),
);

export default function ModeStrip() {
  const { paradigm, isKinetic, toggleParadigm, prefetchKinetic } =
    useParadigm();

  const select = (mode: Paradigm) => (event: MouseEvent<HTMLButtonElement>) => {
    if (mode === paradigm) return;
    const rect = event.currentTarget.getBoundingClientRect();
    toggleParadigm(
      rect.width || rect.height
        ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
        : { x: event.clientX, y: event.clientY },
    );
  };

  return (
    <div className="mode-strip" data-paradigm-ui>
      <div className="mode-strip-lead">
        {isKinetic ? (
          <Suspense fallback={null}>
            <LazyTicker />
          </Suspense>
        ) : (
          <span className="mode-strip-label">Design</span>
        )}
      </div>
      <div className="mode-switch" role="group" aria-label="Site design">
        <button
          type="button"
          data-mode="studio"
          aria-pressed={!isKinetic}
          onClick={select("studio")}
        >
          Studio
        </button>
        <button
          type="button"
          data-mode="kinetic"
          aria-pressed={isKinetic}
          onClick={select("kinetic")}
          onPointerEnter={prefetchKinetic}
          onFocus={prefetchKinetic}
          onTouchStart={prefetchKinetic}
        >
          Kinetic
        </button>
      </div>
    </div>
  );
}
