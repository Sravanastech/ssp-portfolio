import { test, expect, type Page, type ConsoleMessage } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";

/**
 * Dual-paradigm (Studio / Kinetic) end-to-end gate.
 * Run against the production build: PLAYWRIGHT_TEST_BUILD=1 npx playwright test e2e/paradigm.spec.ts
 */

const ROUTES = [
  "/",
  "/about",
  "/work",
  "/work/retail-ecommerce-storefront",
  "/contact",
  "/privacy",
  "/termsconditions",
];
const OLD_SWITCHERS = [
  ".theme-switcher",
  ".mode-toggle",
  ".composition-switcher",
];

function trackConsole(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (msg: ConsoleMessage) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  page.on("pageerror", (err) => errors.push(`pageerror: ${err.message}`));
  return errors;
}

const seg = (page: Page, mode: "studio" | "kinetic") =>
  page.locator(`.mode-switch button[data-mode="${mode}"]`);

async function paradigmState(page: Page) {
  return page.evaluate(() => ({
    attr: document.documentElement.dataset.paradigm ?? null,
    stored: localStorage.getItem("portfolio-paradigm"),
    pressed: Array.from(
      document.querySelectorAll('.mode-switch button[data-mode="kinetic"]'),
    ).map((b) => b.getAttribute("aria-pressed")),
  }));
}

async function settle(page: Page) {
  // Wait for any in-flight view transition / portal marker to clear.
  await page.waitForFunction(
    () =>
      !document.documentElement.hasAttribute("data-paradigm-transition") &&
      !document.documentElement.hasAttribute("data-route-transition"),
    undefined,
    { timeout: 5000 },
  );
}

async function expectSwitchersHidden(page: Page) {
  for (const sel of OLD_SWITCHERS) {
    const shown = await page
      .locator(sel)
      .evaluateAll((els) =>
        els.some((el) => getComputedStyle(el).display !== "none"),
      );
    expect(shown, `${sel} should be hidden in kinetic`).toBe(false);
  }
}

