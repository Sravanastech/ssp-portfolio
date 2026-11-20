import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const stylesDir = resolve(import.meta.dirname, "../styles");
const indexCssPath = resolve(import.meta.dirname, "../index.css");
const aetherCssPath = resolve(stylesDir, "aether-cinematic.css");
const aetherPartialsDir = resolve(stylesDir, "aether");
// Entry file plus every partial, so assertions are independent of the file split.
const aetherCss = [
  aetherCssPath,
  ...readdirSync(aetherPartialsDir)
    .sort()
    .map((f) => resolve(aetherPartialsDir, f)),
]
  .map((p) => readFileSync(p, "utf8"))
  .join("\n");

describe("aether-cinematic.css (FUI Minimalism Dual-Theme)", () => {
  it("is lazy-loaded and never imported in index.css", () => {
    const indexCss = readFileSync(indexCssPath, "utf8");
    expect(indexCss).not.toContain("aether-cinematic.css");
  });

  it("scopes rules to :root[data-paradigm='aether'] and defines VOID + CLEANROOM themes", () => {
    const css = aetherCss;
    expect(css).toContain(':root[data-paradigm="aether"]');
    expect(css).toContain('[data-fui-theme="void"]');
    expect(css).toContain('[data-fui-theme="cleanroom"]');
    expect(css).toContain("radial-gradient(");
    expect(css).toContain("24px 24px");
  });

  it("defines chamfered FUI bento modules, HUD frame, hardware switch, dossier, and command palette", () => {
    const css = aetherCss;
    expect(css).toContain("clip-path: polygon(");
    expect(css).toContain("cubic-bezier(0.16, 1, 0.3, 1)");
    expect(css).toContain(".fui-hud-frame");
    expect(css).toContain(".fui-hw-switch");
    expect(css).toContain(".fui-bento");
    expect(css).toContain(".fui-module");
    expect(css).toContain(".fui-dossier");
    expect(css).toContain(".fui-palette");
    expect(css).toContain(".fui-timeline");
    expect(css).toContain(".fui-closing");
  });

  it("uses AA-contrast Cleanroom accents and a visible palette focus ring", () => {
    const css = aetherCss;
    expect(css).toContain("--accent-primary: #c2410c;");
    expect(css).toContain("--accent-amber: #b45309;");
    expect(css).not.toContain("#ff4500");
    expect(css).not.toContain("#d97706");
    expect(css).toContain(".fui-palette-search:focus-within");
  });

  it("includes strict prefers-reduced-motion fallback", () => {
    const css = aetherCss;
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
  });
});
