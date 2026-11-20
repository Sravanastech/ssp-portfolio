import { test, expect } from "./fixtures";

test.describe("Responsive portfolio header", () => {
  for (const width of [375, 768, 1440]) {
    test(`brand and mode toggle fit at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/");
      const header = page.locator("header.studio-header");
      const brand = page.getByTestId("logo-link");
      const controls = header.locator(".mode-toggle:visible");
      await expect(controls).toHaveCount(1);
      await expect(controls).toHaveAccessibleName("Dark mode");
      await expect(header.locator(".composition-switcher")).toHaveCount(0);
      for (const value of ["midnight", "sunrise"]) {
        await controls.click();
        await expect(page.locator("html")).toHaveAttribute("data-theme", value);
        await expect(brand).toBeVisible();
        const brandBox = await brand.boundingBox();
        const controlsBox = await controls.boundingBox();
        expect(brandBox).not.toBeNull();
        expect(controlsBox).not.toBeNull();
        expect(brandBox!.x).toBeGreaterThanOrEqual(0);
        expect(brandBox!.x + brandBox!.width).toBeLessThanOrEqual(
          controlsBox!.x,
        );
        expect(controlsBox!.x + controlsBox!.width).toBeLessThanOrEqual(width);
        expect(
          await page.evaluate(() => document.documentElement.scrollWidth),
        ).toBeLessThanOrEqual(width);
      }
      await page.evaluate(() => window.scrollTo(0, 600));
      await expect.poll(async () => (await header.boundingBox())?.y).toBe(0);
      await expect(brand).toBeVisible();
      if (width < 950) {
        const trigger = page.getByRole("button", {
          name: "Open navigation menu",
        });
        await expect(trigger).toBeVisible();
        const triggerBox = await trigger.boundingBox();
        const controlsBox = await controls.boundingBox();
        expect(controlsBox!.x + controlsBox!.width).toBeLessThanOrEqual(
          triggerBox!.x,
        );
        expect(triggerBox!.x + triggerBox!.width).toBeLessThanOrEqual(width);
        await trigger.click();
        const navigation = page.getByRole("navigation", {
          name: "Mobile navigation",
        });
        await expect(navigation).toBeVisible();
        await navigation.getByRole("link", { name: /^Work\b/ }).click();
        await expect(page).toHaveURL(/\/work$/);
        await expect(navigation).not.toBeVisible();
      } else {
        await expect(
          page.getByRole("navigation", {
            name: "Main navigation",
            exact: true,
          }),
        ).toBeVisible();
      }
    });
  }
});
