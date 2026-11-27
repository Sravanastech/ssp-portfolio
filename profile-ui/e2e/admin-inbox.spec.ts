import { test, expect } from "./fixtures";
import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { OWNER_PERMS, stubAuth0 } from "./admin-helpers";

const INQUIRY = {
  id: "q1",
  name: "Ada Lovelace",
  email: "ada@example.com",
  phone: "+15550100",
  message: "Could we talk about a project?",
  archived: false,
  created_at: "2026-03-01T10:00:00Z",
  delivery: "sent",
  replied_at: null as string | null,
  reply_count: 0,
};

/** Mocks the admin API for the inbox; `posts` collects reply bodies. */
async function stubInboxApi(page: Page, posts: unknown[], failFirst = false) {
  let replied = false;
  let attempts = 0;
  await page.route(
    (url) => url.pathname.startsWith("/api/"),
    async (route) => {
      const req = route.request();
      const { pathname } = new URL(req.url());
      const method = req.method();
      if (pathname === "/api/admin/me")
        return route.fulfill({
          json: { role: "owner", canPublish: true, permissions: OWNER_PERMS },
        });
      if (pathname === "/api/admin/summary")
        return route.fulfill({ json: { openInquiries: replied ? 0 : 1 } });
      if (pathname === "/api/admin/inquiries" && method === "GET")
        return route.fulfill({
          json: [
            {
              ...INQUIRY,
              replied_at: replied ? "2026-03-02T00:00:00Z" : null,
              reply_count: replied ? 1 : 0,
            },
          ],
        });
      if (pathname === "/api/admin/inquiries/q1/replies") {
        if (method === "GET")
          return route.fulfill({
            json: replied
              ? [
                  {
                    id: "r1",
                    authorName: "Own Er",
                    body: "Happy to talk. Tuesday?",
                    status: "sent",
                    createdAt: "2026-03-02T00:00:00Z",
                  },
                ]
              : [],
          });
        attempts += 1;
        posts.push(req.postDataJSON());
        if (failFirst && attempts === 1)
          return route.fulfill({
            status: 502,
            json: { code: "email_failed" },
          });
        replied = true;
        return route.fulfill({
          status: 201,
          json: { id: "r1", status: "sent", createdAt: "2026-03-02T00:00:00Z" },
        });
      }
      if (pathname === "/api/health")
        return route.fulfill({ json: { status: "UP" } });
      return route.fulfill({ json: {} });
    },
  );
}

test.describe("admin inbox reply", () => {
  // A registered service worker would bypass page.route on reloads.
  test.use({ serviceWorkers: "block" });

  test("owner confirms and sends a reply; it appears in history", async ({
    page,
  }) => {
    const posts: unknown[] = [];
    await stubAuth0(page);
    await stubInboxApi(page, posts);
    await page.goto("/admin/inbox");
    await expect(
      page.getByRole("heading", { name: "Inbox", level: 1 }),
    ).toBeVisible();
    await page.getByRole("button", { name: /Ada Lovelace/ }).click();
    await expect(
      page.getByRole("link", { name: "ada@example.com" }),
    ).toHaveAttribute("href", "mailto:ada@example.com");
    await page.getByLabel("Your reply").fill("Happy to talk. Tuesday?");
    await page.getByRole("button", { name: "Send reply" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toContainText("ada@example.com");
    await dialog.getByRole("button", { name: "Send email" }).click();
    await expect(page.getByText("Happy to talk. Tuesday?")).toBeVisible();
    expect(posts).toEqual([{ body: "Happy to talk. Tuesday?" }]);
    await expect(page.getByLabel("Your reply")).toHaveValue("");
    // Open badge clears once the summary refetches after the reply.
    await expect(
      page.getByRole("navigation", { name: "Admin" }).getByRole("link", {
        name: /Inbox/,
      }),
    ).not.toContainText("1");
  });

  test("a failed send offers Retry and then succeeds", async ({ page }) => {
    const posts: unknown[] = [];
    await stubAuth0(page);
    await stubInboxApi(page, posts, true);
    await page.goto("/admin/inbox");
    await page.getByRole("button", { name: /Ada Lovelace/ }).click();
    await page.getByLabel("Your reply").fill("Second try");
    await page.getByRole("button", { name: "Send reply" }).click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Send email" })
      .click();
    await expect(page.getByRole("alert")).toContainText("could not be sent");
    await page.getByRole("button", { name: "Retry" }).click();
    await expect(page.getByLabel("Your reply")).toHaveValue("");
    expect(posts).toHaveLength(2);
  });

  test("command palette jumps to Inbox with the keyboard", async ({ page }) => {
    await stubAuth0(page);
    await stubInboxApi(page, []);
    await page.goto("/admin");
    await page.getByRole("heading", { name: "Home", level: 1 }).waitFor();
    await page.keyboard.press("Control+K");
    await page
      .getByRole("combobox", { name: "Search admin pages" })
      .fill("inb");
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/admin\/inbox$/);
  });

  for (const [label, size] of [
    ["desktop", { width: 1280, height: 800 }],
    ["375px", { width: 375, height: 700 }],
  ] as const) {
    test(`inbox detail passes axe and has no horizontal scroll at ${label}`, async ({
      page,
    }) => {
      await page.setViewportSize(size);
      await stubAuth0(page);
      await stubInboxApi(page, []);
      await page.goto("/admin/inbox");
      await page.getByRole("button", { name: /Ada Lovelace/ }).click();
      await expect(page.getByLabel("Your reply")).toBeVisible();
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
      const overflow = await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);
    });
  }
});
