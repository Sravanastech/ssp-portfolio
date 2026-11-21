import { lazy, Suspense } from "react";
import { useParadigm } from "@/theme/ParadigmContext";

// Ticker ships in the Kinetic chunk; Studio and Aether visitors never download it.
const LazyTicker = lazy(() =>
  import("@/components/KineticStage").then((m) => ({
    default: m.KineticTicker,
  })),
);

/** Telemetry ticker bar above the header; rendered in Kinetic only. */
export default function KineticTickerBar() {
  const { isKinetic } = useParadigm();
  if (!isKinetic) return null;
  return (
    <div className="kinetic-ticker-bar" data-paradigm-ui>
      <Suspense fallback={null}>
        <LazyTicker />
      </Suspense>
    </div>
  );
}
