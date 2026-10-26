import { test, expect } from "./fixtures";
import AxeBuilder from "@axe-core/playwright";
import { mkdir } from "node:fs/promises";

for (const width of [1440, 390]) {
  test(`home workflow is keyboard operable and accessible at ${width}px`, async ({
    page,
  }) => {
    await mkdir("artifacts/studio", { recursive: true });
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/");
    await page.evaluate(() => document.fonts.ready);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `artifacts/studio/home-${width}.png`,
      fullPage: true,
    });
    const explanation = page.locator(".workflow-detail");
    // Keyboard focus can scroll the viewport; measure position in the document.
    const initialTop = await explanation.evaluate(
      (el) => el.getBoundingClientRect().top + window.scrollY,
    );
    for (const [stage, heading] of [
      ["Architect", "Give the system a clear foundation."],
      ["Design", "Make complex work feel clear."],
      ["Plan", "Turn direction into actionable work."],
      ["Develop", "Build the complete experience."],
      ["Deliver", "Bring the work into production."],
    ]) {
      const button = page.getByRole("button", { name: new RegExp(stage) });
      await button.focus();
      await page.keyboard.press("Enter");
      await expect(button).toHaveAttribute("aria-pressed", "true");
      await expect(
        explanation.getByRole("heading", { name: heading }),
      ).toBeVisible();
      await expect(
        page.locator('.workflow-stage[aria-pressed="true"]'),
      ).toHaveCount(1);
      // Sub-pixel layout rounding varies by platform; a visible shift is >= 1px.
      const top = await explanation.evaluate(
        (el) => el.getBoundingClientRect().top + window.scrollY,
      );
      expect(Math.abs(top - initialTop)).toBeLessThan(1);
    }
    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(
      result.violations.filter(
        (v) => v.impact === "serious" || v.impact === "critical",
      ),
    ).toEqual([]);
  });
}

test("mobile navigation supports keyboard dismissal and real links", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const trigger = page.getByRole("button", { name: "Open navigation menu" });
  await trigger.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(trigger).toBeFocused();
  await trigger.click();
  await page
    .getByRole("navigation", { name: "Mobile navigation" })
    .getByRole("link", { name: /^Work\b/ })
    .click();
  await expect(page).toHaveURL(/\/work$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Work that connects",
  );
});

test("interior pages remain legible on desktop and mobile", async ({
  page,
}) => {
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const route of ["work", "about", "contact"]) {
      await page.goto(`/${route}`);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page.screenshot({
        path: `artifacts/studio/${route}-${width}.png`,
        fullPage: true,
      });
    }
  }
});

test("light and dark themes preserve contrast", async ({ page }) => {
  for (const theme of ["sunrise", "midnight"]) {
    await page.addInitScript(
      (value) => localStorage.setItem("theme", value),
      theme,
    );
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(
      result.violations.filter(
        (v) => v.impact === "serious" || v.impact === "critical",
      ),
    ).toEqual([]);
  }
});
