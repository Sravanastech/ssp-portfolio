/// <reference types="node" />
import { readFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";

const css = readFileSync("src/styles/mode-strip.css", "utf8");
const index = readFileSync("src/index.css", "utf8");

describe("mode strip css", () => {
  it("is imported exactly once from index.css, after studio-motion", () => {
    expect(index.match(/mode-strip\.css/g)).toHaveLength(1);
    expect(index.indexOf("mode-strip.css")).toBeGreaterThan(
      index.indexOf("studio-motion.css"),
    );
  });
  it("stays within the 0.9KB gzip budget", () => {
    expect(gzipSync(css).length).toBeLessThanOrEqual(922);
  });
  it("scopes the look to non-kinetic; shared base only touches mode-* classes", () => {
    const sels = css
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .match(/[^{}]+(?=\{)/g)!
      .map((s) => s.trim())
      .filter((s) => !s.startsWith("@"));
    for (const s of sels)
      for (const part of s.split(/,\s*/))
        expect(part).toMatch(
          /^(:root:not\(\[data-paradigm="kinetic"\]\) )?\.mode-(strip|switch)/,
        );
  });
  it("has 32px height and 44px under coarse pointer, no fill pill", () => {
    expect(css).toContain("block-size: 32px");
    expect(css).toMatch(/@media \(pointer: coarse\)[\s\S]*block-size: 45px/);
    expect(css).not.toContain("border-radius");
  });
});
