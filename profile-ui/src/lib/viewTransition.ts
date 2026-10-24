/** Content-only route transitions via the View Transitions API (instant fallback). */
type ViewTransitionLike = {
  skipTransition(): void;
  finished: Promise<unknown>;
};
type DocWithVT = Document & {
  startViewTransition?: (cb: () => Promise<void>) => ViewTransitionLike;
};

const ROOT_FLAG = "data-route-transition";
let active: ViewTransitionLike | null = null;
let settle: (() => void) | null = null;
const COMMIT_TIMEOUT_MS = 300;

/** Called by LayoutRoute once a new pathname has committed; resolves the pending snapshot. */
export function notifyRouteCommitted(): void {
  settle?.();
}

export function supportsRouteTransition(): boolean {
  return (
    typeof document !== "undefined" &&
    typeof (document as DocWithVT).startViewTransition === "function"
  );
}

function reducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * Runs `update` (a synchronous, flushed navigation) inside a view transition when
 * supported and motion is allowed; otherwise runs it immediately. A new call skips
 * any transition still in flight. `data-route-transition` on <html> scopes the
 * `page` view-transition-name to route changes so other transitions are unaffected.
 */
export function runRouteTransition(update: () => void): void {
  if (!supportsRouteTransition() || reducedMotion()) {
    update();
    return;
  }
  active?.skipTransition();
  const root = document.documentElement;
  root.setAttribute(ROOT_FLAG, "");
  // BrowserRouter commits inside React.startTransition, so flushSync cannot force it.
  // The callback's promise stays pending until the new route commits (or times out).
  const transition = (document as DocWithVT).startViewTransition!(
    () =>
      new Promise<void>((resolve) => {
        const timer = setTimeout(done, COMMIT_TIMEOUT_MS);
        function done() {
          clearTimeout(timer);
          if (settle === done) settle = null;
          resolve();
        }
        settle = done;
        update();
      }),
  );
  active = transition;
  const clear = () => {
    if (active === transition) {
      active = null;
      root.removeAttribute(ROOT_FLAG);
    }
  };
  transition.finished.then(clear, clear);
}
