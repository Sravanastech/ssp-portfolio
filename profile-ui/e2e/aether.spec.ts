import { test, expect, type Page, type ConsoleMessage } from "./fixtures";
import { appearanceDialog, pickStyle, type Style } from "./appearance-helpers";

const ROUTES = [
  "/",
  "/work",
  "/work/enterprise-application-modernization",
  "/about",
  "/contact",
  "/privacy",
  "/termsconditions",
];

function trackConsole(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (msg: ConsoleMessage) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  page.on("pageerror", (err) => errors.push(`pageerror: ${err.message}`));
  return errors;
}

const choose = (page: Page, mode: Style) => pickStyle(page, mode);

async function settle(page: Page) {
  await page.waitForFunction(
    () =>
      !document.documentElement.hasAttribute("data-paradigm-transition") &&
      !document.documentElement.hasAttribute("data-route-transition"),
    undefined,
    { timeout: 5000 },
  );
}

test.describe("Aether FUI Minimalism (desktop)", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("switches Studio -> Aether (VOID & CLEANROOM) -> Dossier -> ⌘K -> Kinetic -> Studio", async ({
    page,
  }) => {
    const errors = trackConsole(page);
    await page.goto("/");

    // Switch to Aether
    await choose(page, "aether");
    await settle(page);
    expect(
      await page.evaluate(() => document.documentElement.dataset.paradigm),
    ).toBe("aether");
    // Default light theme (sunrise) derives fuiTheme=cleanroom
    expect(
      await page.evaluate(() => document.documentElement.dataset.fuiTheme),
    ).toBe("cleanroom");

    // HUD frame visible & hardware CLEANROOM -> VOID switch works (shared theme -> midnight)
    await expect(page.getByText(/SYS\.NOMINAL \/\/ 60FPS/i)).toBeVisible();
    // The HUD theme control opens the shared Appearance panel; Dark there drives the theme.
    await page
      .getByRole("button", { name: /open appearance settings/i })
      .click();
    const panel = appearanceDialog(page);
    await expect(panel).toBeVisible();
    await panel.getByRole("radio", { name: "Dark", exact: true }).click();
    expect(
      await page.evaluate(() => document.documentElement.dataset.fuiTheme),
    ).toBe("void");
    await expect(page.locator("html")).toHaveAttribute(
      "data-theme",
      "midnight",
    );
    await expect(
      panel.getByRole("radio", { name: "Dark", exact: true }),
    ).toBeChecked();
    // Escape closes the panel (and does not skip the intro or close anything else).
    await page.keyboard.press("Escape");
    await expect(panel).toHaveCount(0);

    // Open Technical Dossier modal from first Mission Module
    await page
      .getByRole("button", { name: /open technical dossier/i })
      .first()
      .click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);

    // Open ⌘K Command Palette via hero button
    await page
      .getByRole("button", { name: /press ⌘k for system menu/i })
      .click();
    await expect(
      page.getByRole("dialog", { name: /system command palette/i }),
    ).toBeVisible();
    await page.keyboard.press("Escape");

    // Persistence across reload
    await page.reload();
    expect(
      await page.evaluate(() => document.documentElement.dataset.paradigm),
    ).toBe("aether");
    expect(
      await page.evaluate(() => document.documentElement.dataset.fuiTheme),
    ).toBe("void");

    // Switch Aether -> Kinetic -> Studio
    await choose(page, "kinetic");
    await settle(page);
    expect(
      await page.evaluate(() => document.documentElement.dataset.paradigm),
    ).toBe("kinetic");

    await choose(page, "studio");
    await settle(page);
    expect(
      await page.evaluate(() => document.documentElement.dataset.paradigm),
    ).toBe("studio");

    expect(errors).toEqual([]);
  });

  test("all public routes render in Aether with sharp 0px corners, aligned 1180px rails, and zero console errors", async ({
    page,
  }) => {
    const errors = trackConsole(page);
    await page.goto("/");
    await choose(page, "aether");
    await settle(page);

    for (const route of ROUTES) {
      await page.goto(route);
      await expect(page.locator("header.studio-header")).toBeVisible();
      expect(
        await page.evaluate(() => document.documentElement.dataset.paradigm),
      ).toBe("aether");

      const layoutAudit = await page.evaluate(() => {
        const rounded: string[] = [];
        document.querySelectorAll("*").forEach((el) => {
          const r = getComputedStyle(el).borderRadius;
          if (r && r !== "0px") {
            rounded.push(`${el.tagName}.${el.className}:${r}`);
          }
        });
        const containers = Array.from(
          document.querySelectorAll(".studio-container, .fui-container"),
        ).map((el) => Math.round(el.getBoundingClientRect().width));
        const overflow =
          document.documentElement.scrollWidth - window.innerWidth;
        return { roundedCount: rounded.length, containers, overflow };
      });

      expect(layoutAudit.roundedCount).toBe(0);
      expect(layoutAudit.overflow).toBeLessThanOrEqual(1);
      for (const width of layoutAudit.containers) {
        expect(width).toBeLessThanOrEqual(1180);
      }
    }
    expect(errors).toEqual([]);
  });
});

test.describe("Aether FUI mobile 390x844", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("appearance panel, Bento grid, and HUD fit with zero horizontal overflow", async ({
    page,
  }) => {
    const errors = trackConsole(page);
    await page.goto("/");
    await choose(page, "aether");
    await settle(page);

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
    expect(errors).toEqual([]);
  });
});
