import { lazy, Suspense, type MouseEvent } from "react";
import { useParadigm, type Paradigm } from "@/theme/ParadigmContext";

// Ticker ships in the Kinetic chunk; Studio visitors never download it.
const LazyTicker = lazy(() =>
  import("@/components/KineticStage").then((m) => ({
    default: m.KineticTicker,
  })),
);

export default function ModeStrip() {
  const {
    paradigm,
    isKinetic,
    isAether,
    setParadigm,
    prefetchKinetic,
    prefetchAether,
  } = useParadigm();

  const select = (mode: Paradigm) => (event: MouseEvent<HTMLButtonElement>) => {
    if (mode === paradigm) return;
    const rect = event.currentTarget.getBoundingClientRect();
    setParadigm(
      mode,
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
        ) : isAether ? (
          <span className="mode-strip-label aether-strip-label">
            Aether · Observatory
          </span>
        ) : (
          <span className="mode-strip-label">Design</span>
        )}
      </div>
      <div className="mode-switch" role="group" aria-label="Site design">
        <button
          type="button"
          data-mode="studio"
          aria-pressed={paradigm === "studio"}
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
        <button
          type="button"
          data-mode="aether"
          aria-pressed={isAether}
          onClick={select("aether")}
          onPointerEnter={prefetchAether}
          onFocus={prefetchAether}
          onTouchStart={prefetchAether}
        >
          Aether
        </button>
      </div>
    </div>
  );
}
