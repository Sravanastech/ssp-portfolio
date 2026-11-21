import { useEffect, useState } from "react";
import { motionIsReduced } from "./motionPreference";

export const FUI_EASE = "cubic-bezier(0.16, 1, 0.3, 1)";

export const FUI_DURATIONS = {
  grid: 900,
  reveal: 750,
  modal: 320,
} as const;

const SCRAMBLE_GLYPHS = "01/_<>[]#ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const DEFAULT_SCRAMBLE_MS = 1650;
const SCRAMBLE_FRAME_MS = 33;

const NARROW_GLYPHS = ".:;|!'-+*~";
let measureCtx: CanvasRenderingContext2D | null | undefined;

/**
 * Returns a glyph picker for `el`'s font that never yields a glyph wider than the
 * character it replaces. Scrambled text is then never wider than the real text, so it
 * keeps (or shrinks) its line wrapping and painted area instead of growing past it,
 * which would re-wrap the heading and register as a later, larger paint.
 */
function createGlyphPicker(el: Element): (ch: string) => string {
  const fallback = () =>
    SCRAMBLE_GLYPHS[Math.floor(Math.random() * SCRAMBLE_GLYPHS.length)];
  try {
    if (measureCtx === undefined)
      measureCtx = document.createElement("canvas").getContext("2d");
    const ctx = measureCtx;
    if (!ctx) return fallback;
    const cs = getComputedStyle(el);
    ctx.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    const pool = Array.from(SCRAMBLE_GLYPHS + NARROW_GLYPHS);
    const widths = pool.map((g) => ctx.measureText(g).width);
    const narrowest = pool[widths.indexOf(Math.min(...widths))];
    const cache = new Map<string, string[]>();
    return (ch) => {
      let fits = cache.get(ch);
      if (!fits) {
        const limit = ctx.measureText(ch).width + 0.05;
        fits = pool.filter((_, i) => widths[i] <= limit);
        if (fits.length === 0) fits = [narrowest];
        cache.set(ch, fits);
      }
      return fits[Math.floor(Math.random() * fits.length)];
    };
  } catch {
    return fallback;
  }
}

export interface ScrambleOptions {
  delayMs?: number;
  durationMs?: number;
  seedKey?: number;
}

/** SSR-safe check: the OS preference or the site's "Reduce motion" switch. */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return motionIsReduced();
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
  options: {
    delayMs?: number;
    durationMs?: number;
    /** Pin the element's height while scrambling (block headings). Default true. */
    lockHeight?: boolean;
    /** Set a temporary aria-label so assistive tech never reads the glyphs. Default true. */
    announce?: boolean;
  } = {},
): () => void {
  if (typeof window === "undefined" || prefersReducedMotion()) {
    return () => {};
  }

  const {
    delayMs = 120,
    durationMs = 900,
    lockHeight = true,
    announce = true,
  } = options;
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

  // Scrambled glyphs are wider or narrower than the real text, which would re-wrap the
  // heading every frame and shove everything below it around (layout shift). Pin the
  // heading to its final height while it scrambles so only its own glyphs change.
  const finalHeight = heading.getBoundingClientRect().height;
  const previousHeight = heading.style.height;
  const previousOverflow = heading.style.overflow;
  if (lockHeight && finalHeight > 0) {
    heading.style.height = `${finalHeight}px`;
    heading.style.overflow = "hidden";
  }

  const hadAriaLabel = heading.hasAttribute("aria-label");
  const fullText = entries
    .map((e) => e.original)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
  if (announce && !hadAriaLabel && fullText) {
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
    heading.style.height = previousHeight;
    heading.style.overflow = previousOverflow;
    if (announce && !hadAriaLabel) {
      heading.removeAttribute("aria-label");
    }
  };

  const pickGlyph = createGlyphPicker(heading);
  let lastWrite = -Infinity;
  const step = (now: number) => {
    const elapsed = now - startTime;
    const progress = Math.min(1, Math.max(0, elapsed / durationMs));
    if (progress >= 1) {
      restore();
      return;
    }
    // ~30fps is plenty for a glyph shuffle and halves the style/layout work.
    if (now - lastWrite < SCRAMBLE_FRAME_MS) {
      frameId = window.requestAnimationFrame(step);
      return;
    }
    lastWrite = now;

    const resolvedCount = Math.floor(progress * totalLength);
    for (const entry of entries) {
      let next = "";
      for (let i = 0; i < entry.original.length; i += 1) {
        const ch = entry.original[i];
        const globalIdx = entry.offset + i;
        if (globalIdx < resolvedCount || /\s/.test(ch)) {
          next += ch;
        } else {
          next += pickGlyph(ch);
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
      const heading = root.querySelector<HTMLElement>(
        "h1.studio-page-heading:not([data-no-decipher])",
      );
      if (!heading || !heading.textContent?.trim()) {
        return false;
      }
      cancelScramble = decipherHeadingElement(heading, {
        delayMs: 120,
        durationMs: 900,
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
