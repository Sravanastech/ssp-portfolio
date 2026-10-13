import { test, expect } from "@playwright/test";

for (const width of [1440, 390]) {
  test(`appearance choices are visible, compact and persistent at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await page.getByText("Appearance settings", { exact: true }).click();
    await expect(page.locator(".composition-switcher")).toContainText("Bold");
    await expect(page.locator(".composition-switcher")).toContainText(
      "Spatial",
    );
    for (const name of ["Woodland", "Sunrise", "Ocean"]) {
      const button = page.getByRole("button", {
        name: `${name} theme`,
        exact: true,
      });
      await button.click();
      await expect(button).toHaveAttribute("aria-pressed", "true");
      await expect(button).toContainText(name);
      for (const composition of ["Bold", "Bright", "Spatial"]) {
        const radio = page.getByRole("radio", {
          name: new RegExp(composition),
        });
        await radio.check();
        await expect(radio).toBeChecked();
        const label = radio.locator("..");
        await expect
          .poll(() =>
            label.evaluate((el) => getComputedStyle(el).backgroundColor),
          )
          .toBe("rgb(220, 233, 155)");
      }
    }
    const palette = await page.locator(".theme-switcher").boundingBox();
    expect(palette?.width).toBeLessThanOrEqual(440);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({ path: `artifacts/studio/appearance-${width}.png` });
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "ocean");
    await expect(page.locator(".studio-shell")).toHaveAttribute(
      "data-composition",
      "c",
    );
  });
}