test.describe("paradigm toggle (desktop)", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("toggle, persistence, focus, switchers", async ({ page }) => {
    const errors = trackConsole(page);
    await page.goto("/");
    await expect(page.locator("html")).not.toHaveAttribute(
      "data-paradigm",
      "kinetic",
    );
    await expect(page.locator(".mode-toggle:visible").first()).toBeVisible();

    const topBefore = await page.evaluate(
      () =>
        document.querySelector("header.studio-header")!.getBoundingClientRect()
          .top,
    );
    await seg(page, "kinetic").focus();
    await seg(page, "kinetic").click();
    await expect(page.locator("html")).toHaveAttribute(
      "data-paradigm",
      "kinetic",
    );
    await settle(page);
    await expect(
      page.getByRole("region", { name: "Kinetic telemetry ticker" }),
    ).toBeVisible();
    await expectSwitchersHidden(page);
    expect(
      await page.evaluate(() =>
        document.activeElement?.matches(
          '.mode-switch button[data-mode="kinetic"]',
        ),
      ),
    ).toBe(true);
    await expect(seg(page, "kinetic")).toHaveAttribute("aria-pressed", "true");
    const topAfter = await page.evaluate(
      () =>
        document.querySelector("header.studio-header")!.getBoundingClientRect()
          .top,
    );
    expect(
      Math.abs(topAfter - topBefore),
      "layout shift on toggle",
    ).toBeLessThan(1);
    expect(await page.locator("body").innerText()).not.toMatch(/return/i);
    // Active segment click is a no-op.
    await seg(page, "kinetic").click();
    await expect(page.locator("html")).toHaveAttribute(
      "data-paradigm",
      "kinetic",
    );

    await page.reload();
    await expect(page.locator("html")).toHaveAttribute(
      "data-paradigm",
      "kinetic",
    );
    await expect(
      page.getByRole("region", { name: "Kinetic telemetry ticker" }),
    ).toBeVisible();

    await seg(page, "studio").click();
    await expect(page.locator("html")).toHaveAttribute(
      "data-paradigm",
      "studio",
    );
    await settle(page);
    await expect(page.locator(".mode-toggle:visible").first()).toBeVisible();
    await expect(
      page.getByRole("region", { name: "Kinetic telemetry ticker" }),
    ).toHaveCount(0);
    expect(errors).toEqual([]);
  });

  test("rapid toggling stays consistent", async ({ page }) => {
    const errors = trackConsole(page);
    await page.goto("/");
    for (let i = 0; i < 10; i++) {
      await seg(page, i % 2 === 0 ? "kinetic" : "studio").click({ delay: 0 });
    }
    await settle(page);
    await page.waitForTimeout(200);
    let s = await paradigmState(page);
    expect(s.attr).toBe("studio"); // even number of toggles
    expect(s.stored).toBe(s.attr);
    expect(new Set(s.pressed)).toEqual(new Set(["false"]));
    await seg(page, "kinetic").click();
    await settle(page);
    s = await paradigmState(page);
    expect(s.attr).toBe("kinetic");
    expect(s.stored).toBe("kinetic");
    expect(new Set(s.pressed)).toEqual(new Set(["true"]));
    expect(errors).toEqual([]);
  });

  for (const paradigm of ["studio", "kinetic"] as const) {
    test(`all public routes in ${paradigm}: no errors, header persists`, async ({
      page,
    }) => {
      const errors = trackConsole(page);
      await page.addInitScript((p) => {
        localStorage.setItem("portfolio-paradigm", p);
      }, paradigm);
      await page.goto("/");
      await expect(page.locator("html")).toHaveAttribute(
        "data-paradigm",
        paradigm,
      );
      await page.evaluate(() => {
        (
          document.querySelector("header.studio-header") as HTMLElement
        ).dataset.e2eTag = "persist";
      });
      for (const route of ROUTES.slice(1).concat("/")) {
        // Client-side navigation through the router (same path as PrefetchLink).
        const link = page.locator(`a[href="${route}"]:visible`).first();
        if (await link.count()) {
          await link.click();
        } else {
          await page.evaluate((r) => {
            history.pushState({}, "", r);
            dispatchEvent(new PopStateEvent("popstate"));
          }, route);
        }
        await expect(page).toHaveURL(
          new RegExp(`${route.replace(/\//g, "\\/")}$`),
        );
        await settle(page);
        await expect(page.locator("main#main-content")).not.toBeEmpty();
        expect(
          await page.evaluate(
            () =>
              (
                document.querySelector(
                  "header.studio-header",
                ) as HTMLElement | null
              )?.dataset.e2eTag,
          ),
          `header remounted on ${route}`,
        ).toBe("persist");
        expect(
          await page.evaluate(() => document.documentElement.dataset.paradigm),
        ).toBe(paradigm);
      }
      expect(errors).toEqual([]);
    });
  }
});

test.describe("reduced motion", () => {
  test.use({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });

  test("toggle applies instantly without view transition", async ({ page }) => {
    const errors = trackConsole(page);
    await page.goto("/");
    await seg(page, "kinetic").click();
    // Synchronous path: attribute present immediately, no portal marker.
    const s = await page.evaluate(() => ({
      p: document.documentElement.dataset.paradigm,
      vt: document.documentElement.hasAttribute("data-paradigm-transition"),
    }));
    expect(s).toEqual({ p: "kinetic", vt: false });
    const ticker = page.locator(".kinetic-ticker");
    await expect(ticker).toHaveAttribute("data-paused", "true");
    await seg(page, "studio").click();
    await expect(page.locator("html")).toHaveAttribute(
      "data-paradigm",
      "studio",
    );
    expect(errors).toEqual([]);
  });
});

