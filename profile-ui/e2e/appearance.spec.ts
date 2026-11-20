import { test, expect } from "./fixtures";

for (const width of [1440, 390]) {
  test(`light/dark appearance is switchable, compact and persistent at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    const html = page.locator("html");
    await expect(html).toHaveAttribute("data-theme", "sunrise");
    // Removed controls must stay gone.
    await expect(page.getByText("Appearance settings")).toHaveCount(0);
    await expect(page.locator(".composition-switcher")).toHaveCount(0);

    if (width >= 950) {
      const toggle = page.locator(".mode-toggle:visible");
      await toggle.click();
      await expect(html).toHaveAttribute("data-theme", "midnight");
      await expect(toggle).toHaveAccessibleName("Dark mode");
      await expect(toggle).toHaveAttribute("role", "switch");
      await expect(toggle).toHaveAttribute("aria-checked", "true");
    } else {
      await page.getByRole("button", { name: "Open navigation menu" }).click();
      const dialog = page.getByRole("dialog");
      const group = dialog.getByRole("group", { name: "Appearance" });
      const light = group.getByRole("button", { name: "Light" });
      const dark = group.getByRole("button", { name: "Dark" });
      await expect(light).toHaveAttribute("aria-pressed", "true");
      await dark.click();
      await expect(dark).toHaveAttribute("aria-pressed", "true");
      await expect(light).toHaveAttribute("aria-pressed", "false");
      await expect(html).toHaveAttribute("data-theme", "midnight");
      await page.keyboard.press("Escape");
    }
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.reload();
    await expect(html).toHaveAttribute("data-theme", "midnight");
  });
}
