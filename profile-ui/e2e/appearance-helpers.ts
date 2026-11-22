import { expect, type Locator, type Page } from "@playwright/test";

export type Style = "studio" | "kinetic" | "aether";
export type ThemeChoice = "Light" | "Dark" | "System";

/** The Appearance dialog (popover on desktop, bottom sheet on small screens). */
export const appearanceDialog = (page: Page): Locator =>
  page.getByRole("dialog", { name: "Appearance" });

/** The header trigger that is currently on screen (desktop and mobile navs each have one). */
export const appearanceTrigger = (page: Page): Locator =>
  page.locator("[data-appearance-trigger]:visible").first();

export async function openAppearance(page: Page): Promise<Locator> {
  const dialog = appearanceDialog(page);
  if (!(await dialog.isVisible())) await appearanceTrigger(page).click();
  await expect(dialog).toBeVisible();
  return dialog;
}

export async function closeAppearance(page: Page): Promise<void> {
  const dialog = appearanceDialog(page);
  if (await dialog.isVisible()) {
    await dialog.getByRole("button", { name: "Close panel" }).click();
    await expect(dialog).toHaveCount(0);
  }
}

const STYLE_NAME: Record<Style, string> = {
  studio: "Studio",
  kinetic: "Kinetic",
  aether: "Aether",
};

/** Picks a style radio in the panel; leaves the panel open when `keepOpen` is set. */
export async function pickStyle(
  page: Page,
  style: Style,
  { keepOpen = false }: { keepOpen?: boolean } = {},
): Promise<void> {
  const dialog = await openAppearance(page);
  await dialog
    .getByRole("radio", { name: STYLE_NAME[style], exact: true })
    .click();
  await expect(
    dialog.getByRole("radio", { name: STYLE_NAME[style], exact: true }),
  ).toBeChecked();
  if (!keepOpen) await closeAppearance(page);
}

export async function pickTheme(
  page: Page,
  theme: ThemeChoice,
  { keepOpen = false }: { keepOpen?: boolean } = {},
): Promise<void> {
  const dialog = await openAppearance(page);
  await dialog.getByRole("radio", { name: theme, exact: true }).click();
  await expect(
    dialog.getByRole("radio", { name: theme, exact: true }),
  ).toBeChecked();
  if (!keepOpen) await closeAppearance(page);
}
