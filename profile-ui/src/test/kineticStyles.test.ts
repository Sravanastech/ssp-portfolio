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
    const css =
      readFileSync(cssPath, "utf8") +
      readFileSync(resolve(cssPath, "../kinetic-motion.css"), "utf8");
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

describe("kinetic motion hygiene", () => {
  const read = (name: string) =>
    readFileSync(
      resolve(import.meta.dirname, "../styles", name),
      "utf8",
    ).replace(/\/\*[\s\S]*?\*\//g, "");
  const main = read("kinetic-maximalist.css");
  const motion = read("kinetic-motion.css");
  const all = `${main}\n${motion}`;

  /** Walks CSS and yields each declaration with its stack of enclosing at-rule preludes. */
  function declarations(css: string) {
    const out: { name: string; value: string; stack: string[] }[] = [];
    const stack: string[] = [];
    let buf = "";
    for (const ch of css) {
      if (ch === "{") {
        stack.push(buf.trim());
        buf = "";
      } else if (ch === "}") {
        if (buf.trim()) push(buf);
        stack.pop();
        buf = "";
      } else if (ch === ";") {
        push(buf);
        buf = "";
      } else buf += ch;
    }
    function push(raw: string) {
      const i = raw.indexOf(":");
      if (i < 0) return;
      out.push({
        name: raw.slice(0, i).trim(),
        value: raw.slice(i + 1).trim(),
        stack: [...stack],
      });
    }
    return out;
  }
  const decls = declarations(all);
  const banned = new Set([
    "width",
    "height",
    "top",
    "left",
    "right",
    "bottom",
    "inset",
    "margin",
    "padding",
    "border-width",
    "font-size",
    "gap",
    "grid-template-columns",
    "box-shadow",
    "filter",
    "backdrop-filter",
    "background-position",
    "background-size",
  ]);

  it("imports the motion layer once and only the lazy loader pulls kinetic css", () => {
    expect(main.match(/@import\s+"\.\/kinetic-motion\.css"/g)).toHaveLength(1);
    const index = readFileSync(
      resolve(import.meta.dirname, "../index.css"),
      "utf8",
    );
    expect(index).not.toMatch(/kinetic/);
  });

  it("animates no layout/paint-heavy properties in keyframes or transitions", () => {
    const bad = decls.filter((d) => {
      if (d.stack.some((s) => s.startsWith("@keyframes")))
        return banned.has(d.name);
      if (d.name === "transition")
        return d.value
          .split(",")
          .some((part) => banned.has(part.trim().split(/\s+/)[0]));
      return false;
    });
    expect(bad).toEqual([]);
  });

  it("gates every animation behind prefers-reduced-motion: no-preference", () => {
    const ungated = decls.filter(
      (d) =>
        /^animation(-name)?$/.test(d.name) &&
        !/^none\b/.test(d.value) &&
        !d.stack.some((s) =>
          s.includes("prefers-reduced-motion: no-preference"),
        ),
    );
    expect(ungated).toEqual([]);
  });

  it("caps infinite animations at 6", () => {
    const n = decls.filter(
      (d) => d.name === "animation" && /\binfinite\b/.test(d.value),
    ).length;
    expect(n).toBeGreaterThan(0);
    expect(n).toBeLessThanOrEqual(6);
  });

  it("scroll-driven animations sit behind @supports", () => {
    const bad = decls.filter(
      (d) =>
        d.name === "animation-timeline" &&
        !d.stack.some((s) => s.startsWith("@supports")),
    );
    expect(bad).toEqual([]);
  });

  it("removes the circle chip from .studio-project-open and old toggles", () => {
    const chip = decls.filter(
      (d) =>
        d.stack.some((s) => /(^|\s)\.studio-project-open$/.test(s)) &&
        d.stack.length === 1,
    );
    const get = (n: string) => chip.find((d) => d.name === n)?.value;
    expect(chip.length).toBeGreaterThan(0);
    expect(get("border-radius")).toBe("0");
    expect(get("background")).toBe("none");
    expect(all).not.toContain(".paradigm-toggle");
    expect(all).not.toContain(".kinetic-hud");
  });

  it("ticker strip: seamless loop, fixed pause, no will-change leak", () => {
    const strip = (name: string) =>
      readFileSync(resolve(cssPath, "..", name), "utf8").replace(
        /\/\*[\s\S]*?\*\//g,
        "",
      );
    const max = strip("kinetic-maximalist.css");
    const motion = strip("kinetic-motion.css");
    // gap lives inside each copy, not between copies
    expect(max).toMatch(/\.kinetic-ticker-copy \{[^}]*padding: 0 48px 0 0/);
    expect(max).not.toMatch(/\.kinetic-ticker-track \{[^}]*gap:/);
    expect(max).toMatch(/\.kinetic-ticker-viewport \{[^}]*contain: paint/);
    // pause: fixed width, flow sibling (not absolutely positioned)
    const pause = max.match(/\.kinetic-pause \{[^}]*\}/)![0];
    expect(pause).toContain("inline-size: 56px");
    expect(pause).not.toContain("position: absolute");
    // pause via play-state only; hover pause fine-pointer only; focus never pauses
    expect(motion).toContain("animation-play-state: paused");
    expect(motion).toMatch(
      /@media \(hover: hover\) and \(pointer: fine\) \{[^@]*kinetic-ticker-viewport:hover/,
    );
    expect(motion).not.toMatch(/kinetic-ticker[^{,]*:focus-within/);
    const tickerRule = motion.match(/\.kinetic-ticker-track \{[^}]*\}/)![0];
    expect(tickerRule).not.toContain("will-change");
    // narrow screens hide the ticker, keep the strip
    expect(max).toMatch(
      /@media \(max-width: 479px\) \{[^@]*\.kinetic-stage \{\s*display: none/,
    );
  });
});
