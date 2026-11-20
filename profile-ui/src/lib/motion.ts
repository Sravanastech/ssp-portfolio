import { useEffect, useState } from "react";

export const FUI_EASE = "cubic-bezier(0.16, 1, 0.3, 1)";

export const FUI_DURATIONS = {
  grid: 900,
  reveal: 750,
  modal: 320,
} as const;

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
const SCRAMBLE_GLYPHS = "01/_<>[]#ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const DEFAULT_SCRAMBLE_MS = 1650;

export interface ScrambleOptions {
  delayMs?: number;
  durationMs?: number;
  seedKey?: number;
}

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
 * Decrypts `target` over `durationMs` (default 1650ms) after optional `delayMs`
 * using monospace glyphs via requestAnimationFrame when `active && !prefersReducedMotion()`.
 * Immediately returns `target` unchanged on SSR or reduced motion.
 */
export function useAsciiScramble(
  target: string,
  active = true,
  options: ScrambleOptions = {},
): string {
  const {
    delayMs = 0,
    durationMs = DEFAULT_SCRAMBLE_MS,
    seedKey = 0,
  } = options;
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
    const startTime = performance.now() + delayMs;

    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, Math.max(0, elapsed / durationMs));
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
  }, [target, active, delayMs, durationMs, seedKey]);

  if (!active || typeof window === "undefined" || prefersReducedMotion()) {
    return target;
  }

  return display;
}

/**
 * Animates every Text node inside a heading element from ASCII glyphs to its
 * exact original text over `durationMs`, preserving child elements like `<br />`
 * and restoring exact DOM text on completion or cleanup.
 */
export function decipherHeadingElement(
  heading: HTMLElement,
  options: { delayMs?: number; durationMs?: number } = {},
): () => void {
  if (typeof window === "undefined" || prefersReducedMotion()) {
    return () => {};
  }

  const { delayMs = 220, durationMs = 1250 } = options;
  const walker = document.createTreeWalker(heading, NodeFilter.SHOW_TEXT);
  const entries: Array<{ node: Text; original: string; offset: number }> = [];
  let totalLength = 0;

  let current = walker.nextNode();
  while (current) {
    const textNode = current as Text;
    const value = textNode.nodeValue ?? "";
    if (value.trim().length > 0) {
      entries.push({ node: textNode, original: value, offset: totalLength });
      totalLength += value.length;
    }
    current = walker.nextNode();
  }

  if (entries.length === 0 || totalLength === 0) {
    return () => {};
  }

  const hadAriaLabel = heading.hasAttribute("aria-label");
  const fullText = entries
    .map((e) => e.original)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
  if (!hadAriaLabel && fullText) {
    heading.setAttribute("aria-label", fullText);
  }

  let frameId = 0;
  let restored = false;
  const startTime = performance.now() + delayMs;

  const restore = () => {
    if (restored) return;
    restored = true;
    if (frameId) {
      window.cancelAnimationFrame(frameId);
      frameId = 0;
    }
    for (const entry of entries) {
      if (entry.node.nodeValue !== entry.original) {
        entry.node.nodeValue = entry.original;
      }
    }
    if (!hadAriaLabel) {
      heading.removeAttribute("aria-label");
    }
  };

  const step = (now: number) => {
    const elapsed = now - startTime;
    const progress = Math.min(1, Math.max(0, elapsed / durationMs));
    if (progress >= 1) {
      restore();
      return;
    }

    const resolvedCount = Math.floor(progress * totalLength);
    for (const entry of entries) {
      let next = "";
      for (let i = 0; i < entry.original.length; i += 1) {
        const ch = entry.original[i];
        const globalIdx = entry.offset + i;
        if (globalIdx < resolvedCount || /\s/.test(ch)) {
          next += ch;
        } else {
          const glyphIndex = Math.floor(Math.random() * SCRAMBLE_GLYPHS.length);
          next += SCRAMBLE_GLYPHS[glyphIndex];
        }
      }
      entry.node.nodeValue = next;
    }

    frameId = window.requestAnimationFrame(step);
  };

  frameId = window.requestAnimationFrame(step);
  return restore;
}

/**
 * Automatically applies the FUI ASCII decipher animation to the main
 * `h1.studio-page-heading` on every interior route when Aether mode is active,
 * including lazy-loaded Suspense pages.
 */
export function useRouteHeadingDecipher(
  active: boolean,
  pathname: string,
): void {
  useEffect(() => {
    if (
      !active ||
      typeof window === "undefined" ||
      typeof document === "undefined" ||
      prefersReducedMotion()
    ) {
      return;
    }

    let cancelScramble: (() => void) | null = null;
    let observer: MutationObserver | null = null;

    const tryAttach = (): boolean => {
      const root = document.getElementById("main-content") ?? document;
      const heading = root.querySelector<HTMLElement>("h1.studio-page-heading");
      if (!heading || !heading.textContent?.trim()) {
        return false;
      }
      cancelScramble = decipherHeadingElement(heading, {
        delayMs: 220,
        durationMs: 1250,
      });
      return true;
    };

    if (!tryAttach()) {
      const target = document.getElementById("main-content") ?? document.body;
      observer = new MutationObserver(() => {
        if (tryAttach()) {
          observer?.disconnect();
          observer = null;
        }
      });
      observer.observe(target, { childList: true, subtree: true });
    }

    return () => {
      observer?.disconnect();
      cancelScramble?.();
    };
  }, [active, pathname]);
}
