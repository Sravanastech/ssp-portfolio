import AxeBuilder from "@axe-core/playwright";
import { test, expect, type Page } from "./fixtures";

type Paradigm = "studio" | "aether";
type Theme = "sunrise" | "midnight";

const PARADIGMS: Paradigm[] = ["studio", "aether"];
const THEMES: Theme[] = ["sunrise", "midnight"];
const VIEWPORTS = [
  { name: "mobile", width: 375, height: 812 },
  { name: "desktop", width: 1280, height: 800 },
];
const ROUTES = [
  "/",
  "/work",
  "/work/enterprise-application-modernization",
  "/contact",
];
const TAGS = ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"];

// Known app violations: key "paradigm|theme|viewport|route" -> violation description.
const KNOWN_ISSUES: Record<string, string> = {};

async function seed(page: Page, paradigm: Paradigm, theme: Theme) {
  await page.addInitScript(
    ([p, t]) => {
      localStorage.setItem("portfolio-paradigm", p);
      localStorage.setItem("theme", t);
    },
    [paradigm, theme],
  );
}

test.describe("axe accessibility matrix", () => {
  test.use({ reducedMotion: "reduce" });

  for (const paradigm of PARADIGMS) {
    for (const theme of THEMES) {
      for (const vp of VIEWPORTS) {
        test.describe(`${paradigm} / ${theme} / ${vp.name}`, () => {
          test.use({ viewport: { width: vp.width, height: vp.height } });

          for (const route of ROUTES) {
            const key = `${paradigm}|${theme}|${vp.name}|${route}`;
            const run = KNOWN_ISSUES[key] ? test.fixme : test;
            run(`${route} has no axe violations`, async ({ page }) => {
              await seed(page, paradigm, theme);
              await page.goto(route);
              await page.waitForFunction(
                (p) => document.documentElement.dataset.paradigm === p,
                paradigm,
              );
              // let lazy paradigm CSS and route transitions settle
              await page.waitForFunction(
                () =>
                  !document.documentElement.hasAttribute(
                    "data-paradigm-transition",
                  ) &&
                  !document.documentElement.hasAttribute(
                    "data-route-transition",
                  ),
              );
              await page.waitForTimeout(300);
              const { violations } = await new AxeBuilder({ page })
                .withTags(TAGS)
                .analyze();
              const summary = violations.map(
                (v) =>
                  `${v.id} (${v.nodes.length} nodes) first: ${v.nodes[0]?.target.join(" ")}`,
              );
              expect(summary, summary.join("\n")).toEqual([]);
            });
          }
        });
      }
    }
  }
});

test.describe("skip link keyboard flow", () => {
  test.use({ reducedMotion: "reduce", viewport: { width: 1280, height: 800 } });

  for (const paradigm of PARADIGMS) {
    test(`${paradigm}: first Tab hits skip link and moves focus to #main-content`, async ({
      page,
    }) => {
      await seed(page, paradigm, "sunrise");
      await page.goto("/");
      await page.keyboard.press("Tab");
      const skip = page.locator("a.skip-link");
      await expect(skip).toBeFocused();
      await page.keyboard.press("Enter");
      await expect(page.locator("#main-content")).toBeFocused();
    });
  }
});