test.describe("mobile 390x844", () => {
  test.use({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });

  test("mode strip reachable and usable; kinetic usable", async ({ page }) => {
    const errors = trackConsole(page);
    await page.goto("/");
    const kin = seg(page, "kinetic");
    await expect(kin).toBeVisible();
    const box = await kin.boundingBox();
    expect(box!.width).toBeGreaterThanOrEqual(44);
    expect(box!.height).toBeGreaterThanOrEqual(44);
    await kin.tap();
    await expect(page.locator("html")).toHaveAttribute(
      "data-paradigm",
      "kinetic",
    );
    await settle(page);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await mkdir("test-results/paradigm", { recursive: true });
    await page.screenshot({
      path: "test-results/paradigm/mobile-kinetic-home.png",
    });
    await seg(page, "studio").tap();
    await expect(page.locator("html")).toHaveAttribute(
      "data-paradigm",
      "studio",
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    expect(errors).toEqual([]);
  });
});

/* ------------------------------------------------------------ ticker strip */

for (const width of [1440, 1920, 3440]) {
  test.describe(`ticker strip ${width}`, () => {
    test.use({ viewport: { width, height: 800 } });

    test("pause fixed, seamless loop, inside viewport", async ({ page }) => {
      const errors = trackConsole(page);
      await page.addInitScript(() =>
        localStorage.setItem("portfolio-paradigm", "kinetic"),
      );
      await page.goto("/");
      const pause = page.locator(".kinetic-pause");
      await expect(pause).toBeVisible();
      const box = async () => (await pause.boundingBox())!;
      const before = await box();
      expect(before.x).toBeGreaterThanOrEqual(0);
      expect(before.x + before.width).toBeLessThanOrEqual(width);
      await pause.click();
      await page.mouse.move(5, 400);
      await expect(pause).toHaveText("Play");
      const paused = await box();
      expect(paused.x).toBe(before.x);
      expect(paused.width).toBe(before.width);
      // frozen while paused
      const t1 = await page.evaluate(
        () =>
          getComputedStyle(document.querySelector(".kinetic-ticker-track")!)
            .translate,
      );
      await page.waitForTimeout(300);
      const t2 = await page.evaluate(
        () =>
          getComputedStyle(document.querySelector(".kinetic-ticker-track")!)
            .translate,
      );
      expect(t2).toBe(t1);
      await pause.click();
      await page.mouse.move(5, 400);
      await expect(pause).toHaveText("Pause");
      const resumed = await box();
      expect(resumed.x).toBe(before.x);
      expect(resumed.width).toBe(before.width);

      // never overlaps the ticker viewport or the mode switch
      const rects = await page.evaluate(() => {
        const r = (s: string) =>
          document.querySelector(s)!.getBoundingClientRect();
        const v = r(".kinetic-ticker-viewport");
        const p = r(".kinetic-pause");
        const sw = r(".mode-switch");
        return {
          vRight: v.right,
          pLeft: p.left,
          pRight: p.right,
          swLeft: sw.left,
        };
      });
      expect(rects.vRight).toBeLessThanOrEqual(rects.pLeft + 0.5);
      expect(rects.pRight).toBeLessThanOrEqual(rects.swLeft + 0.5);

      // seam: copy width == half the track and translate never exceeds it
      const seam = await page.evaluate(
        () =>
          new Promise<{ copy: number; track: number; max: number; vw: number }>(
            (resolve) => {
              const t = document.querySelector(
                ".kinetic-ticker-track",
              ) as HTMLElement;
              const c = document.querySelector("[data-copy=primary]")!;
              const vw = document
                .querySelector(".kinetic-ticker-viewport")!
                .getBoundingClientRect().width;
              let max = 0;
              const start = performance.now();
              const tick = () => {
                const tr = new DOMMatrix(getComputedStyle(t).transform);
                max = Math.max(max, Math.abs(tr.m41));
                if (performance.now() - start < 1500)
                  requestAnimationFrame(tick);
                else
                  resolve({
                    copy: c.getBoundingClientRect().width,
                    track: t.getBoundingClientRect().width,
                    max,
                    vw,
                  });
              };
              tick();
            },
          ),
      );
      expect(seam.copy * 2).toBeCloseTo(seam.track, 0); // -50% is one whole copy incl. gap
      expect(seam.copy).toBeGreaterThanOrEqual(seam.vw); // never blank at the right edge
      expect(seam.max).toBeLessThanOrEqual(seam.copy);
      expect(errors).toEqual([]);
    });
  });
}

test.describe("ticker strip 390", () => {
  test.use({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });
  test("ticker hidden, strip + switch intact, no overflow", async ({
    page,
  }) => {
    await page.addInitScript(() =>
      localStorage.setItem("portfolio-paradigm", "kinetic"),
    );
    await page.goto("/");
    await expect(seg(page, "kinetic")).toBeVisible();
    await expect(page.locator(".kinetic-pause")).toBeHidden();
    const sw = (await page.locator(".mode-switch").boundingBox())!;
    expect(sw.x + sw.width).toBeLessThanOrEqual(390);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  });
});

/* ------------------------------------------------------------------ perf */

async function installObservers(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as {
      __lt: { start: number; dur: number }[];
      __cls: { start: number; value: number }[];
    };
    w.__lt = [];
    w.__cls = [];
    new PerformanceObserver((l) => {
      for (const e of l.getEntries())
        w.__lt.push({ start: e.startTime, dur: e.duration });
    }).observe({ type: "longtask", buffered: true });
    new PerformanceObserver((l) => {
      for (const e of l.getEntries() as unknown as {
        startTime: number;
        value: number;
        hadRecentInput: boolean;
      }[])
        if (!e.hadRecentInput)
          w.__cls.push({ start: e.startTime, value: e.value });
    }).observe({ type: "layout-shift", buffered: true });
  });
}

