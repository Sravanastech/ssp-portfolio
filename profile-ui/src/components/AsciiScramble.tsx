import { useEffect, useRef } from "react";
import { decipherHeadingElement } from "@/lib/motion";

interface AsciiScrambleProps {
  text: string;
  active: boolean;
  delayMs?: number;
  durationMs?: number;
  seedKey?: number;
}

/**
 * Decipher text. The real text is in the DOM from the first paint; the glyph shuffle
 * mutates its text node directly (about 30 writes a second, no React re-render and no
 * wider glyphs than the real text), then restores the exact text. So the page never
 * re-renders per frame and the scramble cannot re-wrap or shift anything around it.
 * Honours reduced motion.
 */
export default function AsciiScramble({
  text,
  active,
  delayMs = 0,
  durationMs = 900,
  seedKey = 0,
}: AsciiScrambleProps): React.ReactElement {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!active || !node) return;
    return decipherHeadingElement(node, {
      delayMs,
      durationMs,
      lockHeight: false,
      announce: false,
    });
  }, [active, text, delayMs, durationMs, seedKey]);

  return <span ref={ref}>{text}</span>;
}
