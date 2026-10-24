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

const INTERACTIVE =
  'a, button, [role="button"], .studio-project, input, textarea, select';

/** Ticker rendered inside the mode strip's lead slot. */
export function KineticTicker() {
  const { isKinetic } = useParadigm();
  const { profile, caseStudies } = useSiteContent();
  const [paused, setPaused] = useState(() => matches(REDUCED_MOTION));

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
    <div
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
    </div>
  );
}

/** Reticle (fine pointers only). The ticker lives in the mode strip. */
export default function KineticStage() {
  const { isKinetic } = useParadigm();
  const [finePointer, setFinePointer] = useState(false);
  const reticleRef = useRef<HTMLDivElement>(null);

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
    const onOver = (e: Event) => {
      const el = reticleRef.current;
      if (!el) return;
      const t = e.target;
      const hit =
        t instanceof Element && typeof t.closest === "function"
          ? t.closest(INTERACTIVE)
          : null;
      if (hit) el.setAttribute("data-active", "true");
      else el.removeAttribute("data-active");
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerover", onOver, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerover", onOver);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [isKinetic, finePointer]);

  if (!isKinetic || !finePointer) return null;
  return (
    <div ref={reticleRef} className="kinetic-reticle" aria-hidden="true" />
  );
}
