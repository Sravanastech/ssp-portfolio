import { test, expect } from "./fixtures";

/**
 * The prerendered page must never go blank while React replaces it: after the first
 * painted frame with content, every frame (until well after the app mounts) still has
 * main content, whatever the bundle delay.
 */
const ROUTES = [
  "/",
  "/about",
  "/work",
  "/work/enterprise-application-modernization",
];

for (const delay of [0, 1500]) {
  for (const route of ROUTES) {
    test(`no blank frames across mount: ${route} (bundle +${delay}ms)`, async ({
      page,
    }) => {
      if (delay)
        await page.route(/\/assets\/index-[^/]+\.js$/, async (r) => {
          await new Promise((res) => setTimeout(res, delay));
          await r.continue();
        });
      await page.addInitScript(() => {
        const w = window as unknown as {
          __frames: { ok: boolean; ready: boolean }[];
        };
        w.__frames = [];
        const tick = () => {
          const main = document.getElementById("main-content");
          w.__frames.push({
            ok: !!main && (main.textContent ?? "").trim().length > 50,
            ready: document.documentElement.hasAttribute("data-app-ready"),
          });
          requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });
      await page.goto(route);
      await page.waitForTimeout(600);
      const frames = await page.evaluate(
        () =>
          (
            window as unknown as {
              __frames: { ok: boolean; ready: boolean }[];
            }
          ).__frames,
      );
      const first = frames.findIndex((f) => f.ok);
      expect(first, "content painted at least once").toBeGreaterThanOrEqual(0);
      expect(frames.some((f) => f.ready)).toBe(true);
      const missing = frames.slice(first).filter((f) => !f.ok).length;
      expect(missing, "frames without main content after first paint").toBe(0);
    });
  }
}
