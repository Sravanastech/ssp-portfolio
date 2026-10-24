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

const toggle = (page: Page) => page.locator(".paradigm-toggle:visible").first();

async function paradigmState(page: Page) {
  return page.evaluate(() => ({
    attr: document.documentElement.dataset.paradigm ?? null,
    stored: localStorage.getItem("portfolio-paradigm"),
    pressed: Array.from(document.querySelectorAll(".paradigm-toggle")).map(
      (b) => b.getAttribute("aria-pressed"),
    ),
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

    await toggle(page).click();
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
        document.activeElement?.classList.contains("paradigm-toggle"),
      ),
    ).toBe(true);
    await expect(toggle(page)).toHaveAttribute("aria-pressed", "true");

    await page.reload();
    await expect(page.locator("html")).toHaveAttribute(
      "data-paradigm",
      "kinetic",
    );
    await expect(
      page.getByRole("region", { name: "Kinetic telemetry ticker" }),
    ).toBeVisible();

    await toggle(page).click();
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
      await toggle(page).click({ delay: 0 });
    }
    await settle(page);
    await page.waitForTimeout(200);
    let s = await paradigmState(page);
    expect(s.attr).toBe("studio"); // even number of toggles
    expect(s.stored).toBe(s.attr);
    expect(new Set(s.pressed)).toEqual(new Set(["false"]));
    await toggle(page).click();
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
    await toggle(page).click();
    // Synchronous path: attribute present immediately, no portal marker.
    const s = await page.evaluate(() => ({
      p: document.documentElement.dataset.paradigm,
      vt: document.documentElement.hasAttribute("data-paradigm-transition"),
    }));
    expect(s).toEqual({ p: "kinetic", vt: false });
    const ticker = page.locator(".kinetic-ticker");
    await expect(ticker).toHaveAttribute("data-paused", "true");
    await toggle(page).click();
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

  test("toggle reachable from mobile bar and menu; kinetic usable", async ({
    page,
  }) => {
    const errors = trackConsole(page);
    await page.goto("/");
    const bar = page.locator(".studio-mobile-nav .paradigm-toggle");
    await expect(bar).toBeVisible();
    const box = await bar.boundingBox();
    expect(box!.width).toBeGreaterThanOrEqual(44);
    expect(box!.height).toBeGreaterThanOrEqual(44);
    await bar.tap();
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
    // Menu path: open menu, toggle back to studio from inside it.
    await page.getByRole("button", { name: /menu/i }).first().tap();
    const inMenu = page
      .locator('[role="dialog"] .paradigm-toggle, nav .paradigm-toggle')
      .filter({ visible: true })
      .last();
    await expect(inMenu).toBeVisible();
    await inMenu.tap();
    await expect(page.locator("html")).toHaveAttribute(
      "data-paradigm",
      "studio",
    );
    expect(errors).toEqual([]);
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
        await page
          .locator(".studio-desktop-nav .paradigm-toggle")
          .dispatchEvent("click");
        await expect(page.locator("html")).toHaveAttribute(
          "data-paradigm",
          "kinetic",
        );
      }),
    );
    results.push(
      await measure(page, "kinetic->studio", async () => {
        await page
          .locator(".studio-desktop-nav .paradigm-toggle")
          .dispatchEvent("click");
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
        await page
          .locator(".studio-desktop-nav .paradigm-toggle")
          .dispatchEvent("click");
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
