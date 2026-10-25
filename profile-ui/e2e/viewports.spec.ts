import { test, expect, type Page } from "@playwright/test";

/** Responsive gate: both paradigms across 720p..7680x2160 + small-screen regressions. */
const SIZES: Array<[number, number]> = [
  [1280, 720],
  [1366, 768],
  [1536, 864],
  [1920, 1080],
  [2560, 1440],
  [3440, 1440],
  [3840, 1080],
  [3840, 2160],
  [5120, 1440],
  [7680, 2160],
  [1024, 768],
  [768, 1024],
  [390, 844],
  [844, 390],
];
const ROUTES = ["/", "/work"];

async function measure(page: Page) {
  return page.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    const box = (sel: string) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { w: r.width, h: r.height, l: r.left, r: r.right };
    };
    const container = document.querySelector("main .studio-container");
    const cw = container?.getBoundingClientRect().width ?? 0;
    const beyond: string[] = [];
    document.querySelectorAll("header *, main *, footer *").forEach((el) => {
      const cs = getComputedStyle(el);
      if (cs.position === "fixed" || cs.display === "none") return;
      if (el.closest("[aria-hidden='true'], .kinetic-stage, svg")) return;
      if (el.closest("[style*='overflow'], .project-tabs, [class*='ticker']"))
        return;
      const r = el.getBoundingClientRect();
      if (r.width && r.right > vw + 1 && !el.closest("[data-scroll-x]")) {
        let p = el.parentElement;
        let clipped = false;
        while (p && p !== document.body) {
          const o = getComputedStyle(p).overflowX;
          if (o !== "visible") {
            clipped = true;
            break;
          }
          p = p.parentElement;
        }
        if (!clipped) beyond.push((el.className || el.tagName).toString());
      }
    });
    const strip = box(".mode-strip");
    return {
      vw,
      sw: document.documentElement.scrollWidth,
      header: box("header"),
      main: box("main"),
      footer: box("footer"),
      strip,
      cw,
      beyond: beyond.slice(0, 5),
    };
  });
}

for (const paradigm of ["studio", "kinetic"] as const) {
  for (const [w, h] of SIZES) {
    test(`${paradigm} ${w}x${h}`, async ({ page }) => {
      await page.setViewportSize({ width: w, height: h });
      await page.addInitScript(
        (p) => localStorage.setItem("portfolio-paradigm", p),
        paradigm,
      );
      for (const route of ROUTES) {
        await page.goto(route);
        await expect(page.locator("main")).toBeVisible();
        // Measure only once the app is hydrated in the requested paradigm, the
        // lazy Kinetic chunk (ticker) has mounted and fonts/layout have settled;
        // measuring mid-hydration on wide viewports was the source of flakes.
        await expect(page.locator("html")).toHaveAttribute(
          "data-paradigm",
          paradigm,
        );
        if (paradigm === "kinetic") {
          await expect(page.locator(".kinetic-ticker").first()).toBeAttached();
        }
        await page.waitForLoadState("networkidle");
        await page.evaluate(async () => {
          await document.fonts.ready;
          await new Promise<void>((done) =>
            requestAnimationFrame(() => requestAnimationFrame(() => done())),
          );
        });
        await expect(page.locator("header").first()).toBeVisible();
        await expect(page.locator("footer").first()).toBeAttached();
        const m = await measure(page);
        expect(m.sw, `${route} horizontal overflow`).toBeLessThanOrEqual(m.vw);
        expect(m.beyond, `${route} elements beyond viewport`).toEqual([]);
        expect(m.main!.w).toBeGreaterThan(m.vw * 0.9);
        expect(m.strip!.w).toBeGreaterThanOrEqual(m.vw - 1);
        expect(m.strip!.l).toBeLessThanOrEqual(1);
        if (m.cw) {
          if (w <= 1920) expect(m.cw).toBeGreaterThanOrEqual(m.vw * 0.55);
          else expect(m.cw).toBeGreaterThanOrEqual(1200);
          // wide screens must grow the container (not a 1280px sliver).
          if (w >= 3440) expect(m.cw).toBeGreaterThan(m.vw * 0.25);
        }
        // reading column stays <= ~80ch.
        const maxCh = await page.evaluate(() => {
          let worst = 0;
          document.querySelectorAll("main p").forEach((p) => {
            const el = p as HTMLElement;
            const cs = getComputedStyle(el);
            if (!el.offsetWidth || cs.display === "none") return;
            if ((el.textContent ?? "").length < 120) return;
            const probe = document.createElement("span");
            probe.style.cssText = `position:absolute;visibility:hidden;font:${cs.font};`;
            probe.textContent = "0".repeat(10);
            document.body.appendChild(probe);
            const ch = probe.getBoundingClientRect().width / 10;
            probe.remove();
            const inner =
              el.clientWidth -
              parseFloat(cs.paddingLeft) -
              parseFloat(cs.paddingRight);
            if (inner / ch > worst) {
              worst = inner / ch;
              (window as unknown as { __w: string }).__w = el.className;
            }
          });
          return worst;
        });
        expect(maxCh, `${route} paragraph width in ch`).toBeLessThanOrEqual(85);
      }
    });
  }
}
