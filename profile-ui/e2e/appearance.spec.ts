import { test, expect } from "./fixtures";
import { appearanceTrigger, pickTheme } from "./appearance-helpers";

for (const width of [1440, 390]) {
  test(`light/dark appearance is switchable, compact and persistent at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    const html = page.locator("html");
    await expect(html).toHaveAttribute("data-theme", "sunrise");
    // Removed controls must stay gone.
    await expect(page.locator(".composition-switcher")).toHaveCount(0);
    await expect(page.getByRole("switch", { name: "Dark mode" })).toHaveCount(
      0,
    );
    await expect(appearanceTrigger(page)).toHaveAccessibleName("Appearance");

    await pickTheme(page, "Dark");
    await expect(html).toHaveAttribute("data-theme", "midnight");
    expect(await page.evaluate(() => localStorage.getItem("theme"))).toBe(
      "midnight",
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.reload();
    await expect(html).toHaveAttribute("data-theme", "midnight");
  });
}

test("System theme follows the OS live and persists as 'system'", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/");
  await pickTheme(page, "Dark");
  await pickTheme(page, "System");
  const html = page.locator("html");
  await expect(html).toHaveAttribute("data-theme", "sunrise");
  expect(await page.evaluate(() => localStorage.getItem("theme"))).toBe(
    "system",
  );
  await page.emulateMedia({ colorScheme: "dark" });
  await expect(html).toHaveAttribute("data-theme", "midnight");
  await page.reload();
  await expect(html).toHaveAttribute("data-theme", "midnight");
});
