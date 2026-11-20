import { test, expect } from "./fixtures";

test.describe("Portfolio brand and navigation", () => {
  test("brand exposes its identity and a real home link", async ({ page }) => {
    await page.goto("/work");
    const brand = page.getByTestId("logo-link");
    await expect(brand).toBeVisible();
    await expect(brand).toHaveAccessibleName(
      /^Sravana S Parimi\s*Full-stack engineering$/,
    );
    await expect(brand).toHaveAttribute("href", "/");
    await expect(brand).toContainText("Sravana S Parimi");
    await expect(brand.locator(".studio-monogram")).toHaveText("sp.");
    await brand.click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.locator("main h1")).toBeVisible();
  });

  test("brand has a visible keyboard focus indicator", async ({ page }) => {
    await page.goto("/");
    // Production HTML is prerendered. Wait for the existing theme effect to
    // finish mounting React before tabbing into nodes that it will replace.
    await expect(page.locator("html")).toHaveAttribute("data-theme", "sunrise");
    await page.keyboard.press("Tab");
    await expect(
      page.getByRole("link", { name: "Skip to content" }),
    ).toBeFocused();
    // Next stops are the Studio/Kinetic/Aether mode strip, then the brand.
    await page.keyboard.press("Tab");
    await expect(page.getByRole("button", { name: "Studio" })).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(page.getByRole("button", { name: "Kinetic" })).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(page.getByRole("button", { name: "Aether" })).toBeFocused();
    await page.keyboard.press("Tab");
    const brand = page.getByTestId("logo-link");
    await expect(brand).toBeFocused();
    const focus = await brand.evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        width: parseFloat(style.outlineWidth),
        style: style.outlineStyle,
      };
    });
    expect(focus.width).toBeGreaterThanOrEqual(2);
    expect(focus.style).not.toBe("none");
  });

  test("desktop navigation exposes route links and current page", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/work");
    const navigation = page.getByRole("navigation", {
      name: "Main navigation",
      exact: true,
    });
    await expect(navigation).toBeVisible();
    await expect(
      navigation.getByRole("link", { name: "Work", exact: true }),
    ).toHaveAttribute("aria-current", "page");
    for (const [name, path] of [
      ["Home", "/"],
      ["Work", "/work"],
      ["About", "/about"],
      ["Contact", "/contact"],
      ["Resume", "/resume"],
    ]) {
      await expect(
        navigation.getByRole("link", { name, exact: true }),
      ).toHaveAttribute("href", path);
    }
  });
});