async function measure(page: Page, label: string, action: () => Promise<void>) {
  const t0 = await page.evaluate(() => performance.now());
  await action();
  await settle(page);
  await page.waitForTimeout(800);
  return page.evaluate(
    ({ t0, label }) => {
      const w = window as unknown as {
        __lt: { start: number; dur: number }[];
        __cls: { start: number; value: number }[];
      };
      const lts = w.__lt.filter((e) => e.start >= t0);
      const cls = w.__cls
        .filter((e) => e.start >= t0)
        .reduce((a, e) => a + e.value, 0);
      performance.measure(label, { start: t0 });
      return {
        label,
        longest: Math.round(Math.max(0, ...lts.map((e) => e.dur))),
        count: lts.length,
        cls: Number(cls.toFixed(4)),
      };
    },
    { t0, label },
  );
}

for (const rate of [1, 4]) {
  test(`perf at ${rate}x CPU`, async ({ page, context }) => {
    test.setTimeout(90_000);
    await page.setViewportSize({ width: 1440, height: 900 });
    await installObservers(page);
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    const cdp = await context.newCDPSession(page);
    await cdp.send("Emulation.setCPUThrottlingRate", { rate });
    await page.waitForTimeout(500);
    const results = [];
    // Hover-prefetch is part of the real flow, but measure cold: click directly.
    results.push(
      await measure(page, "studio->kinetic (cold)", async () => {
        await seg(page, "kinetic").dispatchEvent("click");
        await expect(page.locator("html")).toHaveAttribute(
          "data-paradigm",
          "kinetic",
        );
      }),
    );
    results.push(
      await measure(page, "kinetic->studio", async () => {
        await seg(page, "studio").dispatchEvent("click");
        await expect(page.locator("html")).toHaveAttribute(
          "data-paradigm",
          "studio",
        );
      }),
    );
    results.push(
      await measure(page, "route / -> /work (studio)", async () => {
        await page
          .locator('.studio-desktop-nav a[href="/work"]')
          .first()
          .click();
        await expect(page).toHaveURL(/\/work$/);
      }),
    );
    results.push(
      await measure(page, "route /work -> /about (studio)", async () => {
        await page
          .locator('.studio-desktop-nav a[href="/about"]')
          .first()
          .click();
        await expect(page).toHaveURL(/\/about$/);
      }),
    );
    results.push(
      await measure(page, "studio->kinetic (warm)", async () => {
        await seg(page, "kinetic").dispatchEvent("click");
        await expect(page.locator("html")).toHaveAttribute(
          "data-paradigm",
          "kinetic",
        );
      }),
    );
    results.push(
      await measure(page, "route /about -> /contact (kinetic)", async () => {
        await page
          .locator('.studio-desktop-nav a[href="/contact"]')
          .first()
          .click();
        await expect(page).toHaveURL(/\/contact$/);
      }),
    );
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
    await mkdir("test-results/paradigm", { recursive: true });
    await writeFile(
      `test-results/paradigm/perf-${rate}x.json`,
      JSON.stringify(results, null, 2),
    );
    console.log(`PERF ${rate}x`, JSON.stringify(results));
    if (rate === 1) {
      for (const r of results)
        expect(r.cls, `${r.label} CLS`).toBeLessThan(0.1);
    }
  });
}
