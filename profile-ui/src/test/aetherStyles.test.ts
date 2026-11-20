import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const cssPath = resolve(import.meta.dirname, "../styles/aether-cinematic.css");
const indexCssPath = resolve(import.meta.dirname, "../index.css");

/** Strips CSS block comments and returns selector preludes for every non-at-rule block. */
function collectSelectors(rawCss: string): string[] {
  const css = rawCss.replace(/\/\*[\s\S]*?\*\//g, "");
  const selectors: string[] = [];
  const stack: string[] = [];
  let buf = "";

  for (const ch of css) {
    if (ch === "{") {
      const prelude = buf.trim();
      const insideKeyframes = stack.some((s) => s.startsWith("@keyframes"));
      if (prelude && !prelude.startsWith("@") && !insideKeyframes) {
        for (const part of prelude.split(",")) {
          const trimmed = part.trim();
          if (trimmed) selectors.push(trimmed);
        }
      }
      stack.push(prelude);
      buf = "";
    } else if (ch === "}") {
      stack.pop();
      buf = "";
    } else if (ch === ";") {
      buf = "";
    } else {
      buf += ch;
    }
  }

  return selectors;
}

describe("aether-cinematic.css architecture & standards", () => {
  const rawCss = readFileSync(cssPath, "utf8");
  const strippedCss = rawCss.replace(/\/\*[\s\S]*?\*\//g, "");

  it("is never imported in index.css (lazy-loaded only)", () => {
    const indexCss = readFileSync(indexCssPath, "utf8");
    expect(indexCss).not.toMatch(/aether-cinematic\.css/);
    expect(indexCss).not.toMatch(/aether/);
  });

  it("has balanced braces and scopes every theme selector to :root[data-paradigm='aether']", () => {
    expect(strippedCss.split("{").length).toBe(strippedCss.split("}").length);
    const selectors = collectSelectors(rawCss);
    expect(selectors.length).toBeGreaterThan(0);

    const unscoped = selectors.filter(
      (sel) => !sel.startsWith(':root[data-paradigm="aether"]'),
    );
    expect(unscoped).toEqual([]);
  });

  it("uses oklch interpolation, spatial frosted glass backdrop-filter, @supports scroll guards, and reduced-motion guards", () => {
    expect(rawCss).toContain("in oklch");
    expect(rawCss).toContain("backdrop-filter");
    expect(rawCss).toContain(
      "@supports ((animation-timeline: view()) and (animation-range: entry))",
    );
    expect(rawCss).toContain("@media (prefers-reduced-motion: reduce)");
    expect(rawCss).toContain("@media (prefers-reduced-motion: no-preference)");
    expect(rawCss).toContain("animation-timeline: scroll(root block)");
  });

  it("defines spatial glass specular glare, canvas/shell layering, and HUD mobile-safe controls", () => {
    expect(rawCss).toContain("var(--glow-x, 50%) var(--glow-y, 50%)");
    expect(rawCss).toContain(".aether-canvas");
    expect(rawCss).toContain(".studio-shell");
    expect(rawCss).toContain(".aether-scroll-beam");
    expect(rawCss).toContain(".aether-hud");
    expect(rawCss).toContain(".aether-hud-btn");
    expect(rawCss).toContain("min-height: 44px");
    expect(rawCss).toContain('button[data-mode="aether"][aria-pressed="true"]');
  });
});
