import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const cssPath = resolve(
  import.meta.dirname,
  "../styles/kinetic-maximalist.css",
);

describe("kinetic-maximalist.css 2026 standards", () => {
  it("scopes radical overrides to :root[data-paradigm='kinetic']", () => {
    const css = readFileSync(cssPath, "utf8");
    expect(css).toContain(':root[data-paradigm="kinetic"]');
    expect(css).toContain("::view-transition-old(root)");
    expect(css).toContain("::view-transition-new(root)");
  });

  it("uses 2026 linear() spring easing, oklch interpolation, and scroll-driven @supports guards", () => {
    const css = readFileSync(cssPath, "utf8");
    expect(css).toContain("linear(");
    expect(css).toContain("in oklch");
    expect(css).toContain(
      "@supports ((animation-timeline: view()) and (animation-range: entry))",
    );
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
  });

  it("has balanced braces and hides legacy controls", () => {
    const css = readFileSync(cssPath, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    expect(css.split("{").length).toBe(css.split("}").length);
    expect(css).toContain(".composition-switcher");
    expect(css).toContain(".kinetic-reticle");
  });
});
