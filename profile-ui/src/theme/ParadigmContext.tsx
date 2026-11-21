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
import { prefersReducedMotion } from "@/lib/motion";
import { prefetchAetherStyles, prefetchKineticStyles } from "./paradigmStyles";

export type Paradigm = "studio" | "kinetic" | "aether";

export interface ParadigmOrigin {
  x: number;
  y: number;
}

export interface ParadigmContextValue {
  paradigm: Paradigm;
  isKinetic: boolean;
  isAether: boolean;
  setParadigm: (next: Paradigm, origin?: ParadigmOrigin) => void;
  toggleParadigm: (origin?: ParadigmOrigin) => void;
  prefetchKinetic: () => void;
  prefetchAether: () => void;
}

interface ViewTransitionLike {
  ready: Promise<void>;
  finished: Promise<void>;
  skipTransition: () => void;
}

type StartViewTransition = (cb: () => void) => ViewTransitionLike;

const STORAGE_KEY = "portfolio-paradigm";
const SHOCKWAVE_MS = 680;
const SHOCKWAVE_EASING = "cubic-bezier(0.16, 1, 0.3, 1)";

/** Paradigm for visitors with no (or an invalid) stored choice, and for SSR/prerender. */
const DEFAULT_PARADIGM: Paradigm = "aether";

// Default value keeps components usable outside a provider (no-op controls, default design).
const noop = () => undefined;
const ParadigmContext = createContext<ParadigmContextValue>({
  paradigm: DEFAULT_PARADIGM,
  isKinetic: false,
  isAether: true,
  setParadigm: noop,
  toggleParadigm: noop,
  prefetchKinetic: noop,
  prefetchAether: noop,
});

function readStoredParadigm(): Paradigm {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "studio" || stored === "kinetic" || stored === "aether")
      return stored;
    return DEFAULT_PARADIGM;
  } catch {
    return DEFAULT_PARADIGM; // Storage can be disabled.
  }
}

function writeStoredParadigm(next: Paradigm) {
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // Storage can be disabled; the in-memory paradigm still applies.
  }
}

function getStartViewTransition(): StartViewTransition | null {
  if (typeof document === "undefined") return null;
  const start = (
    document as Document & { startViewTransition?: StartViewTransition }
  ).startViewTransition;
  return typeof start === "function" ? start.bind(document) : null;
}

const PARADIGM_ANNOUNCEMENTS: Record<Paradigm, string> = {
  studio: "Switched to Studio minimalist design",
  kinetic: "Switched to Kinetic maximalist design",
  aether: "Switched to Aether cinematic design",
};

// Never hold the toggle hostage to a slow stylesheet chunk: after this, snapshot anyway.
const STYLE_READY_TIMEOUT_MS = 1000;

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
    typeof window === "undefined" ? DEFAULT_PARADIGM : readStoredParadigm(),
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
    const stored = readStoredParadigm();
    if (stored === "kinetic") void prefetchKineticStyles();
    else if (stored === "aether") void prefetchAetherStyles();
  }, []);

  const prefetchKinetic = useCallback(() => {
    void prefetchKineticStyles();
  }, []);

  const prefetchAether = useCallback(() => {
    void prefetchAetherStyles();
  }, []);

  const setParadigm = useCallback(
    (next: Paradigm, origin?: ParadigmOrigin) => {
      if (typeof window === "undefined") return;
      if (next === "kinetic") void prefetchKineticStyles();
      else if (next === "aether") void prefetchAetherStyles();

      targetRef.current = next;
      writeStoredParadigm(next);
      const root = document.documentElement;
      setAnnouncement(PARADIGM_ANNOUNCEMENTS[next]);

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
      // Snapshot only after the target CSS is in, so the portal never reveals unstyled content.
      const vt = startViewTransition(async () => {
        if (targetRef.current === "kinetic") {
          await boundedWait(prefetchKineticStyles(), STYLE_READY_TIMEOUT_MS);
        } else if (targetRef.current === "aether") {
          await boundedWait(prefetchAetherStyles(), STYLE_READY_TIMEOUT_MS);
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
      isAether: paradigm === "aether",
      setParadigm,
      toggleParadigm,
      prefetchKinetic,
      prefetchAether,
    }),
    [paradigm, setParadigm, toggleParadigm, prefetchKinetic, prefetchAether],
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
  return useContext(ParadigmContext);
}
