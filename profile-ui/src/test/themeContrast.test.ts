import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { themeConfig, type Theme } from "../theme/themeConfig";

const MIN = 4.5;

function parseHex(hex: string): [number, number, number] {
  let h = hex.trim().replace(/^#/, "");
  if (h.length === 3) h = [...h].map((c) => c + c).join("");
  if (!/^[0-9a-f]{6}$/i.test(h)) throw new Error(`Not a hex color: ${hex}`);
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as [
    number,
    number,
    number,
  ];
}

function luminance(hex: string): number {
  const [r, g, b] = parseHex(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

describe("studio theme contrast (themeConfig)", () => {
  for (const theme of Object.keys(themeConfig) as Theme[]) {
    const c = themeConfig[theme];
    const pairs: [string, string, string][] = [
      ["text/background", c.text, c.background],
      ["text/surface", c.text, c.surface],
      ["textSecondary/background", c.textSecondary, c.background],
      ["textSecondary/surface", c.textSecondary, c.surface],
      ["accent-on-primary", c.accent, c.primary],
    ];
    for (const [name, fg, bg] of pairs) {
      it(`${theme}: ${name} >= ${MIN}:1`, () => {
        expect(contrast(fg, bg)).toBeGreaterThanOrEqual(MIN);
      });
    }
  }
});

/** Read a CSS file and everything it @imports, recursively. */
function readCssTree(file: string, seen = new Set<string>()): string {
  if (seen.has(file)) return "";
  seen.add(file);
  const css = readFileSync(file, "utf8");
  const imports = [
    ...css.matchAll(
      /@import\s+(?:url\(\s*)?["']?([^"')\s;]+)["']?\s*\)?[^;]*;/g,
    ),
  ].map((m) => m[1]);
  return (
    css +
    "\n" +
    imports
      .filter((p) => !/^(https?:)?\/\//.test(p))
      .map((p) => readCssTree(resolve(dirname(file), p), seen))
      .join("\n")
  );
}

/** Collect custom properties declared in rules whose selector mentions the theme. */
function tokensFor(
  css: string,
  theme: "void" | "cleanroom",
): Map<string, string> {
  const tokens = new Map<string, string>();
  const noComments = css.replace(/\/\*[\s\S]*?\*\//g, "");
  for (const m of noComments.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const selector = m[1];
    const isVoid =
      /\[data-fui-theme="void"\]/.test(selector) ||
      (/^\s*:root\[data-paradigm="aether"\]\s*$/.test(selector.trim()) &&
        theme === "void");
    const isClean = /\[data-fui-theme="cleanroom"\]/.test(selector);
    const matches = theme === "void" ? isVoid : isClean;
    if (!matches) continue;
    for (const d of m[2].matchAll(
      /(--[\w-]+)\s*:\s*([^;]+?)(?:\s*!important)?\s*;/g,
    )) {
      tokens.set(d[1], d[2].trim());
    }
  }
  return tokens;
}

const aetherCss = readCssTree(
  resolve(import.meta.dirname, "../styles/aether-cinematic.css"),
);

describe("aether theme contrast (aether-cinematic.css tokens)", () => {
  for (const theme of ["void", "cleanroom"] as const) {
    const tokens = tokensFor(aetherCss, theme);
    const pairs: [string, string, string][] = [
      ["--text-primary", "--bg-primary", ""],
      ["--text-primary", "--bg-elevated", ""],
      ["--text-muted", "--bg-primary", ""],
      ["--text-muted", "--bg-elevated", ""],
      ["--accent-primary", "--bg-primary", ""],
      ["--accent-primary", "--bg-elevated", ""],
      ["--color-cta-text", "--color-cta-bg", ""],
    ];
    for (const [fgName, bgName] of pairs) {
      it(`${theme}: ${fgName} on ${bgName} >= ${MIN}:1`, (ctx) => {
        const fg = tokens.get(fgName);
        const bg = tokens.get(bgName);
        expect(fg, `${fgName} missing in ${theme}`).toBeDefined();
        expect(bg, `${bgName} missing in ${theme}`).toBeDefined();
        // rgba()/var() values cannot be resolved without alpha compositing; skip them.
        if (!/^#[0-9a-f]{3,6}$/i.test(fg!) || !/^#[0-9a-f]{3,6}$/i.test(bg!)) {
          ctx.skip();
          return;
        }
        expect(contrast(fg!, bg!)).toBeGreaterThanOrEqual(MIN);
      });
    }
  }
});
