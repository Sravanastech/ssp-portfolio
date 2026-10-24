import { useEffect, useMemo, useRef, useState } from "react";
import { useParadigm } from "@/theme/ParadigmContext";
import { useSiteContent } from "@/content/siteContentContext";

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";
const FINE_POINTER = "(pointer: fine)";

function matches(query: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.matchMedia?.(query)?.matches ?? false;
  } catch {
    return false;
  }
}

export default function KineticStage() {
  const { isKinetic, setParadigm } = useParadigm();
  const { profile, caseStudies } = useSiteContent();
  const [paused, setPaused] = useState(() => matches(REDUCED_MOTION));
  const [finePointer, setFinePointer] = useState(false);
  const reticleRef = useRef<HTMLDivElement>(null);

  // Real profile data only.
  const items = useMemo(
    () => [
      profile.name,
      `${profile.role} / ${profile.employer}`,
      profile.location,
      profile.headline,
      `Building since ${profile.careerStartYear}`,
      ...caseStudies.map((study) => study.name),
    ],
    [profile, caseStudies],
  );

  useEffect(() => {
    if (!isKinetic) {
      setFinePointer(false);
      return;
    }
    setFinePointer(matches(FINE_POINTER));
  }, [isKinetic]);

  useEffect(() => {
    if (!isKinetic || !finePointer) return;
    let frame = 0;
    let x = 0;
    let y = 0;
    const flush = () => {
      frame = 0;
      const el = reticleRef.current;
      if (el) el.style.translate = `${x}px ${y}px`;
    };
    const onMove = (e: PointerEvent) => {
      x = e.clientX;
      y = e.clientY;
      if (!frame) frame = window.requestAnimationFrame(flush);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [isKinetic, finePointer]);

  if (!isKinetic) return null;

  const track = (hidden: boolean) => (
    <ul
      className="kinetic-ticker-copy"
      data-copy={hidden ? "clone" : "primary"}
      aria-hidden={hidden ? true : undefined}
      style={{
        display: "flex",
        gap: 48,
        margin: 0,
        padding: 0,
        listStyle: "none",
      }}
    >
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );

  return (
    <>
      <aside
        className="kinetic-stage"
        role="region"
        aria-label="Kinetic telemetry ticker"
      >
        <div className="kinetic-ticker" data-paused={paused ? "true" : "false"}>
          <div className="kinetic-ticker-track">
            {track(false)}
            {track(true)}
          </div>
          <button
            type="button"
            className="kinetic-pause"
            aria-pressed={paused}
            aria-label={paused ? "Play kinetic ticker" : "Pause kinetic ticker"}
            onClick={() => setPaused((p) => !p)}
          >
            {paused ? "Play" : "Pause"}
          </button>
        </div>
      </aside>
      {finePointer && (
        <div ref={reticleRef} className="kinetic-reticle" aria-hidden="true" />
      )}
      <div className="kinetic-hud">
        <span data-live>Kinetic mode</span>{" "}
        <button
          type="button"
          onClick={() => setParadigm("studio")}
          style={{
            pointerEvents: "auto",
            minHeight: 44,
            minWidth: 44,
            padding: "0 12px",
            font: "inherit",
            letterSpacing: "inherit",
            textTransform: "inherit",
            color: "inherit",
            background: "transparent",
            border: "1px solid currentColor",
            cursor: "pointer",
          }}
        >
          Return to Studio
        </button>
      </div>
    </>
  );
}
