import { test, expect } from "./fixtures";
import {
  appearanceDialog,
  appearanceTrigger,
  closeAppearance,
  pickStyle,
  pickTheme,
} from "./appearance-helpers";

async function settle(page: import("@playwright/test").Page) {
  await page.waitForFunction(
    () => !document.documentElement.hasAttribute("data-paradigm-transition"),
    undefined,
    { timeout: 5000 },
  );
}

test.describe("Appearance panel (desktop)", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("opens by keyboard, switches style and theme, closes with focus return", async ({
    page,
  }) => {
    await page.goto("/");
    const trigger = appearanceTrigger(page);
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
    await expect(page.getByTestId("appearance-hint").first()).toBeVisible();

    await trigger.focus();
    await page.keyboard.press("Enter");
    const dialog = appearanceDialog(page);
    await expect(dialog).toBeVisible();
    await expect(trigger).toHaveAttribute("aria-expanded", "true");
    // Focus lands inside the panel, on the current style.
    await expect(dialog.getByRole("radio", { name: "Studio" })).toBeFocused();
    // Discovery dot is gone after the first open.
    await expect(page.getByTestId("appearance-hint")).toHaveCount(0);
    expect(
      await page.evaluate(() => localStorage.getItem("appearance-seen")),
    ).toBe("1");

    // Arrow keys move through the style radios and apply immediately.
    await page.keyboard.press("ArrowRight");
    await expect(page.locator("html")).toHaveAttribute(
      "data-paradigm",
      "kinetic",
    );
    await settle(page);
    await dialog.getByRole("radio", { name: "Aether" }).click();
    await expect(page.locator("html")).toHaveAttribute(
      "data-paradigm",
      "aether",
    );
    await settle(page);

    await dialog.getByRole("radio", { name: "Dark", exact: true }).click();
    await expect(page.locator("html")).toHaveAttribute(
      "data-theme",
      "midnight",
    );
    await expect(page.locator("html")).toHaveAttribute(
      "data-fui-theme",
      "void",
    );

    // Escape closes and returns focus to the trigger (Aether intro must not swallow it).
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(trigger).toBeFocused();
  });

  test("outside click closes the popover; reduce motion sets html[data-motion]", async ({
    page,
  }) => {
    await page.goto("/");
    const dialog = await (async () => {
      await appearanceTrigger(page).click();
      return appearanceDialog(page);
    })();
    await expect(dialog).toBeVisible();
    const sw = dialog.getByRole("switch", { name: "Reduce motion" });
    await expect(sw).toHaveAttribute("aria-checked", "false");
    await sw.click();
    await expect(page.locator("html")).toHaveAttribute(
      "data-motion",
      "reduced",
    );
    expect(
      await page.evaluate(() => localStorage.getItem("portfolio-motion")),
    ).toBe("reduced");
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute(
      "data-motion",
      "reduced",
    );

    await appearanceTrigger(page).click();
    await page.mouse.click(20, 500);
    await expect(appearanceDialog(page)).toHaveCount(0);
  });

  test("reset to defaults restores studio, system theme and motion", async ({
    page,
  }) => {
    await page.goto("/");
    await pickStyle(page, "kinetic", { keepOpen: true });
    await pickTheme(page, "Dark", { keepOpen: true });
    const dialog = appearanceDialog(page);
    await dialog.getByRole("switch", { name: "Reduce motion" }).click();
    await dialog.getByRole("button", { name: "Reset to defaults" }).click();
    await expect(page.locator("html")).toHaveAttribute(
      "data-paradigm",
      "studio",
    );
    await expect(dialog.getByRole("radio", { name: "System" })).toBeChecked();
    await expect(page.locator("html")).not.toHaveAttribute(
      "data-motion",
      "reduced",
    );
    await closeAppearance(page);
  });

  test("OS reduced motion locks the switch on", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await appearanceTrigger(page).click();
    const sw = appearanceDialog(page).getByRole("switch", {
      name: "Reduce motion",
    });
    await expect(sw).toBeDisabled();
    await expect(sw).toHaveAttribute("aria-checked", "true");
    await expect(page.getByText("Set by your device")).toBeVisible();
  });
});

test.describe("Appearance panel (mobile 390px)", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("opens as a modal bottom sheet, traps focus and closes", async ({
    page,
  }) => {
    await page.goto("/");
    const trigger = appearanceTrigger(page);
    const box = (await trigger.boundingBox())!;
    expect(box.width).toBeGreaterThanOrEqual(44);
    expect(box.height).toBeGreaterThanOrEqual(44);
    await trigger.click();
    const dialog = appearanceDialog(page);
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAttribute("aria-modal", "true");
    await expect(dialog).toHaveAttribute("data-presentation", "sheet");
    const sheet = (await dialog.boundingBox())!;
    expect(sheet.x).toBe(0);
    const clientWidth = await page.evaluate(
      () => document.documentElement.clientWidth,
    );
    expect(Math.round(sheet.x + sheet.width)).toBe(clientWidth);
    // Sheet is anchored to the bottom edge once its entrance animation ends.
    await expect
      .poll(async () => {
        const b = (await dialog.boundingBox())!;
        return Math.round(b.y + b.height);
      })
      .toBe(844);

    // Tab stays inside the sheet.
    for (let i = 0; i < 12; i++) {
      await page.keyboard.press("Tab");
      expect(
        await page.evaluate(
          () => !!document.activeElement?.closest('[role="dialog"]'),
        ),
      ).toBe(true);
    }

    await dialog.getByRole("radio", { name: "Kinetic" }).click();
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
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(trigger).toBeFocused();
  });
});
