// Visitor motion preference: OS setting plus an optional in-page "Reduce motion" override.

export const MOTION_STORAGE_KEY = "portfolio-motion";
export const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

/** True when the operating system asks for reduced motion. */
export function osPrefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.matchMedia?.(REDUCED_MOTION_QUERY)?.matches ?? false;
  } catch {
    return false;
  }
}

/** True when the visitor turned "Reduce motion" on in this site (stored value "reduced"). */
export function readStoredMotionReduced(): boolean {
  try {
    return localStorage.getItem(MOTION_STORAGE_KEY) === "reduced";
  } catch {
    return false; // Storage can be disabled.
  }
}

/** Persists the override ("reduced" or unset) and reflects it on <html data-motion>. */
export function setMotionReduced(reduced: boolean): void {
  try {
    if (reduced) localStorage.setItem(MOTION_STORAGE_KEY, "reduced");
    else localStorage.removeItem(MOTION_STORAGE_KEY);
  } catch {
    /* Keep the in-memory preference. */
  }
  applyMotionAttribute(reduced);
}

/** Sets or clears html[data-motion="reduced"] without touching storage. */
export function applyMotionAttribute(reduced: boolean): void {
  if (typeof document === "undefined") return;
  if (reduced) document.documentElement.dataset.motion = "reduced";
  else delete document.documentElement.dataset.motion;
}

/** True when either the site override or the OS asks for reduced motion. */
export function motionIsReduced(): boolean {
  if (
    typeof document !== "undefined" &&
    document.documentElement.dataset.motion === "reduced"
  )
    return true;
  return osPrefersReducedMotion();
}
