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

describe("aether-cinematic.css Singularity architecture & standards", () => {
  const rawCss = readFileSync(cssPath, "utf8");
  const strippedCss = rawCss.replace(/\/\*[\s\S]*?\*\//g, "");

  it("is never imported in index.css (lazy-loaded only)", () => {
    const indexCss = readFileSync(indexCssPath, "utf8");
    expect(indexCss).not.toMatch(/aether-cinematic\.css/);
    expect(indexCss).not.toMatch(/aether/);
  });

  it("has balanced braces and scopes every selector to :root[data-paradigm='aether']", () => {
    expect(strippedCss.split("{").length).toBe(strippedCss.split("}").length);
    const selectors = collectSelectors(rawCss);
    expect(selectors.length).toBeGreaterThan(0);

    const unscoped = selectors.filter(
      (sel) => !sel.startsWith(':root[data-paradigm="aether"]'),
    );
    expect(unscoped).toEqual([]);
  });

  it("uses pure stark cinema void on body with zero nebula/aurora gradients", () => {
    expect(strippedCss).toMatch(
      /:root\[data-paradigm="aether"\]\s+body\s*\{[^}]*background:\s*#050507\s*!important;/s,
    );
    expect(strippedCss).toMatch(
      /:root\[data-paradigm="aether"\]\s+body\s*\{[^}]*background-image:\s*none\s*!important;/s,
    );
    expect(strippedCss).not.toContain("in oklch");
    expect(strippedCss).not.toContain("background-attachment: fixed");
  });

  it("defines Singularity focal-point, shatter, spine, convergence, and HUD classes", () => {
    const requiredClasses = [
      ".aether-cinema",
      ".aether-singularity",
      ".aether-axis-x",
      ".aether-axis-y",
      ".aether-core",
      ".aether-chapters",
      ".aether-origin",
      ".aether-word",
      ".aether-work",
      ".aether-shard",
      ".aether-spine",
      ".aether-blade",
      ".aether-converge",
      ".aether-scroll-beam",
      ".aether-hud",
      ".aether-hud-btn",
    ];

    for (const cls of requiredClasses) {
      expect(rawCss).toContain(cls);
    }

    expect(rawCss).toContain("overflow-x: clip");
    expect(rawCss).toContain("min-height: 44px");
    expect(rawCss).toContain("var(--glow-x, 50%) var(--glow-y, 50%)");
    expect(rawCss).toContain('button[data-mode="aether"][aria-pressed="true"]');
  });

  it("guards scroll-driven progress behind @supports and enforces reduced-motion safety", () => {
    expect(rawCss).toContain(
      "@supports (animation-timeline: scroll(root block))",
    );
    expect(rawCss).toContain("animation-timeline: scroll(root block)");
    expect(rawCss).toContain("@media (prefers-reduced-motion: no-preference)");
    expect(rawCss).toContain("@media (prefers-reduced-motion: reduce)");
    expect(rawCss).toContain("transform: none !important");
    expect(rawCss).toContain("opacity: 1 !important");
    expect(rawCss).toContain("animation: none !important");
    expect(rawCss).toContain("transition: none !important");
  });
});
