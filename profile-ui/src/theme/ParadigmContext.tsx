import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { flushSync } from "react-dom";

export type Paradigm = "studio" | "kinetic";

export interface ParadigmOrigin {
  x: number;
  y: number;
}

export interface ParadigmContextValue {
  paradigm: Paradigm;
  isKinetic: boolean;
  setParadigm: (next: Paradigm, origin?: ParadigmOrigin) => void;
  toggleParadigm: (origin?: ParadigmOrigin) => void;
  prefetchKinetic: () => void;
}

interface ViewTransitionLike {
  ready: Promise<void>;
  finished: Promise<void>;
  skipTransition: () => void;
}

type StartViewTransition = (cb: () => void) => ViewTransitionLike;

const STORAGE_KEY = "portfolio-paradigm";
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
const SHOCKWAVE_MS = 680;
const SHOCKWAVE_EASING = "cubic-bezier(0.16, 1, 0.3, 1)";

const ParadigmContext = createContext<ParadigmContextValue | null>(null);

function readStoredParadigm(): Paradigm {
  try {
    return localStorage.getItem(STORAGE_KEY) === "kinetic"
      ? "kinetic"
      : "studio";
  } catch {
    return "studio"; // Storage can be disabled.
  }
}

function writeStoredParadigm(next: Paradigm) {
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // Storage can be disabled; the in-memory paradigm still applies.
  }
}

function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia?.(REDUCED_MOTION_QUERY)?.matches ?? false;
  } catch {
    return false;
  }
}

function getStartViewTransition(): StartViewTransition | null {
  if (typeof document === "undefined") return null;
  const start = (
    document as Document & { startViewTransition?: StartViewTransition }
  ).startViewTransition;
  return typeof start === "function" ? start.bind(document) : null;
}

// Kinetic stylesheet is code-split: loaded once, only when a visitor asks for Kinetic.
// Written as import.meta.glob (a dynamic import under the hood) so a missing file
// resolves to an empty map instead of failing the build or the test transform.
const KINETIC_CSS_KEY = "/src/styles/kinetic-maximalist.css";
const kineticStyleLoaders = import.meta.glob(
  "/src/styles/kinetic-maximalist.css",
);
let kineticLoad: Promise<void> | null = null;

function prefetchKineticStyles(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (!kineticLoad) {
    kineticLoad = (async () => {
      try {
        await kineticStyleLoaders[KINETIC_CSS_KEY]?.();
      } catch {
        // Failed chunk must never break Studio; Kinetic just stays unstyled.
      }
    })();
  }
  return kineticLoad;
}

// Never hold the toggle hostage to a slow stylesheet chunk: after this, snapshot anyway.
const KINETIC_READY_TIMEOUT_MS = 1000;

function boundedWait(p: Promise<void>, ms: number): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, ms);
    p.then(
      () => {
        clearTimeout(timer);
        resolve();
      },
      () => {
        clearTimeout(timer);
        resolve();
      },
    );
  });
}

function maxRadius(x: number, y: number): number {
  const w = window.innerWidth;
  const h = window.innerHeight;
  return Math.hypot(Math.max(x, w - x), Math.max(y, h - y));
}

export function ParadigmProvider({ children }: { children: ReactNode }) {
  const [paradigm, setParadigmState] = useState<Paradigm>(() =>
    typeof window === "undefined" ? "studio" : readStoredParadigm(),
  );
  const [announcement, setAnnouncement] = useState("");

  // Latest requested paradigm; updated synchronously so rapid toggles never race.
  const targetRef = useRef<Paradigm>(paradigm);
  // The View Transition currently in flight, if any.
  const inflightRef = useRef<ViewTransitionLike | null>(null);

  const apply = useCallback((next: Paradigm) => {
    flushSync(() => setParadigmState(next));
    if (typeof document !== "undefined") {
      document.documentElement.dataset.paradigm = next;
    }
  }, []);

  useLayoutEffect(() => {
    document.documentElement.dataset.paradigm = paradigm;
  }, [paradigm]);

  useEffect(() => {
    if (readStoredParadigm() === "kinetic") void prefetchKineticStyles();
  }, []);

  const prefetchKinetic = useCallback(() => {
    void prefetchKineticStyles();
  }, []);

  const setParadigm = useCallback(
    (next: Paradigm, origin?: ParadigmOrigin) => {
      if (typeof window === "undefined") return;
      if (next === "kinetic") void prefetchKineticStyles();

      targetRef.current = next;
      writeStoredParadigm(next);
      const root = document.documentElement;
      setAnnouncement(
        next === "kinetic"
          ? "Switched to Kinetic maximalist design"
          : "Switched to Studio minimalist design",
      );

      // Supersede any transition still in flight; its update callback still runs.
      inflightRef.current?.skipTransition();
      inflightRef.current = null;

      const startViewTransition = getStartViewTransition();
      if (!startViewTransition || prefersReducedMotion()) {
        delete root.dataset.paradigmTransition; // a skipped portal must not leave its marker behind
        apply(next);
        return;
      }

      const x = origin?.x ?? window.innerWidth / 2;
      const y = origin?.y ?? window.innerHeight / 2;

      root.dataset.paradigmTransition = "portal";
      // Snapshot only after the Kinetic CSS is in, so the portal never reveals unstyled Kinetic.
      const vt = startViewTransition(async () => {
        if (targetRef.current === "kinetic") {
          await boundedWait(prefetchKineticStyles(), KINETIC_READY_TIMEOUT_MS);
        }
        apply(targetRef.current);
      });
      inflightRef.current = vt;

      vt.ready
        .then(() => {
          if (inflightRef.current !== vt) return; // superseded by a newer toggle
          root.animate(
            {
              clipPath: [
                `circle(0px at ${x}px ${y}px)`,
                `circle(${maxRadius(x, y)}px at ${x}px ${y}px)`,
              ],
            },
            {
              duration: SHOCKWAVE_MS,
              easing: SHOCKWAVE_EASING,
              pseudoElement: "::view-transition-new(root)",
            },
          );
        })
        .catch(() => {
          // ready rejects when the transition is skipped; nothing to animate.
        });

      vt.finished
        .catch(() => undefined)
        .finally(() => {
          if (inflightRef.current === vt) {
            inflightRef.current = null;
            delete root.dataset.paradigmTransition;
          }
        });
    },
    [apply],
  );

  const toggleParadigm = useCallback(
    (origin?: ParadigmOrigin) => {
      setParadigm(
        targetRef.current === "studio" ? "kinetic" : "studio",
        origin,
      );
    },
    [setParadigm],
  );

  const value = useMemo<ParadigmContextValue>(
    () => ({
      paradigm,
      isKinetic: paradigm === "kinetic",
      setParadigm,
      toggleParadigm,
      prefetchKinetic,
    }),
    [paradigm, setParadigm, toggleParadigm, prefetchKinetic],
  );

  return (
    <ParadigmContext.Provider value={value}>
      {children}
      <div role="status" aria-live="polite" className="sr-only">
        {announcement}
      </div>
    </ParadigmContext.Provider>
  );
}

export function useParadigm(): ParadigmContextValue {
  const ctx = useContext(ParadigmContext);
  if (!ctx) throw new Error("useParadigm must be used within ParadigmProvider");
  return ctx;
}
