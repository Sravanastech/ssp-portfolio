import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const stylesDir = resolve(import.meta.dirname, "../styles");
const indexCssPath = resolve(import.meta.dirname, "../index.css");
const aetherCssPath = resolve(stylesDir, "aether-cinematic.css");

describe("aether-cinematic.css (Take 3 — Movie Credits Cinema)", () => {
  it("is lazy-loaded and never imported in index.css", () => {
    const indexCss = readFileSync(indexCssPath, "utf8");
    expect(indexCss).not.toContain("aether-cinematic.css");
  });

  it("scopes all rules to :root[data-paradigm='aether'] and uses solid cinema dark ground", () => {
    const css = readFileSync(aetherCssPath, "utf8");
    expect(css).toContain(':root[data-paradigm="aether"]');
    expect(css).toContain("background-image: none !important");
    expect(css).not.toContain("aether-canvas");
  });

  it("defines the sticky Cinemascope stage, two-column end-credits roll, and scrubber", () => {
    const css = readFileSync(aetherCssPath, "utf8");
    expect(css).toContain(".aether-film");
    expect(css).toContain(".aether-stage-pin");
    expect(css).toContain(".aether-card");
    expect(css).toContain(".aether-credits-roll");
    expect(css).toContain(".aether-scrubber");
    expect(css).toContain(".aether-hud");
  });

  it("includes @supports scroll-driven beam and prefers-reduced-motion fallback", () => {
    const css = readFileSync(aetherCssPath, "utf8");
    expect(css).toContain("@supports (animation-timeline: scroll(root block))");
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
  });
});
