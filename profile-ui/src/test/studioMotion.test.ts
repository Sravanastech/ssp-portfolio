/// <reference types="node" />
import { readFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";

const css = readFileSync("src/styles/studio-motion.css", "utf8");
const index = readFileSync("src/index.css", "utf8");

describe("studio motion", () => {
  it("is imported exactly once from index.css", () => {
    expect(index.match(/studio-motion\.css/g)).toHaveLength(1);
  });
  it("stays within the 2KB gzip budget", () => {
    expect(gzipSync(css).length).toBeLessThanOrEqual(2048);
  });
  it("scopes every selector to studio paradigm (or the shared toggle base)", () => {
    const sels = css
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/@keyframes[^{]+\{(?:[^{}]*\{[^{}]*\})+\s*\}/g, "")
      .match(/[^{}]+(?=\{)/g)!
      .map((s) => s.trim())
      .filter((s) => !s.startsWith("@"));
    for (const s of sels)
      for (const part of s.split(/,\s*(?=:root)/))
        expect(part).toMatch(
          /^(:root(\[data-paradigm="studio"\]|:not\(\[data-paradigm\]\)|:not\(\[data-paradigm="kinetic"\]\))|\.paradigm-toggle$)/,
        );
  });
  it("defines page view-transition enter/exit", () => {
    expect(css).toContain("::view-transition-old(page)");
    expect(css).toContain("::view-transition-new(page)");
  });
  it("gates scroll reveal behind @supports and reduced-motion", () => {
    expect(css).toMatch(
      /@supports \(animation-timeline: view\(\)\)\s*\{\s*@media \(prefers-reduced-motion: no-preference\)/,
    );
  });
  it("never animates layout properties", () => {
    expect(css).not.toMatch(/\b(width|height|top|left|margin|box-shadow)\s*:/);
  });
});
