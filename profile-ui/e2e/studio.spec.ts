import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdir } from "node:fs/promises";

for (const width of [1440, 390]) {
  test(`three compositions at ${width}px are accessible and persist`, async ({
    page,
  }) => {
    await mkdir("artifacts/studio", { recursive: true });
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/");
    await page.evaluate(() => document.fonts.ready);
    for (const [id, name] of [
      ["a", "Bold"],
      ["b", "Bright"],
      ["c", "Spatial"],
    ]) {
      await page.locator(".appearance-settings").evaluate((el) => {
        (el as HTMLDetailsElement).open = true;
      });
      await page.getByRole("radio", { name: new RegExp(name) }).click();
      await expect(page.locator(".studio-shell")).toHaveAttribute(
        "data-composition",
        id,
      );
      await expect(
        page.getByRole("radio", { name: new RegExp(name) }),
      ).toBeChecked();
      await page.getByText("Appearance settings", { exact: true }).click();
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(650);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page.screenshot({
        path: `artifacts/studio/home-${id}-${width}.png`,
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
        expect(
          await explanation.evaluate(
            (el) => el.getBoundingClientRect().top + window.scrollY,
          ),
        ).toBe(initialTop);
      }
      const result = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();
      expect(
        result.violations.filter(
          (v) => v.impact === "serious" || v.impact === "critical",
        ),
      ).toEqual([]);
    }
    await page.reload();
    await expect(page.locator(".studio-shell")).toHaveAttribute(
      "data-composition",
      "c",
    );
    await page.getByRole("button", { name: /Develop/ }).click();
    await expect(
      page.getByRole("heading", { name: "Build the complete experience." }),
    ).toBeVisible();
    await page.getByRole("button", { name: /Deliver/ }).click();
    await expect(
      page.getByRole("heading", { name: "Bring the work into production." }),
    ).toBeVisible();
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
    .getByRole("link", { name: "Work", exact: true })
    .click();
  await expect(page).toHaveURL(/\/work$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Work that connects",
  );
});

test("reduced motion and keyboard layout selection", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.getByText("Appearance settings", { exact: true }).click();
  const first = page.getByRole("radio", { name: /Bold/ });
  await first.focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.locator(".studio-shell")).toHaveAttribute(
    "data-composition",
    "b",
  );
  expect(
    await page
      .locator(".composition-switcher label")
      .first()
      .evaluate((el) => getComputedStyle(el).transitionDuration),
  ).toBe("1e-05s");
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

test("all color palettes preserve composition contrast", async ({ page }) => {
  for (const theme of ["woodland", "ocean"]) {
    await page.goto("/");
    await page.evaluate((value) => localStorage.setItem("theme", value), theme);
    await page.reload();
    await page.getByText("Appearance settings", { exact: true }).click();
    for (const name of ["Bold", "Bright", "Spatial"]) {
      await page.getByRole("radio", { name: new RegExp(name) }).click();
      await expect(
        page.getByRole("radio", { name: new RegExp(name) }),
      ).toBeChecked();
      await page.waitForTimeout(600);
      const result = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();
      expect(
        result.violations.filter(
          (v) => v.impact === "serious" || v.impact === "critical",
        ),
      ).toEqual([]);
    }
  }
});
