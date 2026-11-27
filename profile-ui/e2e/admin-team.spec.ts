import { test, expect } from "./fixtures";
import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { OWNER_PERMS, stubAuth0 } from "./admin-helpers";

const TOKEN = "k".repeat(43);

async function stubAdminApi(page: Page, role: "owner" | "editor") {
  await page.route(
    (url) => url.pathname.startsWith("/api/"),
    async (route) => {
      const req = route.request();
      const { pathname } = new URL(req.url());
      const method = req.method();
      if (pathname === "/api/admin/me")
        return route.fulfill({
          json:
            role === "owner"
              ? { role, canPublish: true, permissions: OWNER_PERMS }
              : {
                  role,
                  canPublish: false,
                  permissions: ["content.edit", "insights.read"],
                },
        });
      if (pathname === "/api/admin/team" && method === "GET")
        return route.fulfill({
          json: {
            members: [
              {
                accountId: "o1",
                firstName: "Own",
                lastName: "Er",
                email: "owner@example.com",
                role: "owner",
                canPublish: true,
                since: "2026-01-01T00:00:00Z",
              },
              {
                accountId: "e1",
                firstName: "Ed",
                lastName: "Itor",
                email: "editor@example.com",
                role: "editor",
                canPublish: false,
                since: "2026-02-01T00:00:00Z",
              },
            ],
            invites: [],
          },
        });
      if (pathname === "/api/admin/team/invites" && method === "POST")
        return route.fulfill({
          status: 201,
          json: { id: "i1", token: TOKEN, expiresAt: "2026-12-01T00:00:00Z" },
        });
      if (pathname === "/api/admin/drafts")
        return route.fulfill({ json: [{ id: 1, version: 1, content: {} }] });
      if (pathname === "/api/admin/resume-visitors")
        return route.fulfill({
          json: { items: [], page: 0, size: 25, total: 0 },
        });
      if (pathname === "/api/admin/summary")
        return route.fulfill({ json: { openInquiries: 0 } });
      if (pathname === "/api/health")
        return route.fulfill({ json: { status: "UP" } });
      return route.fulfill({ json: {} });
    },
  );
}

test.describe("admin team console", () => {
  // A registered service worker would bypass page.route on reloads.
  test.use({ serviceWorkers: "block" });

  test("editor sees Home and Content only and is told Team is off limits", async ({
    page,
  }) => {
    await stubAuth0(page);
    await stubAdminApi(page, "editor");
    await page.goto("/admin");
    const nav = page.getByRole("navigation", { name: "Admin" });
    await expect(nav.getByRole("link", { name: "Home" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Team" })).toHaveCount(0);
    await page.goto("/admin/settings/team");
    await expect(page.getByRole("alert")).toContainText(
      "Your role does not include this area.",
    );
  });

  test("legacy admin URLs redirect to their new homes", async ({ page }) => {
    await stubAuth0(page);
    await stubAdminApi(page, "owner");
    for (const [from, to] of [
      ["/admin/team", "/admin/settings/team"],
      ["/admin/audit", "/admin/settings/audit"],
      ["/admin/inquiries", "/admin/inbox"],
    ]) {
      await page.goto(from);
      await expect(page).toHaveURL(new RegExp(`${to}$`));
    }
  });

  test("owner invites an editor and sees the link once; Team passes axe", async ({
    page,
  }) => {
    await stubAuth0(page);
    await stubAdminApi(page, "owner");
    await page.goto("/admin");
    await page
      .getByRole("navigation", { name: "Admin" })
      .getByRole("link", { name: "Team" })
      .click();
    await expect(
      page.getByRole("heading", { name: "Team", level: 1 }),
    ).toBeVisible();
    await expect(page.getByText("editor@example.com")).toBeVisible();

    // Audit the settled page (see quality.spec.ts): wait for finite running animations.
    await page.evaluate(() =>
      Promise.race([
        Promise.all(
          document
            .getAnimations()
            .filter(
              (a) =>
                a.playState === "running" &&
                a.effect?.getComputedTiming().iterations !== Infinity,
            )
            .map((a) => a.finished.catch(() => undefined)),
        ),
        new Promise((resolve) => setTimeout(resolve, 4000)),
      ]),
    );
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(
      results.violations.filter(
        ({ impact }) => impact === "critical" || impact === "serious",
      ),
    ).toEqual([]);

    await page.getByLabel("Email").fill("new.editor@example.com");
    await page.getByRole("button", { name: "Send invite" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByLabel("Invite link")).toHaveValue(
      new RegExp(`/admin/invite#token=${TOKEN}$`),
    );
    await dialog.getByRole("button", { name: "Done" }).click();
    await expect(dialog).toHaveCount(0);
  });
});
