import { test as base, expect } from "@playwright/test";

/**
 * CI runners are low-end (<=4 cores): the app's lite tier defers its bundle past first
 * paint, so clicks on the prerendered DOM are lost. Every navigation therefore waits for
 * the app's html[data-app-ready] mount signal. E2E_LOW_END=1 emulates a weak device.
 */
const lowEnd = !!process.env.E2E_LOW_END || !!process.env.CI;

/**
 * Aether is the default design. A spec about another design opts in with
 * `test.use({ paradigm: "studio" })`: its stored choice is seeded once per tab, so
 * reloads and in-test style changes still behave like a real visitor's.
 */
type ParadigmOption = { paradigm: "studio" | "kinetic" | "aether" | undefined };

export const test = base.extend<ParadigmOption>({
  paradigm: [undefined, { option: true }],
  page: async ({ page, paradigm }, provide) => {
    if (paradigm) {
      await page.addInitScript((value) => {
        try {
          if (sessionStorage.getItem("e2e-paradigm-seeded")) return;
          sessionStorage.setItem("e2e-paradigm-seeded", "1");
          localStorage.setItem("portfolio-paradigm", value);
        } catch {
          /* storage unavailable */
        }
      }, paradigm);
    }
    if (lowEnd) {
      await page.addInitScript(() => {
        Object.defineProperty(navigator, "hardwareConcurrency", {
          get: () => 2,
        });
        Object.defineProperty(navigator, "deviceMemory", { get: () => 2 });
      });
    }
    if (lowEnd) {
      // Emulate a 2-vCPU runner: slower script execution widens the pre-hydration window.
      const cdp = await page.context().newCDPSession(page);
      await cdp.send("Emulation.setCPUThrottlingRate", {
        rate: Number(process.env.E2E_CPU_THROTTLE ?? 4),
      });
    }
    if (process.env.E2E_BUNDLE_DELAY) {
      await page.route(/\/assets\/index-[^/]+\.js$/, async (route) => {
        await new Promise((r) =>
          setTimeout(r, Number(process.env.E2E_BUNDLE_DELAY)),
        );
        await route.continue();
      });
    }
    const ready = () =>
      page.waitForSelector("html[data-app-ready]", { state: "attached" });
    for (const name of ["goto", "reload"] as const) {
      const original = page[name].bind(page) as (
        ...args: unknown[]
      ) => ReturnType<typeof page.goto>;
      (page as unknown as Record<string, unknown>)[name] = async (
        ...args: unknown[]
      ) => {
        const response = await original(...args);
        // waitUntil:"commit" opts out (pages that redirect away never mount the app).
        const opts = args[1] as { waitUntil?: string } | undefined;
        const optOut = process.env.E2E_NO_READY || opts?.waitUntil === "commit";
        if (!optOut) await ready();
        return response;
      };
    }
    await provide(page);
  },
});

export { expect };
