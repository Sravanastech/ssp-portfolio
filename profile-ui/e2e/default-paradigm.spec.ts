import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { test, expect, type Page } from "./fixtures";
import { openAppearance, pickStyle } from "./appearance-helpers";

const paradigmOf = (page: Page) =>
  page.evaluate(() => document.documentElement.dataset.paradigm);

test.describe("Aether is the default design", () => {
  test("no stored choice renders Aether and leaves storage untouched", async ({
    page,
  }) => {
    await page.goto("/");
    expect(await paradigmOf(page)).toBe("aether");
    await expect(page.getByText(/SYS\.NOMINAL \/\/ 60FPS/i)).toBeVisible();
    expect(
      await page.evaluate(() => localStorage.getItem("portfolio-paradigm")),
    ).toBeNull();
  });

  test("an invalid stored value falls back to Aether", async ({ page }) => {
    await page.addInitScript(() =>
      localStorage.setItem("portfolio-paradigm", "bogus"),
    );
    await page.goto("/");
    expect(await paradigmOf(page)).toBe("aether");
  });

  for (const stored of ["studio", "kinetic"] as const) {
    test(`a stored ${stored} choice is respected`, async ({ page }) => {
      await page.addInitScript(
        (value) => localStorage.setItem("portfolio-paradigm", value),
        stored,
      );
      await page.goto("/");
      await expect.poll(() => paradigmOf(page)).toBe(stored);
      await expect(page.getByText(/SYS\.NOMINAL \/\/ 60FPS/i)).toHaveCount(0);
      await page.reload();
      expect(await paradigmOf(page)).toBe(stored);
    });
  }

  test("Studio stays unaffected by the Aether stylesheet", async ({ page }) => {
    await page.addInitScript(() =>
      localStorage.setItem("portfolio-paradigm", "studio"),
    );
    await page.goto("/");
    expect(await paradigmOf(page)).toBe("studio");
    // Studio chrome keeps its own surface; Aether tokens must not leak in.
    const tokens = await page.evaluate(() => {
      const style = getComputedStyle(document.documentElement);
      return {
        bgPrimary: style.getPropertyValue("--bg-primary").trim(),
        fuiTheme: document.documentElement.dataset.fuiTheme ?? null,
      };
    });
    expect(tokens).toEqual({ bgPrimary: "", fuiTheme: null });
    await expect(page.locator(".studio-container").first()).toBeVisible();
  });

  test("Reset to defaults returns to Aether", async ({ page }) => {
    await page.addInitScript(() =>
      localStorage.setItem("portfolio-paradigm", "kinetic"),
    );
    await page.goto("/");
    await expect.poll(() => paradigmOf(page)).toBe("kinetic");
    const dialog = await openAppearance(page);
    await dialog.getByRole("button", { name: "Reset to defaults" }).click();
    await expect(
      dialog.getByRole("radio", { name: "Aether", exact: true }),
    ).toBeChecked();
    await expect.poll(() => paradigmOf(page)).toBe("aether");
  });

  test("picking Studio persists and survives a reload", async ({ page }) => {
    await page.goto("/");
    await pickStyle(page, "studio");
    await expect.poll(() => paradigmOf(page)).toBe("studio");
    await page.reload();
    expect(await paradigmOf(page)).toBe("studio");
  });

  test("first-time visitors get the Aether boot once per session", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.locator("[data-boot]").first()).toHaveAttribute(
      "data-boot",
      "full",
    );
    await page.reload();
    await expect(page.locator("[data-boot]").first()).toHaveAttribute(
      "data-boot",
      "quick",
    );
  });

  test("reduced motion skips the full boot", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await expect(page.locator("[data-boot]").first()).toHaveAttribute(
      "data-boot",
      "quick",
    );
  });
});

test.describe("prerendered HTML", () => {
  const dist = (file: string) => resolve("dist", file);

  test("pages ship data-paradigm=aether and a render-blocking Aether stylesheet", () => {
    test.skip(!process.env.PLAYWRIGHT_TEST_BUILD, "needs a production build");
    for (const file of ["index.html", "about/index.html", "404.html"]) {
      const html = readFileSync(dist(file), "utf8");
      expect(html, file).toMatch(/<html[^>]*data-paradigm="aether"/);
      const link = html.match(
        /<link rel="stylesheet"[^>]*href="\/assets\/aether-cinematic-[\w-]+\.css"[^>]*>/,
      );
      expect(link, file).not.toBeNull();
      expect(link![0]).not.toMatch(/media=|disabled/);
      expect(html.indexOf(link![0])).toBeLessThan(html.indexOf("</head>"));
    }
  });

  test("first paint is Aether with JavaScript disabled", async ({
    browser,
  }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto("/");
    expect(await paradigmOf(page)).toBe("aether");
    const bg = await page.evaluate(
      () => getComputedStyle(document.documentElement).colorScheme,
    );
    expect(["light", "dark"]).toContain(bg);
    await context.close();
  });
});
