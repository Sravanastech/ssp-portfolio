import { test, expect, type Page, type ConsoleMessage } from "./fixtures";

const ROUTES = ["/", "/work", "/about", "/contact"];

function trackConsole(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (msg: ConsoleMessage) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  page.on("pageerror", (err) => errors.push(`pageerror: ${err.message}`));
  return errors;
}

const seg = (page: Page, mode: "studio" | "kinetic" | "aether") =>
  page.locator(`.mode-switch button[data-mode="${mode}"]`);

async function settle(page: Page) {
  await page.waitForFunction(
    () =>
      !document.documentElement.hasAttribute("data-paradigm-transition") &&
      !document.documentElement.hasAttribute("data-route-transition"),
    undefined,
    { timeout: 5000 },
  );
}

test.describe("Aether 3rd paradigm (desktop)", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("switches Studio -> Aether -> Kinetic -> Studio cleanly with HUD and sound toggle", async ({
    page,
  }) => {
    const errors = trackConsole(page);
    await page.goto("/");

    // Switch to Aether
    await seg(page, "aether").click();
    await settle(page);
    expect(
      await page.evaluate(() => document.documentElement.dataset.paradigm),
    ).toBe("aether");
    expect(await seg(page, "aether").getAttribute("aria-pressed")).toBe("true");
    expect(await seg(page, "studio").getAttribute("aria-pressed")).toBe(
      "false",
    );

    // HUD mounts with Sound muted by default and toggles cleanly
    const hud = page.getByRole("region", {
      name: /aether observatory telemetry/i,
    });
    await expect(hud).toBeVisible();
    const soundBtn = page.getByRole("button", {
      name: /enable aether soundscape/i,
    });
    await expect(soundBtn).toHaveAttribute("aria-pressed", "false");
    await soundBtn.click();
    await expect(
      page.getByRole("button", { name: /mute aether soundscape/i }),
    ).toHaveAttribute("aria-pressed", "true");

    // Persistence across reload
    await page.reload();
    expect(
      await page.evaluate(() => document.documentElement.dataset.paradigm),
    ).toBe("aether");
    await expect(
      page.getByRole("region", { name: /aether observatory telemetry/i }),
    ).toBeVisible();

    // Switch Aether -> Kinetic -> Studio
    await seg(page, "kinetic").click();
    await settle(page);
    expect(
      await page.evaluate(() => document.documentElement.dataset.paradigm),
    ).toBe("kinetic");
    await expect(
      page.getByRole("region", { name: /aether observatory telemetry/i }),
    ).toHaveCount(0);

    await seg(page, "studio").click();
    await settle(page);
    expect(
      await page.evaluate(() => document.documentElement.dataset.paradigm),
    ).toBe("studio");

    expect(errors).toEqual([]);
  });

  test("all public routes render in Aether without console errors", async ({
    page,
  }) => {
    const errors = trackConsole(page);
    await page.goto("/");
    await seg(page, "aether").click();
    await settle(page);

    for (const route of ROUTES) {
      await page.goto(route);
      await expect(page.locator("header.studio-header")).toBeVisible();
      expect(
        await page.evaluate(() => document.documentElement.dataset.paradigm),
      ).toBe("aether");
    }
    expect(errors).toEqual([]);
  });
});

test.describe("Aether mobile 390x844", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("3-way mode strip and Aether HUD fit with zero horizontal overflow", async ({
    page,
  }) => {
    const errors = trackConsole(page);
    await page.goto("/");
    await seg(page, "aether").click();
    await settle(page);

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
    expect(errors).toEqual([]);
  });
});
