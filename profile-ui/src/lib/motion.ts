import { useEffect, useState } from "react";

export const FUI_EASE = "cubic-bezier(0.16, 1, 0.3, 1)";

export const FUI_DURATIONS = {
  grid: 600,
  reveal: 480,
  modal: 320,
} as const;

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
const SCRAMBLE_GLYPHS = "01/_<>[]#";
const SCRAMBLE_DURATION_MS = 420;

/** SSR-safe check for the user's reduced-motion preference. */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.matchMedia?.(REDUCED_MOTION_QUERY)?.matches ?? false;
  } catch {
    return false;
  }
}

/**
 * Decrypts `target` over ~420ms using subtle monospace glyphs via
 * requestAnimationFrame when `active && !prefersReducedMotion()`.
 * Immediately returns `target` unchanged on SSR or reduced motion.
 */
export function useAsciiScramble(target: string, active = true): string {
  const [display, setDisplay] = useState(target);

  useEffect(() => {
    if (
      !active ||
      typeof window === "undefined" ||
      prefersReducedMotion() ||
      target.length === 0
    ) {
      setDisplay(target);
      return;
    }

    let frameId = 0;
    const startTime = performance.now();

    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, Math.max(0, elapsed / SCRAMBLE_DURATION_MS));
      if (progress >= 1) {
        setDisplay(target);
        return;
      }

      const resolvedCount = Math.floor(progress * target.length);
      let next = "";
      for (let i = 0; i < target.length; i += 1) {
        const ch = target[i];
        if (i < resolvedCount || /\s/.test(ch)) {
          next += ch;
        } else {
          const glyphIndex = Math.floor(Math.random() * SCRAMBLE_GLYPHS.length);
          next += SCRAMBLE_GLYPHS[glyphIndex];
        }
      }
      setDisplay(next);
      frameId = window.requestAnimationFrame(step);
    };

    frameId = window.requestAnimationFrame(step);

    return () => {
      if (frameId) {
        window.cancelAnimationFrame(frameId);
      }
    };
  }, [target, active]);

  if (!active || typeof window === "undefined" || prefersReducedMotion()) {
    return target;
  }

  return display;
}
